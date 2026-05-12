export async function GET() {
  try {
    const res = await fetch(`${process.env.BOSTA_API_BASE_URL}/deliveries`, {
      headers: {
        // Bosta uses plain API key — no "Bearer" prefix
        Authorization: process.env.BOSTA_API_KEY ?? "",
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return Response.json({ status: res.status, data });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to reach Bosta API" });
  }
}
