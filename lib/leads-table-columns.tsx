import { DEAL_STATUS_STYLE, LEAD_STATUS_STYLE } from "@/lib/status-colors";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/lib/format";
import { PersonInline } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Deal = Database["public"]["Tables"]["deals"]["Row"];

/** Minimal person shape needed to render an avatar + name — a subset of the
 * full `users` row, threaded through wherever a person is displayed. */
export interface PersonRef {
  nome: string;
  foto_url: string | null;
}

export interface ColumnContext {
  sdrById: Map<string, PersonRef>;
  nicheById: Map<string, string>;
  closerById: Map<string, PersonRef>;
  dealByLeadId: Map<string, Deal>;
}

export interface ColumnDef {
  key: string;
  label: string;
  /** Always shown, not offered in the column picker (identifies the row / carries the merged Etapa). */
  required?: boolean;
}

// Which columns are inline-editable in the table (components/leads/
// editable-cell.tsx), and how. Deliberately excludes: `nome` (its cell is
// still the "open the full detail panel" click target — see
// leads-table.tsx), `etapa` (moving to "perdido" requires a reason via
// mark-lost-modal.tsx; a bare inline select would bypass that), everything
// deal-derived (closer/valor/datas/modelo/janela_fechamento — a different
// entity, edited from the Negócios side), and `criado_em` (a historical
// business date, not something to fat-finger from a table cell).
export type ColumnEditKind = "text" | "number" | "niche_select" | "sdr_select" | "combobox";

export interface ColumnEditDef {
  kind: ColumnEditKind;
  /** The `leads` column this cell writes to — for "faturamento_medio" this
   * is deliberately the *_label text field, not the numeric one: the cell
   * displays the label preferentially (see renderColumnCell below), and in
   * practice almost every lead has the label, not the number. */
  field: keyof Lead;
}

export const COLUMN_EDIT: Partial<Record<string, ColumnEditDef>> = {
  empresa: { kind: "text", field: "empresa" },
  cargo: { kind: "text", field: "cargo" },
  whatsapp: { kind: "text", field: "whatsapp_txt" },
  telefone: { kind: "text", field: "telefone" },
  email: { kind: "text", field: "email" },
  insta: { kind: "text", field: "insta" },
  qualificador: { kind: "text", field: "qualificador" },
  observacao: { kind: "text", field: "observacao" },
  faturamento_medio: { kind: "text", field: "faturamento_medio_label" },
  nicho: { kind: "niche_select", field: "niche_id" },
  sdr: { kind: "sdr_select", field: "owner_sdr_id" },
  origem: { kind: "combobox", field: "origem" },
  direcao: { kind: "combobox", field: "direcao" },
  tipo: { kind: "combobox", field: "tipo" },
};

// The full set of fields from the original 35-column Monday export that
// make sense as a table column (raw_monday, ids, fbclid/lead_id_ads/
// campanha/publico/criativo stay detail-panel-only — marketing attribution
// fields, rarely scanned row-by-row). Order here is also the picker's
// display order.
export const ALL_COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Lead", required: true },
  { key: "etapa", label: "Etapa", required: true },
  { key: "sdr", label: "SDR" },
  { key: "empresa", label: "Empresa" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "cargo", label: "Cargo" },
  { key: "insta", label: "Instagram" },
  { key: "nicho", label: "Nicho" },
  { key: "origem", label: "Origem" },
  { key: "direcao", label: "Direção" },
  { key: "tipo", label: "Tipo" },
  { key: "qualificador", label: "Qualificador" },
  { key: "faturamento_medio", label: "Faturamento Médio" },
  { key: "criado_em", label: "Data de Entrada" },
  { key: "closer", label: "Closer" },
  { key: "valor", label: "Valor" },
  { key: "data_agendamento", label: "Data de Agendamento" },
  { key: "data_fechamento", label: "Data de Fechamento" },
  { key: "modelo", label: "Modelo" },
  { key: "janela_fechamento", label: "Janela de Fechamento" },
  { key: "observacao", label: "Observação" },
];

// Picked with the user: Contato (WhatsApp/E-mail) + Negócio (Closer/Valor/
// Data de Fechamento) added to the original Monday-mirroring set.
export const DEFAULT_VISIBLE_COLUMNS = [
  "nome",
  "sdr",
  "empresa",
  "whatsapp",
  "email",
  "nicho",
  "closer",
  "valor",
  "data_fechamento",
  "observacao",
  "etapa",
];

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs", className)}>{children}</span>;
}

function Dash() {
  return <span className="text-xs text-muted">—</span>;
}

export function renderColumnCell(key: string, lead: Lead, ctx: ColumnContext): React.ReactNode {
  const deal = ctx.dealByLeadId.get(lead.id);

  switch (key) {
    case "nome":
      return lead.nome;
    case "sdr": {
      const sdr = lead.owner_sdr_id ? ctx.sdrById.get(lead.owner_sdr_id) : undefined;
      return sdr ? <PersonInline name={sdr.nome} src={sdr.foto_url} /> : <Dash />;
    }
    case "empresa":
      return lead.empresa || "—";
    case "whatsapp":
      return lead.whatsapp_txt || "—";
    case "email":
      return lead.email || "—";
    case "telefone":
      return lead.telefone || "—";
    case "cargo":
      return lead.cargo || "—";
    case "insta":
      return lead.insta || "—";
    case "nicho":
      return lead.niche_id ? (
        <Badge className="bg-surface-2 text-secondary">{ctx.nicheById.get(lead.niche_id) ?? "—"}</Badge>
      ) : (
        <Dash />
      );
    case "origem":
      return lead.origem || "—";
    case "direcao":
      return lead.direcao || "—";
    case "tipo":
      return lead.tipo || "—";
    case "qualificador":
      return lead.qualificador || "—";
    case "faturamento_medio":
      return lead.faturamento_medio_label || (lead.faturamento_medio != null ? formatBRL(lead.faturamento_medio) : null) || "—";
    case "criado_em":
      return formatDateTimeBR(lead.criado_em) || "—";
    case "closer": {
      const closer = deal?.closer_id ? ctx.closerById.get(deal.closer_id) : undefined;
      return closer ? <PersonInline name={closer.nome} src={closer.foto_url} /> : "—";
    }
    case "valor":
      return (deal ? formatBRL(deal.valor_bruto) : null) || "—";
    case "data_agendamento":
      return (deal ? formatDateBR(deal.data_agendamento) : null) || "—";
    case "data_fechamento":
      return (deal ? formatDateBR(deal.data_fechamento) : null) || "—";
    case "modelo":
      return deal?.modelo || "—";
    case "janela_fechamento":
      return deal?.janela_fechamento || "—";
    case "observacao":
      return lead.observacao || "—";
    case "etapa": {
      const style = deal ? DEAL_STATUS_STYLE[deal.status] : LEAD_STATUS_STYLE[lead.status];
      return <Badge className={cn("whitespace-nowrap px-2.5 py-1 font-semibold", style.className)}>{style.label}</Badge>;
    }
    default:
      return "—";
  }
}
