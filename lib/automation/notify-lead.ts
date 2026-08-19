import "server-only";
import { getWhatsappAdapter } from "@/lib/adapters/whatsapp";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

// Direct, synchronous notification — deliberately bypasses the
// automation_rules/automation_logs "log and defer" engine (lib/automation/
// events.ts), which has no worker draining it yet. The site webhooks need
// the WhatsApp ping to happen in the same request that creates the lead, not
// whenever a future worker gets built.
//
// Failure here must never fail the request: the lead is already saved by
// the time this runs, so a WhatsApp/Z-API hiccup should only be logged.
export async function notifyLeadGroup(lead: Lead, sourceLabel: string): Promise<void> {
  const groupId = process.env.ZAPI_LEADS_GROUP_ID;
  if (!groupId) {
    console.warn("[notifyLeadGroup] ZAPI_LEADS_GROUP_ID não configurado — notificação pulada.");
    return;
  }

  const lines = [
    `🔔 *Novo lead — ${sourceLabel}*`,
    lead.nome ? `Nome: ${lead.nome}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.telefone ? `WhatsApp: ${lead.telefone}` : null,
    lead.insta ? `Instagram: ${lead.insta}` : null,
    lead.faturamento_medio_label ? `Faturamento: ${lead.faturamento_medio_label}` : null,
    lead.empresa ? `Empresa: ${lead.empresa}` : null,
  ].filter((line): line is string => line !== null);

  try {
    await getWhatsappAdapter().sendMessage({ to: groupId, text: lines.join("\n") });
  } catch (err) {
    console.error(`[notifyLeadGroup] falha ao notificar lead ${lead.id} no WhatsApp`, err);
  }
}
