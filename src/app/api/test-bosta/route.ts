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

  const url = `${baseUrl}/deliveries`;

  try {
    const res = await fetch(url, {
      headers: {
        // Bosta uses plain API key — no "Bearer" prefix
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const rawText = await res.text();

    if (contentType.includes("application/json")) {
      try {
        return Response.json({
          status: res.status,
          url,
          data: JSON.parse(rawText),
        });
      } catch {
        // fall through to raw
      }
    }

    // Bosta returned non-JSON (HTML error page, redirect, etc.)
    return Response.json({
      status: res.status,
      url,
      contentType,
      rawResponse: rawText.slice(0, 500),
    });
  } catch (err) {
    return Response.json({
      error: "Fetch failed",
      url,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
