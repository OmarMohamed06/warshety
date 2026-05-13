async function testEndpoint(baseUrl: string, apiKey: string, path: string) {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    const rawText = await res.text();
    if (contentType.includes("application/json")) {
      try {
        return { url, status: res.status, data: JSON.parse(rawText) };
      } catch {
        // fall through
      }
    }
    return { url, status: res.status, contentType, rawResponse: rawText.slice(0, 300) };
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const baseUrl = process.env.BOSTA_API_BASE_URL;
  const apiKey = process.env.BOSTA_API_KEY;

  if (!baseUrl || !apiKey) {
    return Response.json({
      error: "Missing environment variables",
      BOSTA_API_BASE_URL: baseUrl ? "✅ set" : "❌ missing",
      BOSTA_API_KEY: apiKey ? "✅ set" : "❌ missing",
    });
  }

  const [business, pickupLocations, cities] = await Promise.all([
    testEndpoint(baseUrl, apiKey, "/business"),
    testEndpoint(baseUrl, apiKey, "/business/pickup-locations"),
    testEndpoint(baseUrl, apiKey, "/cities?countryId=EG"),
  ]);

  return Response.json({ business, pickupLocations, cities });
}
