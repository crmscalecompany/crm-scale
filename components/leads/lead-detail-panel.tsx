"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, Loader2, Mail, MailCheck, MessageSquareText, Trash2, X } from "lucide-react";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import { formatDateBR, formatDateTimeBR } from "@/lib/format";
import { updateLeadDetailsAction, deleteLeadAction } from "@/lib/actions/leads";
import { LEAD_STATUS_STYLE, DEAL_STATUS_STYLE } from "@/lib/status-colors";
import { PersonInline } from "@/components/ui/avatar";
import type { PersonRef } from "@/lib/leads-table-columns";
import type { Database, LeadStatus } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadAttribution = Database["public"]["Tables"]["lead_attribution"]["Row"];
type Deal = Database["public"]["Tables"]["deals"]["Row"];

interface Person {
  id: string;
  nome: string;
}
interface Niche {
  id: string;
  nome: string;
}

interface LeadDetailPanelProps {
  lead: Lead | null;
  attribution: LeadAttribution | null;
  deal: Deal | null;
  closer: PersonRef | null;
  niches: Niche[];
  sdrs: Person[];
  currentUserRole: string | null;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
  /** Called after a successful excluir — the parent (LeadsBoard) drops the
   * lead from its local list; this panel just closes itself. */
  onDeleted: (id: string) => void;
  /** Quick actions (per explicit user request) — same handlers the Kanban
   * card already wires (leads-board.tsx's setDealModalLead/
   * handleSendFirstContactEmail), just reachable from the detail popup too. */
  onScheduleMeeting: () => void;
  onSendFirstContactEmail: () => void;
  sendingFirstContactEmail: boolean;
  firstContactEmailSent: boolean;
  /** "Atualizações" quick action — opens LeadUpdatesModal, replacing the
   * old single "Observação" field with an append-only history. */
  onOpenUpdates: () => void;
}

const LEAD_STATUS_OPTIONS: LeadStatus[] = ["novo", "em_atendimento", "follow_up", "reuniao_agendada", "convertido", "perdido"];

