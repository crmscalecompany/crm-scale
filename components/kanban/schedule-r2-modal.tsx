"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { getCloserAvailabilityAction, scheduleR2Action } from "@/lib/actions/deals";
import { todayInBrazil, weekdayName } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScheduleR2ModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  closerId: string;
  closerNome: string;
  closerFotoUrl: string | null;
  leadNome: string;
}

// "Marcar R2" — a follow-up meeting on a deal already in negotiation,
// booked by the closer (not the SDR/lead-card "Marcar reunião" flow that
// books the first meeting). Same real-availability + Google Calendar link
// mechanism as CreateDealModal, just scoped to the deal's one closer
// instead of showing every closer — see
// lib/actions/deals.ts::scheduleR2Action for why this doesn't write
// anything to deals/meetings.
export function ScheduleR2Modal({ open, onClose, dealId, closerId, closerNome, closerFotoUrl, leadNome }: ScheduleR2ModalProps) {
  const [dataAgendamento, setDataAgendamento] = useState(todayInBrazil);
  const [horario, setHorario] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!dataAgendamento) {
        setSlots(null);
        return;
      }
      setLoadingSlots(true);
      try {
        const result = await getCloserAvailabilityAction(closerId, dataAgendamento);
        if (!cancelled) setSlots(result);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [closerId, dataAgendamento]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!horario) {
      setError("Escolha um horário.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const url = await scheduleR2Action(dealId, dataAgendamento, horario);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        setHorario("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao marcar R2.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Marcar R2 — ${leadNome}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r2-data" className={fieldLabelClass}>
            Data
          </label>
          <div className="flex items-center gap-2">
            <input
              id="r2-data"
              type="date"
              value={dataAgendamento}
              onChange={(e) => setDataAgendamento(e.target.value)}
              className={cn(fieldInputClass, "w-fit")}
            />
            {dataAgendamento && <span className="text-sm capitalize text-muted">{weekdayName(dataAgendamento)}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={fieldLabelClass}>Disponibilidade</span>
          <div className="rounded-lg border border-hairline p-3">
            <div className="mb-2 flex items-center gap-2">
              <Avatar name={closerNome} src={closerFotoUrl} size={28} />
              <span className="text-sm text-secondary">{closerNome}</span>
            </div>
            {loadingSlots && <p className="text-xs text-muted">Consultando agenda…</p>}
            {!loadingSlots && slots && slots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setHorario(slot)}
                    className={cn(
                      "rounded-lg border px-4 py-2.5 text-base font-semibold transition",
                      horario === slot
                        ? "border-accent-primary/50 bg-accent-primary/15 text-accent-light"
                        : "border-hairline text-secondary hover:border-hairline-strong hover:text-primary"
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
            {!loadingSlots && slots && slots.length === 0 && <span className="text-xs text-muted">Sem horários livres nessa data.</span>}
            {!loadingSlots && slots === null && <span className="text-xs text-muted">Agenda ainda não compartilhada — escolha manualmente.</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="r2-horario" className={fieldLabelClass}>
            Horário
          </label>
          <input
            id="r2-horario"
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className={cn(fieldInputClass, "w-fit")}
            required
          />
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Abrindo…" : "Marcar R2"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
