import { z } from "zod";

export const leadStatusSchema = z.enum(["novo", "em_atendimento", "follow_up", "reuniao_agendada", "convertido", "perdido"]);

export const createLeadSchema = z.object({
  nome: z.string().min(1, "nome é obrigatório"),
  empresa: z.string().nullish(),
  cargo: z.string().nullish(),
  telefone: z.string().nullish(),
  whatsapp_txt: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  insta: z.string().nullish(),
  niche_id: z.string().uuid().nullish(),
  origem: z.string().nullish(),
  direcao: z.string().nullish(),
  tipo: z.string().nullish(),
  faturamento_medio: z.number().nullish(),
  faturamento_medio_label: z.string().nullish(),
  qualificador: z.string().nullish(),
  observacao: z.string().nullish(),
  owner_sdr_id: z.string().uuid().nullish(),
  status: leadStatusSchema.optional(),
  motivo_perda_id: z.string().uuid().nullish(),
  criado_em: z.string().nullish(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  niche_id: z.string().uuid().optional(),
  owner_sdr_id: z.string().uuid().optional(),
  direcao: z.string().optional(),
  updated_since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
