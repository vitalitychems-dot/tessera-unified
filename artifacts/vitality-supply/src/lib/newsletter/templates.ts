export type WelcomeTemplateSubscriber = {
  email: string;
  name?: string | null;
  unsubscribeToken: string;
};

export type ConfirmationTemplateSubscriber = {
  email: string;
  name?: string | null;
  confirmationToken: string;
};

const SITE_URL = "https://vitalitychems.com";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function welcomeTemplate(subscriber: WelcomeTemplateSubscriber) {
  const greeting = subscriber.name?.trim()
    ? `Welcome, ${escapeHtml(subscriber.name.trim())}.`
    : "Welcome to the laboratory list.";
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
  return {
    subject: "Welcome to Vitality Chems — your 10% code",
    html: `<!doctype html><html><body style="margin:0;background:#08050f;color:#f5f1ff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 24px"><div style="border:1px solid #39285a;background:#120b20;border-radius:14px;padding:32px"><p style="color:#a78bfa;text-transform:uppercase;letter-spacing:2px;font-size:12px">Vitality Chems</p><h1 style="font-size:28px;margin:16px 0">${greeting}</h1><p style="color:#c4b5d4;line-height:1.6">Use this code for 10% off your first laboratory order:</p><div style="font-size:28px;font-weight:bold;letter-spacing:3px;color:#c4b5fd;margin:24px 0">WELCOME10</div><a href="${SITE_URL}" style="display:inline-block;background:#8b5cf6;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Browse research materials</a><p style="color:#8f819f;font-size:12px;line-height:1.6;margin-top:32px">For research use only. Not for human or animal consumption.</p><p style="font-size:11px"><a href="${unsubscribeUrl}" style="color:#a78bfa">Unsubscribe</a></p></div></div></body></html>`,
    text: `${subscriber.name?.trim() ? `Welcome, ${subscriber.name.trim()}.` : "Welcome to the laboratory list."}\n\nYour 10% code is WELCOME10.\n\nBrowse research materials: ${SITE_URL}\n\nFor research use only. Not for human or animal consumption.\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

export function confirmationTemplate(subscriber: ConfirmationTemplateSubscriber) {
  const greeting = subscriber.name?.trim()
    ? `Hi ${escapeHtml(subscriber.name.trim())},`
    : "Hello,";
  const confirmationUrl = `${SITE_URL}/unsubscribe?confirm=${encodeURIComponent(subscriber.confirmationToken)}`;
  return {
    subject: "Confirm your Vitality Chems subscription",
    html: `<!doctype html><html><body style="margin:0;background:#08050f;color:#f5f1ff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 24px"><div style="border:1px solid #39285a;background:#120b20;border-radius:14px;padding:32px"><p style="color:#a78bfa;text-transform:uppercase;letter-spacing:2px;font-size:12px">Vitality Chems</p><h1 style="font-size:28px;margin:16px 0">${greeting}</h1><p style="color:#c4b5d4;line-height:1.6">Please confirm your laboratory newsletter subscription to receive research updates and your WELCOME10 code.</p><a href="${confirmationUrl}" style="display:inline-block;background:#8b5cf6;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Confirm subscription</a><p style="color:#8f819f;font-size:12px;line-height:1.6;margin-top:32px">If you did not request this, no action is needed.</p></div></div></body></html>`,
    text: `${greeting}\n\nConfirm your Vitality Chems laboratory newsletter subscription: ${confirmationUrl}\n\nIf you did not request this, no action is needed.`,
  };
}

export function broadcastTemplate(subject: string, body: string, unsubscribeToken: string) {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const safeBody = escapeHtml(body).replaceAll("\n", "<br>");
  return {
    html: `<!doctype html><html><body style="margin:0;background:#08050f;color:#f5f1ff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 24px"><div style="border:1px solid #39285a;background:#120b20;border-radius:14px;padding:32px"><p style="color:#a78bfa;text-transform:uppercase;letter-spacing:2px;font-size:12px">Vitality Chems</p><h1 style="font-size:26px">${escapeHtml(subject)}</h1><div style="color:#d8cee4;line-height:1.7">${safeBody}</div><p style="color:#8f819f;font-size:12px;margin-top:32px">For research use only. Not for human or animal consumption.</p><p style="font-size:11px"><a href="${unsubscribeUrl}" style="color:#a78bfa">Unsubscribe</a></p></div></div></body></html>`,
    text: `${body}\n\nFor research use only. Not for human or animal consumption.\nUnsubscribe: ${unsubscribeUrl}`,
  };
}