// Row-click drawer from the leads table — carries every field from the
// original Monday export that leads-table.tsx doesn't have room for.
// "Dados do lead" is editable (calls updateLeadDetailsAction); "Atribuição
// de marketing" and "Negócio" are read-only here — they come from separate
// tables with their own creation flows (lead_attribution is capture-time
// only, deals already has "Marcar reunião"). Subelementos/Comissão
// (deal_products/commissions) aren't shown — Week 1 doesn't populate them.
// Rendered with key={lead?.id} by the parent so React remounts (rather
// than updates) this component whenever the selected lead changes — that's
// what lets `useState(lead)` initialize fresh per-lead without a
// prop-to-state sync effect (an anti-pattern: see
// react-hooks/set-state-in-effect).
export function LeadDetailPanel({
  lead,
  attribution,
  deal,
  closer,
  niches,
  sdrs,
  currentUserRole,
  onClose,
  onSaved,
  onDeleted,
  onScheduleMeeting,
  onSendFirstContactEmail,
  sendingFirstContactEmail,
  firstContactEmailSent,
  onOpenUpdates,
}: LeadDetailPanelProps) {
  const [form, setForm] = useState(lead);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!lead || !form) return null;

  function set<K extends keyof Lead>(key: K, value: Lead[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSave() {
    if (!form) return;
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateLeadDetailsAction(form.id, {
          nome: form.nome,
          empresa: form.empresa,
          cargo: form.cargo,
          telefone: form.telefone,
          whatsapp_txt: form.whatsapp_txt,
          email: form.email,
          insta: form.insta,
          niche_id: form.niche_id,
          origem: form.origem,
          direcao: form.direcao,
          tipo: form.tipo,
          faturamento_medio: form.faturamento_medio,
          faturamento_medio_label: form.faturamento_medio_label,
          qualificador: form.qualificador,
          owner_sdr_id: form.owner_sdr_id,
          status: form.status,
        });
        onSaved(updated);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  async function handleDelete() {
    if (!form) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteLeadAction(form.id);
      onDeleted(form.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return createPortal(
    // Anchored to the table's top-right corner, height-capped, no backdrop
    // (per explicit user request) — doesn't dim/cover the sidebar or the
    // rest of the CRM the way a centered modal-with-overlay did. The outer
    // div is just an invisible full-page click target for "click outside
    // to close"; it paints nothing itself.
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute right-4 top-20 flex max-h-[80vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-hairline bg-bg-secondary p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">{lead.nome}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-primary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Ações rápidas — mesmos handlers do card do kanban
            (kanban/lead-card.tsx), agora também aqui no popup. */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onScheduleMeeting} className={cn(secondaryButtonClass, "flex items-center gap-1.5")}>
            <CalendarPlus size={14} />
            Agendar reunião
          </button>
          {lead.email && (
            <button
              type="button"
              onClick={onSendFirstContactEmail}
              disabled={sendingFirstContactEmail}
              className={cn(
                secondaryButtonClass,
                "flex items-center gap-1.5",
                firstContactEmailSent && "border-status-good/50 text-status-good"
              )}
            >
              {sendingFirstContactEmail ? (
                <Loader2 size={14} className="animate-spin" />
              ) : firstContactEmailSent ? (
                <MailCheck size={14} />
              ) : (
                <Mail size={14} />
              )}
              {firstContactEmailSent ? "E-mail enviado" : "Enviar e-mail"}
            </button>
          )}
          <button type="button" onClick={onOpenUpdates} className={cn(secondaryButtonClass, "flex items-center gap-1.5")}>
            <MessageSquareText size={14} />
            Atualizações
          </button>
        </div>

        {/* Categorizado por explicit user request — antes era um único
            "Dados do lead" misturando contato/classificação/pipeline. */}
        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Dados pessoais</h3>

          <Field id="nome" label="Nome">
            <input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} className={fieldInputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="empresa" label="Empresa">
              <input
                id="empresa"
                value={form.empresa ?? ""}
                onChange={(e) => set("empresa", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
            <Field id="cargo" label="Cargo">
              <input
                id="cargo"
                value={form.cargo ?? ""}
                onChange={(e) => set("cargo", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="whatsapp_txt" label="WhatsApp">
              <input
                id="whatsapp_txt"
                value={form.whatsapp_txt ?? ""}
                onChange={(e) => set("whatsapp_txt", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
            <Field id="telefone" label="Telefone">
              <input
                id="telefone"
                value={form.telefone ?? ""}
                onChange={(e) => set("telefone", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="email" label="E-mail">
              <input
                id="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
            <Field id="insta" label="Instagram">
              <input
                id="insta"
                value={form.insta ?? ""}
                onChange={(e) => set("insta", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>
        </section>

        <div className="my-6 border-t border-hairline" />

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Classificação</h3>

          <div className="grid grid-cols-2 gap-3">
            <Field id="niche_id" label="Nicho">
              <select
                id="niche_id"
                value={form.niche_id ?? ""}
                onChange={(e) => set("niche_id", e.target.value || null)}
                className={fieldInputClass}
              >
                <option value="">—</option>
                {niches.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="origem" label="Origem">
              <input
                id="origem"
                value={form.origem ?? ""}
                onChange={(e) => set("origem", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="direcao" label="Direção">
              <input
                id="direcao"
                value={form.direcao ?? ""}
                onChange={(e) => set("direcao", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
            <Field id="tipo" label="Tipo">
              <input
                id="tipo"
                value={form.tipo ?? ""}
                onChange={(e) => set("tipo", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="faturamento_medio" label="Faturamento médio (R$)">
              <input
                id="faturamento_medio"
                type="number"
                value={form.faturamento_medio ?? ""}
                onChange={(e) => set("faturamento_medio", e.target.value ? Number(e.target.value) : null)}
                className={fieldInputClass}
              />
            </Field>
            <Field id="faturamento_medio_label" label="Faturamento médio (texto)">
              <input
                id="faturamento_medio_label"
                value={form.faturamento_medio_label ?? ""}
                onChange={(e) => set("faturamento_medio_label", e.target.value || null)}
                className={fieldInputClass}
              />
            </Field>
          </div>

          <Field id="qualificador" label="Qualificador">
            <input
              id="qualificador"
              value={form.qualificador ?? ""}
              onChange={(e) => set("qualificador", e.target.value || null)}
              className={fieldInputClass}
            />
          </Field>
        </section>

        <div className="my-6 border-t border-hairline" />

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pipeline</h3>

          <div className="grid grid-cols-2 gap-3">
            <Field id="owner_sdr_id" label="SDR responsável">
              <select
                id="owner_sdr_id"
                value={form.owner_sdr_id ?? ""}
                onChange={(e) => set("owner_sdr_id", e.target.value || null)}
                className={fieldInputClass}
              >
                <option value="">—</option>
                {sdrs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="status" label="Etapa">
              <select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as LeadStatus)}
                className={fieldInputClass}
              >
                {LEAD_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_STYLE[s].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {lead.criado_em && <p className="text-xs text-muted">Data de entrada: {formatDateTimeBR(lead.criado_em)}</p>}
        </section>

        {(attribution || deal) && <div className="my-6 border-t border-hairline" />}

        {attribution && (
          <section className="flex flex-col gap-2">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Campanha</h3>
            <ReadOnlyRow label="Campanha" value={attribution.campanha} />
            <ReadOnlyRow label="Público" value={attribution.publico} />
            <ReadOnlyRow label="Criativo" value={attribution.criativo} />
            <ReadOnlyRow label="fbclid" value={attribution.fbclid} />
            <ReadOnlyRow label="Lead Id (Ads)" value={attribution.lead_id_ads} />
            <ReadOnlyRow label="LP" value={attribution.lp} />
            <ReadOnlyRow label="Evento" value={attribution.evento ? formatDateBR(attribution.evento) : null} />
            <ReadOnlyRow label="UTM Source" value={attribution.utm_source} />
            <ReadOnlyRow label="UTM Medium" value={attribution.utm_medium} />
            <ReadOnlyRow label="UTM Campaign" value={attribution.utm_campaign} />
          </section>
        )}

        {deal && (
          <section className="mt-6 flex flex-col gap-2">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Informações de venda</h3>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="shrink-0 text-muted">Closer</span>
              {closer ? <PersonInline name={closer.nome} src={closer.foto_url} /> : <span className="text-secondary">—</span>}
            </div>
            <ReadOnlyRow label="Valor bruto" value={deal.valor_bruto != null ? String(deal.valor_bruto) : null} />
            <ReadOnlyRow label="Valor líquido" value={deal.valor_liquido != null ? String(deal.valor_liquido) : null} />
            <ReadOnlyRow label="Modelo" value={deal.modelo} />
            <ReadOnlyRow label="Etapa do negócio" value={DEAL_STATUS_STYLE[deal.status].label} />
            <ReadOnlyRow label="Data de agendamento" value={deal.data_agendamento} />
            <ReadOnlyRow label="Data de fechamento" value={deal.data_fechamento} />
            <ReadOnlyRow label="Janela de fechamento" value={deal.janela_fechamento} />
          </section>
        )}

        {error && <p className="mt-4 text-sm text-status-critical">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-hairline pt-4">
          {currentUserRole === "admin" ? (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-status-critical">Excluir este lead?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-status-critical/50 px-3 py-2 text-xs font-semibold text-status-critical transition hover:bg-status-critical/10 disabled:opacity-60"
                >
                  {deleting ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} className="text-xs text-muted hover:text-primary">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-muted transition hover:text-status-critical"
                title="Excluir lead (vai para a lixeira)"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Fechar
            </button>
            <button type="button" onClick={handleSave} disabled={pending} className={primaryButtonClass}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="truncate text-right text-secondary">{value || "—"}</span>
    </div>
  );
}
