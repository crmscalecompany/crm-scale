import type { NextRequest } from "next/server";
import { verifyWebhookToken, WebhookAuthError } from "@/lib/api/webhook-auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api/response";
import { casesLeadSchema } from "@/lib/api/schemas/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLead } from "@/lib/data/leads";
import { notifyLeadGroup } from "@/lib/automation/notify-lead";

// Public endpoint for the institutional site's case-studies email capture.
// Auth is a shared secret (X-Webhook-Token) — see lib/api/webhook-auth.ts.
export async function POST(request: NextRequest) {
  try {
    verifyWebhookToken(request);

    const body = await request.json();
    const parsed = casesLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const db = createAdminClient();
    const lead = await createLead(db, {
      nome: parsed.data.nome || "Lead de Cases",
      email: parsed.data.email,
      origem: "Site — Cases",
      tipo: "Cases",
    });

    await notifyLeadGroup(lead, "Cases");

    return created(lead);
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/webhooks/cases]", err);
    return serverError();
  }
}
