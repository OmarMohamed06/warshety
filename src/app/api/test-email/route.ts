import { Resend } from "resend";

export async function GET() {
  console.log("API route HIT");
  console.log("RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
  console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from: "Warshety <noreply@warshety.com>",
      to: "omar.mohamed.refaat@gmail.com",
      subject: "TEST FROM PROD",
      html: "<p>It works</p>",
    });

    console.log("SUCCESS:", data);
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("ERROR:", error);
    return Response.json({ success: false, error });
  }
}
