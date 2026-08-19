import type { DealStatus, LeadStatus } from "@/lib/types/database.types";

// Badge colors for the leads table's "Etapa" column, in the spirit of the
// Monday board's own colored status labels (green = closed/good, orange =
// lost, blue = active, gray = not started yet).
interface StatusStyle {
  label: string;
  className: string;
}

export const LEAD_STATUS_STYLE: Record<LeadStatus, StatusStyle> = {
  novo: { label: "Novo", className: "bg-surface-2 text-secondary" },
  em_atendimento: { label: "Em Atendimento", className: "bg-accent-primary/20 text-accent-light" },
  follow_up: { label: "Follow Up", className: "bg-status-warning/20 text-status-warning" },
  reuniao_agendada: { label: "Reunião Agendada", className: "bg-funnel-2/25 text-funnel-1" },
  convertido: { label: "Convertido", className: "bg-status-good/20 text-status-good" },
  perdido: { label: "Perdido", className: "bg-status-serious/20 text-status-serious" },
};

export const DEAL_STATUS_STYLE: Record<DealStatus, StatusStyle> = {
  em_negociacao: { label: "Em Negociação", className: "bg-accent-primary/20 text-accent-light" },
  proposta_enviada: { label: "Proposta Enviada", className: "bg-status-warning/20 text-status-warning" },
  follow_up: { label: "Follow Up", className: "bg-status-warning/20 text-status-warning" },
  fechado: { label: "Fechado", className: "bg-status-good/20 text-status-good" },
  perdido: { label: "Perdido", className: "bg-status-serious/20 text-status-serious" },
};
