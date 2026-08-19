import type { NextRequest } from "next/server";
import { verifyWebhookToken, WebhookAuthError } from "@/lib/api/webhook-auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api/response";
import { contatoLeadSchema } from "@/lib/api/schemas/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLead } from "@/lib/data/leads";
import { notifyLeadGroup } from "@/lib/automation/notify-lead";

// Public endpoint for the institutional site's general contact form (every
// other lead source that isn't blog or cases). Auth is a shared secret
// (X-Webhook-Token) — see lib/api/webhook-auth.ts.
export async function POST(request: NextRequest) {
  try {
    verifyWebhookToken(request);

    const body = await request.json();
    const parsed = contatoLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const db = createAdminClient();
    const lead = await createLead(db, {
      nome: parsed.data.nome,
      // "WhatsApp" fills both columns, same as the internal create-lead
      // modal (components/kanban/create-lead-modal.tsx) — telefone and
      // whatsapp_txt are kept in sync rather than picking just one.
      telefone: parsed.data.whatsapp,
      whatsapp_txt: parsed.data.whatsapp,
      email: parsed.data.email || null,
      insta: parsed.data.instagram,
      faturamento_medio_label: parsed.data.faturamento_mensal,
      origem: "Site — Contato",
      tipo: "Formulário",
    });

    await notifyLeadGroup(lead, "Formulário de Contato");

    return created(lead);
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/webhooks/contato]", err);
    return serverError();
  }
}
