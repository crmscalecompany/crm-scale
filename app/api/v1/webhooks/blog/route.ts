import type { NextRequest } from "next/server";
import { verifyWebhookToken, WebhookAuthError } from "@/lib/api/webhook-auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api/response";
import { blogLeadSchema } from "@/lib/api/schemas/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLead } from "@/lib/data/leads";
import { notifyLeadGroup } from "@/lib/automation/notify-lead";

// Public endpoint for the institutional site's blog/news email capture.
// Auth is a shared secret (X-Webhook-Token), not resolveApiAuth's bearer —
// see lib/api/webhook-auth.ts for why this gets its own narrower token.
export async function POST(request: NextRequest) {
  try {
    verifyWebhookToken(request);

    const body = await request.json();
    const parsed = blogLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const db = createAdminClient();
    const lead = await createLead(db, {
      nome: parsed.data.nome || "Lead do Blog",
      email: parsed.data.email,
      origem: "Site — Blog",
      tipo: "Newsletter",
    });

    await notifyLeadGroup(lead, "Blog/Notícias");

    return created(lead);
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/webhooks/blog]", err);
    return serverError();
  }
}
