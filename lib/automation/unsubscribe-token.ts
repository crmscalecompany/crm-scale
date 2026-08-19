import "server-only";
import crypto from "node:crypto";

// Dedicated secret (not CRM_API_TOKEN/WEBHOOK_SITE_TOKEN) — same
// least-privilege reasoning as lib/api/webhook-auth.ts: this token can only
// ever prove "I own this email address for unsubscribe purposes", so it
// gets its own narrow secret instead of reusing one with broader reach.
function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET não configurado.");
  return secret;
}

function payload(tipo: string, email: string): string {
  return `${tipo}:${email.trim().toLowerCase()}`;
}

export function signUnsubscribeToken(tipo: string, email: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload(tipo, email)).digest("hex");
}

// Constant-time compare — an unsubscribe token doesn't guard anything as
// sensitive as a login, but there's no reason to leak timing information
// either.
export function verifyUnsubscribeToken(tipo: string, email: string, token: string): boolean {
  const expected = Buffer.from(signUnsubscribeToken(tipo, email), "hex");
  const provided = Buffer.from(token, "hex");
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
