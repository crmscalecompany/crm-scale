"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/users";
import { listSubscribers } from "@/lib/data/subscribers";
import { sendBatchEmails } from "@/lib/adapters/resend";
import { signUnsubscribeToken } from "@/lib/automation/unsubscribe-token";
import { renderNovoConteudoEmail } from "@/lib/email-templates/novo-conteudo";

export interface NotifySubscribersInput {
  tipo: "Cases" | "Newsletter";
  titulo: string;
  resumo: string;
  url: string;
}

// "Avisar inscritos" — manual trigger only (no auto-publish hook, whoever
// publishes the case/article clicks this by hand). Admin-only: RLS on
// `leads` already lets an admin session see every row (see
// public.owns_lead() in the helper-functions migration), but RLS can't gate
// the *sending* itself — that's an external side effect, not a DB row — so
// the role check happens explicitly here instead.
export async function notifySubscribersAction(input: NotifySubscribersInput): Promise<{ sent: number }> {
  const db = await createClient();
  const profile = await getCurrentUserProfile(db);
  if (profile?.papel !== "admin") throw new Error("Apenas administradores podem enviar essa notificação.");

  const subscribers = await listSubscribers(db, input.tipo);
  if (subscribers.length === 0) return { sent: 0 };

  const baseUrl = process.env.CRM_PUBLIC_URL ?? "https://crm.scalecompany.com.br";

  const items = subscribers.map((sub) => {
    const token = signUnsubscribeToken(input.tipo, sub.email);
    const unsubscribeUrl = `${baseUrl}/unsubscribe?tipo=${encodeURIComponent(input.tipo)}&email=${encodeURIComponent(sub.email)}&token=${token}`;
    const { subject, html } = renderNovoConteudoEmail({
      tipo: input.tipo,
      titulo: input.titulo,
      resumo: input.resumo,
      url: input.url,
      unsubscribeUrl,
    });
    return { to: sub.email, subject, html };
  });

  await sendBatchEmails(items);
  return { sent: items.length };
}
