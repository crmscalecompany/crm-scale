import { z } from "zod";

export const dealStatusSchema = z.enum(["em_negociacao", "proposta_enviada", "follow_up", "fechado", "perdido"]);

export const createDealSchema = z.object({
  lead_id: z.string().uuid("lead_id é obrigatório"),
  closer_id: z.string().uuid().nullish(),
  status: dealStatusSchema.optional(),
  valor_bruto: z.number().nullish(),
  valor_liquido: z.number().nullish(),
  modelo: z.enum(["TCV", "MRR"]).nullish(),
  janela_fechamento: z.string().nullish(),
  motivo_perda: z.string().uuid().nullish(),
  data_agendamento: z.string().nullish(),
  data_fechamento: z.string().nullish(),
});

export const updateDealSchema = createDealSchema.partial().omit({ lead_id: true });

export const listDealsQuerySchema = z.object({
  status: dealStatusSchema.optional(),
  closer_id: z.string().uuid().optional(),
  data_fechamento_from: z.string().optional(),
  data_fechamento_to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
