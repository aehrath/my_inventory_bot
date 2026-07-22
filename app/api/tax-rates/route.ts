import { env } from "cloudflare:workers";
import type {
  TaxAddress,
  TaxRateLookup,
  TaxRateLookupRequest,
  TaxRateLookupResponse,
  TaxSourceStatus,
} from "../../tax-rate-types";

const CDTFA_URL = "https://services.maps.cdtfa.ca.gov/";
const SST_URL = "https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files";
const AVALARA_URL = "https://developer.avalara.com/api-reference/avatax/rest/v2/methods/TaxContent/TaxRatesByAddress/";

type CdtfaResponse = {
  taxRateInfo?: Array<{ rate?: number; jurisdiction?: string; city?: string; county?: string }>;
  geocodeInfo?: { confidence?: string; formattedAddress?: string };
  errors?: Array<{ message?: string }>;
};

type AvalaraRate = { rate?: number; name?: string; type?: string };
type AvalaraResponse = { totalRate?: number; rates?: AvalaraRate[]; address?: string };

const isCompleteAddress = (address: TaxAddress) => Boolean(
  address?.line1?.trim()
  && address?.city?.trim()
  && /^[A-Z]{2}$/.test(address?.state ?? "")
  && /^\d{5}(?:-\d{4})?$/.test(address?.postalCode?.trim() ?? ""),
);

const toPercent = (rate: number) => Math.round(rate * 100_000) / 1_000;
const roundRate = (rate: number) => Math.round(rate * 1_000) / 1_000;

async function lookupCalifornia(request: TaxRateLookupRequest): Promise<TaxRateLookup> {
  const params = new URLSearchParams({
    address: request.address.line1.trim(),
    city: request.address.city.trim(),
    zip: request.address.postalCode.trim().slice(0, 5),
  });
  const response = await fetch(`https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByAddress?${params}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as CdtfaResponse;
  if (!response.ok || !payload.taxRateInfo?.length) {
    throw new Error(payload.errors?.[0]?.message || `CDTFA returned ${response.status}.`);
  }
  if (payload.taxRateInfo.length > 1) {
    throw new Error("The address is near a tax boundary. Confirm the exact jurisdiction with CDTFA.");
  }
  const match = payload.taxRateInfo[0];
  const totalRate = toPercent(Number(match.rate ?? 0));
  const stateRate = roundRate(request.stateBaseRate);
  return {
    id: request.id,
    address: request.address,
    stateRate,
    localRate: roundRate(Math.max(0, totalRate - stateRate)),
    totalRate,
    jurisdiction: match.jurisdiction || match.city || match.county || "California",
    sourceId: "cdtfa",
    sourceName: "California CDTFA",
    sourceUrl: CDTFA_URL,
    confidence: payload.geocodeInfo?.confidence,
    effectiveDate: null,
  };
}

async function lookupAvalara(request: TaxRateLookupRequest): Promise<TaxRateLookup> {
  const accountId = String(env.AVALARA_ACCOUNT_ID ?? "").trim();
  const licenseKey = String(env.AVALARA_LICENSE_KEY ?? "").trim();
  const sandbox = String(env.AVALARA_ENVIRONMENT ?? "production").toLowerCase() === "sandbox";
  const baseUrl = sandbox ? "https://sandbox-rest.avatax.com" : "https://rest.avatax.com";
  const params = new URLSearchParams({
    line1: request.address.line1.trim(),
    city: request.address.city.trim(),
    region: request.address.state,
    postalCode: request.address.postalCode.trim(),
    country: "US",
  });
  const response = await fetch(`${baseUrl}/api/v2/taxrates/byaddress?${params}`, {
    headers: {
      accept: "application/json",
      authorization: `Basic ${btoa(`${accountId}:${licenseKey}`)}`,
    },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as AvalaraResponse;
  if (!response.ok || typeof payload.totalRate !== "number") {
    throw new Error(`Avalara returned ${response.status}.`);
  }
  const rates = Array.isArray(payload.rates) ? payload.rates : [];
  const stateRateDecimal = rates
    .filter((rate) => rate.type?.toLowerCase() === "state")
    .reduce((total, rate) => total + Number(rate.rate ?? 0), 0);
  const stateRate = stateRateDecimal > 0 ? toPercent(stateRateDecimal) : roundRate(request.stateBaseRate);
  const totalRate = toPercent(payload.totalRate);
  const localNames = rates
    .filter((rate) => rate.type?.toLowerCase() !== "state" && Number(rate.rate ?? 0) > 0)
    .map((rate) => rate.name)
    .filter(Boolean);
  return {
    id: request.id,
    address: request.address,
    stateRate,
    localRate: roundRate(Math.max(0, totalRate - stateRate)),
    totalRate,
    jurisdiction: localNames.join(" + ") || `${request.address.city}, ${request.address.state}`,
    sourceId: "avalara",
    sourceName: "Avalara AvaTax",
    sourceUrl: AVALARA_URL,
    effectiveDate: null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { addresses?: TaxRateLookupRequest[] };
    const addresses = Array.isArray(body.addresses) ? body.addresses.slice(0, 50) : [];
    const accountId = String(env.AVALARA_ACCOUNT_ID ?? "").trim();
    const licenseKey = String(env.AVALARA_LICENSE_KEY ?? "").trim();
    const avalaraConfigured = Boolean(accountId && licenseKey);
    const lookups: TaxRateLookup[] = [];
    const notices: string[] = [];
    let cdtfaAttempted = false;
    let cdtfaConnected = false;
    let avalaraAttempted = false;
    let avalaraConnected = false;

    for (const item of addresses) {
      if (!item?.id || !isCompleteAddress(item.address)) {
        notices.push(`${item?.address?.city || "An address"}, ${item?.address?.state || "unknown state"}: complete street, city, state, and ZIP before checking.`);
        continue;
      }
      try {
        if (item.address.state === "CA") {
          cdtfaAttempted = true;
          lookups.push(await lookupCalifornia(item));
          cdtfaConnected = true;
        } else if (avalaraConfigured) {
          avalaraAttempted = true;
          lookups.push(await lookupAvalara(item));
          avalaraConnected = true;
        } else {
          notices.push(`${item.address.city}, ${item.address.state}: connect Avalara for automated address-level updates outside California.`);
        }
      } catch (error) {
        notices.push(`${item.address.city}, ${item.address.state}: ${error instanceof Error ? error.message : "rate lookup failed"}`);
      }
    }

    const sources: TaxSourceStatus[] = [
      {
        id: "cdtfa",
        name: "California CDTFA",
        url: CDTFA_URL,
        status: cdtfaAttempted ? (cdtfaConnected ? "connected" : "unavailable") : "reference",
        detail: cdtfaAttempted ? (cdtfaConnected ? "Official California address rates checked." : "The official California service could not be reached.") : "Available when a California address is checked.",
      },
      {
        id: "avalara",
        name: "Avalara AvaTax",
        url: AVALARA_URL,
        status: avalaraConfigured ? (avalaraAttempted ? (avalaraConnected ? "connected" : "unavailable") : "connected") : "not_configured",
        detail: avalaraConfigured ? "Configured for nationwide address lookups." : "Optional credentials are needed for automated lookups outside California.",
      },
      {
        id: "sst",
        name: "Streamlined Sales Tax",
        url: SST_URL,
        status: "reference",
        detail: "Official quarterly rate and boundary files for participating states.",
      },
    ];
    const payload: TaxRateLookupResponse = { checkedAt: new Date().toISOString(), lookups, sources, notices };
    return Response.json(payload);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not check tax-rate sources." }, { status: 400 });
  }
}
