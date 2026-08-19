import "server-only";
import nodemailer from "nodemailer";

// Gmail SMTP + App Password — sends from whichever inbox GMAIL_USER names
// (.env.local) so replies land there naturally, rather than a third-party
// transactional service's technical sender. Needs 2-step verification
// enabled on that Google account and an App Password generated at
// myaccount.google.com/apppasswords (a regular account password won't work
// with SMTP once 2FA is on). Display name is always "José Matheus"
// regardless of the underlying account or which SDR triggers the send.
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mail não pode ser enviado.");

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Embedded images (e.g. a logo) referenced in `html` via `cid:<cid>` —
   * more reliable across email clients than base64 data URIs, which some
   * (notably Outlook desktop) strip. */
  attachments?: { filename: string; path: string; cid: string }[];
}): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER!;
  await transporter.sendMail({
    from: `José Matheus <${from}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });
}
