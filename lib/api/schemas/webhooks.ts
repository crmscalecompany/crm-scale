import { z } from "zod";

// Blog/news signup — deliberately just an email (plus an optional name the
// form may or may not collect). Kept separate from createLeadSchema
// (lib/api/schemas/leads.ts) because that one requires `nome`, which a
// bare newsletter capture doesn't have.
export const blogLeadSchema = z.object({
  email: z.string().email("email inválido"),
  nome: z.string().min(1).nullish(),
});

export const casesLeadSchema = z.object({
  email: z.string().email("email inválido"),
  nome: z.string().min(1).nullish(),
});

// General contact form (site's "form normal") — mirrors the 5 fields the
// site collects: nome + whatsapp required (a lead with no way to follow up
// on WhatsApp isn't actionable for the SDR team), the rest optional so the
// site form can ask for them without blocking submission.
export const contatoLeadSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  whatsapp: z.string().min(1, "whatsapp é obrigatório"),
  email: z.string().email("email inválido").nullish().or(z.literal("")),
  instagram: z.string().nullish(),
  faturamento_mensal: z.string().nullish(),
});

// LP de inscrição para lives — os 4 campos do form são obrigatórios lá
// (diferente do form de contato, onde só nome/whatsapp são obrigatórios).
// UTMs são opcionais — a LP manda, mas nem todo tráfego chega com eles
// (ex: link direto, WhatsApp).
export const liveLeadSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  whatsapp: z.string().min(1, "whatsapp é obrigatório"),
  email: z.string().email("email inválido"),
  faturamento: z.string().min(1, "faturamento é obrigatório"),
  utm_source: z.string().nullish(),
  utm_medium: z.string().nullish(),
  utm_campaign: z.string().nullish(),
});
