import "server-only";
import type { NextRequest } from "next/server";

export class WebhookAuthError extends Error {}

// Separate secret from CRM_API_TOKEN on purpose: CRM_API_TOKEN is the
// service-role, full-admin bearer used by the dashboard itself (see
// lib/api/auth.ts). The institutional site's backend only ever needs to
// "create a lead", so it gets its own narrower-scoped token instead of
// holding the same credential that can read/write everything.
export function verifyWebhookToken(request: NextRequest): void {
  const expected = process.env.WEBHOOK_SITE_TOKEN;
  if (!expected) throw new WebhookAuthError("WEBHOOK_SITE_TOKEN não configurado no servidor.");

  const provided = request.headers.get("x-webhook-token");
  if (provided !== expected) throw new WebhookAuthError("Token inválido.");
}
