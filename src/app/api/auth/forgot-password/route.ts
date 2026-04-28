import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const LOGO_URL =
  "https://ldscfwokohxoxdtyqzzz.supabase.co/storage/v1/object/public/assets/warshety-footer.svg";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Reset Your Password</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f0f2f5; font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
    img { border: 0; display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    .email-bg   { background-color: #f0f2f5; padding: 32px 16px; }
    .email-wrap { max-width: 580px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 16px 16px 0 0;
      padding: 16px 40px;
      text-align: center;
    }
    .card { background: #ffffff; padding: 40px 40px 32px; }
    .card-title { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; line-height: 1.3; }
    .card-subtitle { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.6; }
    .btn-wrap { text-align: center; margin: 32px 0 8px; }
    .btn {
      display: inline-block;
      background: #f97316;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: 10px;
      text-decoration: none;
      letter-spacing: 0.2px;
    }
    .info-row { background: #f8fafc; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
    .info-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
    .info-value { font-size: 13px; font-weight: 500; color: #475569; word-break: break-all; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 28px 0; }
    .note { font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center; }
    .footer { background: #1e293b; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; }
    .footer a { color: #f97316; }
    @media (max-width: 600px) {
      .header, .card, .footer { padding-left: 24px; padding-right: 24px; }
      .card-title { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="email-bg">
    <div class="email-wrap">

      <div class="header">
        <img src="${LOGO_URL}" alt="Warshety" height="64" style="margin:0 auto;"/>
      </div>

      <div class="card">
        <p class="card-title">Reset Your Password</p>
        <p class="card-subtitle">
          We received a request to reset the password for your Warshety account.
          Click the button below to choose a new password.
          This link expires in <strong>1 hour</strong>.
        </p>

        <div class="btn-wrap">
          <a href="${resetUrl}" class="btn">Reset My Password</a>
        </div>

        <hr class="divider"/>

        <div class="info-row">
          <p class="info-label">Or copy this link into your browser</p>
          <p class="info-value">${resetUrl}</p>
        </div>

        <hr class="divider"/>

        <p class="note">
          If you didn't request a password reset, you can safely ignore this email.<br/>
          Your password will not change unless you click the link above.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Warshety &nbsp;·&nbsp; <a href="https://warshety.com">warshety.com</a></p>
        <p style="margin-top:6px;">You received this because a password reset was requested for your account.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://warshety.com";
    const redirectTo = `${origin}/en/auth/reset-password`;

    // Generate reset link via Supabase admin
    const supabase = getServiceClient();
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError || !data?.properties?.action_link) {
      console.error("[forgot-password] generateLink error:", linkError);
      // Return success anyway to avoid email enumeration
      return NextResponse.json({ ok: true });
    }

    const resetUrl = data.properties.action_link;

    // Send branded email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = process.env.RESEND_FROM_NAME ?? "Warshety";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@warshety.com";

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: "Reset Your Warshety Password",
      html: buildResetEmail(resetUrl),
      text: `Reset your Warshety password by visiting this link:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a reset, ignore this email.`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
