import { amazonPreviewFromHtml, normalizePreviewAsin } from "../../asin-preview";

const cacheHeaders = {
  "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const asin = normalizePreviewAsin(new URL(request.url).searchParams.get("asin"));
  if (!asin) return Response.json({ error: "A valid ASIN is required." }, { status: 400, headers: cacheHeaders });
  try {
    const amazonResponse = await fetch(`https://www.amazon.com/gp/aw/d/${asin}`, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
      },
    });
    if (!amazonResponse.ok) throw new Error(`Amazon returned ${amazonResponse.status}.`);
    const preview = amazonPreviewFromHtml(await amazonResponse.text(), asin);
    if (!preview) return Response.json({ error: "No product preview is available." }, { status: 404, headers: cacheHeaders });
    return Response.json(preview, { headers: cacheHeaders });
  } catch {
    return Response.json({ error: "The product preview could not be loaded." }, { status: 502, headers: cacheHeaders });
  }
}
