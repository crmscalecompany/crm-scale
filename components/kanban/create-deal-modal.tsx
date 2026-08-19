"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { createDealAction, getAllClosersAvailabilityAction } from "@/lib/actions/deals";
import { todayInBrazil, weekdayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
interface CloserOption {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface CreateDealModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadNome: string;
  closers: CloserOption[];
  onCreated: (deal: Deal) => void;
}

// Opened from a lead card ("Marcar reunião") — this is how a lead crosses
// from the SDR stage into the Closer stage (blueprint §2.2 Etapa 1, step 5).
// When date + horário are both filled, this opens a pre-filled Google
// Calendar "create event" tab (lib/google-calendar-link.ts) in a new tab so
// the SDR sends the real invite from their own Google account — "notas
// internas" never goes into that link, it's CRM-only context for whoever
// picks up the meeting (see lib/actions/deals.ts::createDealAction).
export function CreateDealModal({ open, onClose, leadId, leadNome, closers, onCreated }: CreateDealModalProps) {
  const [closerId, setCloserId] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState(todayInBrazil);
  const [horario, setHorario] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [availability, setAvailability] = useState<Record<string, string[] | null> | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Shows every closer's real availability up front (Week 2.7 follow-up) —
  // the SDR picks *who to book* based on who's actually free that day,
  // instead of choosing a closer blind and only then finding out their
  // calendar. Fires as soon as the modal opens (dataAgendamento already
  // defaults to today) and again whenever the date changes. A shortcut,
  // never a requirement: closers with no shared calendar (or a lookup
  // failure) just show as unavailable to suggest — the Closer dropdown and
  // manual Horário input below always work regardless.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!dataAgendamento || closers.length === 0) {
        setAvailability(null);
        return;
      }
      setLoadingAvailability(true);
      try {
        const result = await getAllClosersAvailabilityAction(
          closers.map((c) => c.id),
          dataAgendamento
        );
        if (!cancelled) setAvailability(result);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataAgendamento]);

  function pickSlot(id: string, slot: string) {
    setCloserId(id);
    setHorario(slot);
  }

  // Only closers who've actually shared their calendar (a real array back,
  // even if empty) show up in the availability panel — one who hasn't
  // (availability[id] === null) has nothing useful to display.
  const sharedClosers = closers.filter((c) => availability?.[c.id] != null);
  // The manual Closer/Horário fallback only earns its place once there are
  // enough shared closers that the panel above stops being a complete,
  // comfortable picker on its own — below that, it's just redundant
  // clutter next to the panel.
  const showManualFallback = sharedClosers.length > 4;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!closerId) {
      setError("Selecione um closer.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { deal, googleCalendarUrl } = await createDealAction(
          {
            lead_id: leadId,
            closer_id: closerId,
            status: "em_negociacao",
            valor_bruto: null,
            data_agendamento: dataAgendamento || null,
          },
          { horario: horario || undefined, notasInternas: notasInternas || undefined }
        );
        onCreated(deal);
        if (googleCalendarUrl) window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
        setCloserId("");
        setDataAgendamento(todayInBrazil());
        setHorario("");
        setNotasInternas("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao marcar reunião.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Marcar reunião — ${leadNome}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="data" className={fieldLabelClass}>
            Data
          </label>
          <div className="flex items-center gap-2">
            <input
              id="data"
              type="date"
              value={dataAgendamento}
              onChange={(e) => setDataAgendamento(e.target.value)}
              className={cn(fieldInputClass, "w-fit")}
            />
            {dataAgendamento && <span className="text-sm capitalize text-muted">{weekdayName(dataAgendamento)}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={fieldLabelClass}>Disponibilidade dos closers</span>
          {loadingAvailability && <p className="text-xs text-muted">Consultando agendas…</p>}
          {!loadingAvailability &&
            (() => {
              if (sharedClosers.length === 0) return <p className="text-xs text-muted">Nenhum closer com agenda compartilhada ainda.</p>;
              return (
                <div className="flex flex-col gap-2">
                  {sharedClosers.map((c) => {
                    const closerSlots = availability?.[c.id] ?? [];
                    const isSelected = closerId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "rounded-lg border p-3 transition",
                          isSelected ? "border-accent-primary/50 bg-accent-primary/5" : "border-hairline"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Avatar name={c.nome} src={c.foto_url} size={28} />
                          <span className={cn("text-sm", isSelected ? "font-semibold text-primary" : "text-secondary")}>{c.nome}</span>
                        </div>
                        {closerSlots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {closerSlots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => pickSlot(c.id, slot)}
                                className={cn(
                                  "rounded-lg border px-4 py-2.5 text-base font-semibold transition",
                                  isSelected && horario === slot
                                    ? "border-accent-primary/50 bg-accent-primary/15 text-accent-light"
                                    : "border-hairline text-secondary hover:border-hairline-strong hover:text-primary"
                                )}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">sem horários livres</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>

        {showManualFallback && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="closer" className={fieldLabelClass}>
                Closer *
              </label>
              <select id="closer" value={closerId} onChange={(e) => setCloserId(e.target.value)} className={fieldInputClass} required>
                <option value="">Selecione…</option>
                {closers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="horario" className={fieldLabelClass}>
                Horário (opcional)
              </label>
              <input id="horario" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className={cn(fieldInputClass, "w-fit")} />
            </div>
          </>
        )}

        {dataAgendamento && !horario && (
          <p className="-mt-2 text-xs text-muted">Sem horário, o Google Calendar não abre — só a data fica salva no negócio.</p>
        )}
        {dataAgendamento && horario && (
          <p className="-mt-2 text-xs text-muted">Ao salvar, abre uma aba do Google Calendar já preenchida — é só revisar e clicar em Salvar lá.</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notas-internas" className={fieldLabelClass}>
            Descrição interna do lead (opcional)
          </label>
          <textarea
            id="notas-internas"
            value={notasInternas}
            onChange={(e) => setNotasInternas(e.target.value)}
            className={fieldInputClass}
            rows={3}
            placeholder="Contexto para o closer — não aparece no convite do Google Calendar nem é visível para o cliente."
          />
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Salvando…" : "Marcar reunião"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
