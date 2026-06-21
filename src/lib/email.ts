// import fetch from "node-fetch";

export async function sendVerificationEmail(
  email: string,
  verifyLink: string,
  siteName: string
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { name: siteName, email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email }],
      subject: `[${siteName}] Verify your email address`,
    htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080C14;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#080C14;background-image:linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px);background-size:60px 60px;padding:40px 24px;">
  <tr><td align="center">
    <table width="384" cellpadding="0" cellspacing="0" style="font-family:'Courier New',Courier,monospace;">
      <tr>
        <td style="text-align:center;padding-bottom:28px;">
          <div style="font-size:13px;letter-spacing:.2em;color:#3B82F6;">${siteName.toUpperCase()}</div>
          <div style="font-size:10px;letter-spacing:.2em;color:#334155;margin-top:4px;">VERIFY YOUR EMAIL ADDRESS</div>
        </td>
      </tr>
      <tr>
        <td style="background:#0D1220;border:1px solid rgba(255,255,255,0.05);padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="border-left:2px solid #3B82F6;padding-left:12px;">
                <div style="font-size:10px;letter-spacing:.2em;color:#3B82F6;">ACTION REQUIRED</div>
                <div style="font-size:10px;color:#334155;margin-top:4px;line-height:1.6;">CONFIRM YOUR EMAIL TO ACTIVATE YOUR ACCOUNT.</div>
              </td>
            </tr>
          </table>
          <div style="margin-bottom:20px;">
            <div style="font-size:10px;letter-spacing:.15em;color:#475569;margin-bottom:6px;">TO</div>
            <div style="font-size:11px;color:#94A3B8;">${email}</div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="background:#111827;border:1px solid rgba(255,255,255,0.05);padding:12px;font-size:10px;color:#334155;line-height:1.8;">
                Hi there,<br><br>
                Click the button below to verify your email address and activate your ${siteName} account.
                This link expires in <span style="color:#3B82F6;">24 hours</span>.
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td align="center">
                <a href="${verifyLink}"
                   style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:10px;background:#3B82F6;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.2em;text-decoration:none;">
                  VERIFY MY EMAIL &rarr;
                </a>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
            <tr>
              <td>
                <div style="font-size:10px;letter-spacing:.1em;color:#334155;margin-bottom:8px;">OR COPY THIS LINK</div>
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.05);padding:8px;">
                  <a href="${verifyLink}" style="font-size:9px;color:#3B82F6;word-break:break-all;text-decoration:none;line-height:1.6;">${verifyLink}</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top:12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:10px;color:#334155;">DIDN'T REQUEST THIS? IGNORE IT.</td>
              <td align="right">
                <span style="font-size:10px;color:#1D4ED8;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);padding:3px 10px;">24H EXPIRY</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  }),
})
if (!response.ok) {
    const err = await response.json();
    throw new Error(`Brevo error: ${JSON.stringify(err)}`);
  }
}