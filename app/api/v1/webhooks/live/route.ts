import type { NextRequest } from "next/server";
import { verifyWebhookToken, WebhookAuthError } from "@/lib/api/webhook-auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api/response";
import { liveLeadSchema } from "@/lib/api/schemas/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLead } from "@/lib/data/leads";
import { createLeadAttribution } from "@/lib/data/lead-attribution";
import { notifyLeadGroup } from "@/lib/automation/notify-lead";
import { sendBatchEmails } from "@/lib/adapters/resend";
import { renderConfirmacaoLiveEmail } from "@/lib/email-templates/confirmacao-live";

// Conteúdo específico desta live — não é config de infra (por isso não é env
// var), é o que muda a cada evento. Atualizar aqui para a próxima live.
const EVENT_LABEL = "Scale Class — Treinamento de Alta Conversão (31/08)";
const EVENT_WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/IUIOhqEDHV5AEpSvrS1Uu7?s=cl&p=i&mlu=4";
const EVENT_DATE_LABEL = "31 de agosto";
const EVENT_TIME_LABEL = "12h";

// Público, para o form da LP de inscrição em lives. Auth é um shared secret
// (X-Webhook-Token) — see lib/api/webhook-auth.ts. Origem fixa ("Site —
// Live") para que toda live futura caia no mesmo "Quadro Live" do CRM
// (components/crm/crm-workspace.tsx) sem precisar de código novo — só o
// conteúdo do email (constantes acima) muda por evento.
export async function POST(request: NextRequest) {
  try {
    verifyWebhookToken(request);

    const body = await request.json();
    const parsed = liveLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const db = createAdminClient();
    const lead = await createLead(db, {
      nome: parsed.data.nome,
      // "WhatsApp" fills both columns, same as the internal create-lead
      // modal and the other site webhooks — telefone and whatsapp_txt are
      // kept in sync rather than picking just one.
      telefone: parsed.data.whatsapp,
      whatsapp_txt: parsed.data.whatsapp,
      email: parsed.data.email,
      faturamento_medio_label: parsed.data.faturamento,
      origem: "Site — Live",
      tipo: "Formulário",
    });

    if (parsed.data.utm_source || parsed.data.utm_medium || parsed.data.utm_campaign) {
      try {
        await createLeadAttribution(db, {
          lead_id: lead.id,
          utm_source: parsed.data.utm_source,
          utm_medium: parsed.data.utm_medium,
          utm_campaign: parsed.data.utm_campaign,
        });
      } catch (err) {
        console.error(`[POST /api/v1/webhooks/live] falha ao salvar atribuição do lead ${lead.id}`, err);
      }
    }

    await notifyLeadGroup(lead, EVENT_LABEL);

    // Best-effort, mesmo padrão de notifyLeadGroup acima — o lead já está
    // salvo nesse ponto, então uma falha no envio do email não deve derrubar
    // a resposta do webhook.
    try {
      const primeiroNome = lead.nome.trim().split(/\s+/)[0] || lead.nome;
      const { subject, html } = renderConfirmacaoLiveEmail({
        primeiroNome,
        whatsappGroupUrl: EVENT_WHATSAPP_GROUP_URL,
        eventDateLabel: EVENT_DATE_LABEL,
        eventTimeLabel: EVENT_TIME_LABEL,
      });
      await sendBatchEmails([{ to: lead.email!, subject, html }]);
    } catch (err) {
      console.error(`[POST /api/v1/webhooks/live] falha ao enviar email de confirmação para o lead ${lead.id}`, err);
    }

    return created(lead);
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/webhooks/live]", err);
    return serverError();
  }
}
