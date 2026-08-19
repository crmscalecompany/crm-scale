import type { DealStatus, LeadStatus } from "@/lib/types/database.types";

// Badge colors for the leads table's "Etapa" column, in the spirit of the
// Monday board's own colored status labels (green = closed/good, orange =
// lost, blue = active, gray = not started yet).
interface StatusStyle {
  label: string;
  className: string;
  /** Left-edge accent stripe per table row (leads-table.tsx) — same
   * semantic color as the badge, but usable at full opacity as a border
   * instead of a translucent fill, so the row's stage reads at a glance
   * without leaning on a glow/neon treatment. */
  accentClassName: string;
}

export const LEAD_STATUS_STYLE: Record<LeadStatus, StatusStyle> = {
  // Solid fill (not the translucent bg-status-good/20 every other badge
  // uses) — "Novo" is the one status that needs SDR action, so it gets the
  // boldest treatment on purpose, per explicit user feedback ("cinza não
  // chama atenção, queria algo tipo verde"). Same green family as
  // "Convertido" below (both are "good news"), but solid vs. soft keeps
  // them visually distinct instead of identical badges.
  novo: { label: "Novo", className: "bg-status-good text-ink-strong", accentClassName: "border-l-status-good" },
  em_atendimento: {
    label: "Em Atendimento",
    className: "bg-accent-primary/20 text-accent-light",
    accentClassName: "border-l-accent-primary",
  },
  follow_up: { label: "Follow Up", className: "bg-status-warning/20 text-status-warning", accentClassName: "border-l-status-warning" },
  reuniao_agendada: {
    label: "Reunião Agendada",
    className: "bg-funnel-2/25 text-funnel-1",
    accentClassName: "border-l-funnel-2",
  },
  convertido: { label: "Convertido", className: "bg-status-good/20 text-status-good", accentClassName: "border-l-status-good" },
  perdido: { label: "Perdido", className: "bg-status-serious/20 text-status-serious", accentClassName: "border-l-status-serious" },
};

export const DEAL_STATUS_STYLE: Record<DealStatus, StatusStyle> = {
  em_negociacao: {
    label: "Em Negociação",
    className: "bg-accent-primary/20 text-accent-light",
    accentClassName: "border-l-accent-primary",
  },
  proposta_enviada: {
    label: "Proposta Enviada",
    className: "bg-status-warning/20 text-status-warning",
    accentClassName: "border-l-status-warning",
  },
  follow_up: { label: "Follow Up", className: "bg-status-warning/20 text-status-warning", accentClassName: "border-l-status-warning" },
  fechado: { label: "Fechado", className: "bg-status-good/20 text-status-good", accentClassName: "border-l-status-good" },
  perdido: { label: "Perdido", className: "bg-status-serious/20 text-status-serious", accentClassName: "border-l-status-serious" },
};
