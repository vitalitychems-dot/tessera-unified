import { sendEmail } from "@/lib/newsletter/email.server";

type VerificationEmailUser = {
  email: string;
  name: string;
};

type VerificationEmailData = {
  user: VerificationEmailUser;
  url: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Deliver Better Auth's signed verification URL through the app's Resend
 * sender. `sendEmail` refuses to send while the configured Resend domain is
 * unverified; this function never changes the user's verification state.
 */
export async function sendAuthVerificationEmail({
  user,
  url,
}: VerificationEmailData) {
  const name = user.name.trim();
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  const safeUrl = escapeHtml(url);

  await sendEmail({
    to: user.email,
    subject: "Verify your Vitality Chems email",
    html: `<!doctype html><html><body style="margin:0;background:#08050f;color:#f5f1ff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 24px"><div style="border:1px solid #39285a;background:#120b20;border-radius:14px;padding:32px"><p style="color:#a78bfa;text-transform:uppercase;letter-spacing:2px;font-size:12px">Vitality Chems</p><h1 style="font-size:28px;margin:16px 0">Verify your email</h1><p style="color:#c4b5d4;line-height:1.6">${greeting}</p><p style="color:#c4b5d4;line-height:1.6">Confirm ownership of this address to activate account rewards and referrals.</p><a href="${safeUrl}" style="display:inline-block;background:#8b5cf6;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Verify email address</a><p style="color:#8f819f;font-size:12px;line-height:1.6;margin-top:32px">This link expires in one hour. If you did not create this account, you can ignore this email.</p></div></div></body></html>`,
    text: `${name ? `Hi ${name},` : "Hello,"}\n\nConfirm ownership of this address to activate account rewards and referrals:\n${url}\n\nThis link expires in one hour. If you did not create this account, you can ignore this email.`,
  });
}