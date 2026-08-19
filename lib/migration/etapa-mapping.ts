import type { Database } from "@/lib/types/database.types";

type LeadStatus = Database["public"]["Tables"]["leads"]["Row"]["status"];
type DealStatus = Database["public"]["Tables"]["deals"]["Row"]["status"];

export interface EtapaMapping {
  leadStatus: LeadStatus;
  // Only used when the item actually has a Closer assigned — presence of a
  // Closer value (not the etapa text) is what decides whether a deals row
  // gets created at all (see scripts/migrate-monday.ts). When a deal does
  // get created, this is the status it's given.
  dealStatus?: DealStatus;
}

// Loss reasons are deliberately NOT guessed here — Monday's "Etapa" column
// only tells us THAT something was lost, not why. Setting motivo_perda(_id)
// to a specific lost_reasons row during migration would fabricate data that
// was never actually captured. Lost deals/leads migrate with
// motivo_perda(_id) = NULL; an admin backfills the real reason by hand if
// it matters for historical reporting.
export const ETAPA_MAPPING: Record<string, EtapaMapping> = {
  "Em Aberto": { leadStatus: "novo" },
  "R1 Realizada": { leadStatus: "convertido", dealStatus: "em_negociacao" },
  "R2 Agendado": { leadStatus: "convertido", dealStatus: "em_negociacao" },
  "Follow Up": { leadStatus: "follow_up", dealStatus: "follow_up" },
  "Proposta em Análise": { leadStatus: "convertido", dealStatus: "proposta_enviada" },
  Fechado: { leadStatus: "convertido", dealStatus: "fechado" },
  "Perdido Closer": { leadStatus: "convertido", dealStatus: "perdido" },
  "Contato Futuro": { leadStatus: "follow_up" },
  Desqualificado: { leadStatus: "perdido" },
  "Perdido SDR": { leadStatus: "perdido" },
};

export const DEFAULT_ETAPA_MAPPING: EtapaMapping = { leadStatus: "novo" };
