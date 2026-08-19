import "server-only";

interface BatchEmailItem {
  to: string;
  subject: string;
  html: string;
  /** Display name in the From header (e.g. "José Matheus" for the
   * first-contact email's persona vs "Scale Company" for bulk
   * subscriber notifications). Defaults to "Scale Company". */
  fromName?: string;
}

const RESEND_BATCH_LIMIT = 100;

// Resend's /emails/batch endpoint — each item in the array is its own
// single-recipient send. Deliberately never puts the whole audience in one
// `to` array: that would leak every subscriber's address to every other
// subscriber. Chunked into groups of 100 because that's Resend's cap per
// batch call.
export async function sendBatchEmails(items: BatchEmailItem[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurado.");

  // Falls back to Resend's shared test sender until scalecompany.com.br is
  // verified under Resend > Domains — real sends work today, just from a
  // resend.dev address instead of an @scalecompany.com.br one.
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  for (let i = 0; i < items.length; i += RESEND_BATCH_LIMIT) {
    const chunk = items.slice(i, i + RESEND_BATCH_LIMIT);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        chunk.map((item) => ({
          from: `${item.fromName ?? "Scale Company"} <${from}>`,
          to: [item.to],
          subject: item.subject,
          html: item.html,
        }))
      ),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[ResendAdapter] batch send failed (${res.status}): ${body}`);
    }
  }
}
