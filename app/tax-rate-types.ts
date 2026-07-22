export type TaxAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type TaxRateLookupRequest = {
  id: string;
  address: TaxAddress;
  stateBaseRate: number;
};

export type TaxRateLookup = {
  id: string;
  address: TaxAddress;
  stateRate: number;
  localRate: number;
  totalRate: number;
  jurisdiction: string;
  sourceId: "cdtfa" | "avalara";
  sourceName: string;
  sourceUrl: string;
  confidence?: string;
  effectiveDate: string | null;
};

export type TaxSourceStatus = {
  id: "cdtfa" | "avalara" | "sst";
  name: string;
  url: string;
  status: "connected" | "not_configured" | "reference" | "unavailable";
  detail: string;
};

export type TaxRateLookupResponse = {
  checkedAt: string;
  lookups: TaxRateLookup[];
  sources: TaxSourceStatus[];
  notices: string[];
};
