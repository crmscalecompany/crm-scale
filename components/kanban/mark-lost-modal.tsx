"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { markLeadLostAction } from "@/lib/actions/leads";
import { markDealLostAction } from "@/lib/actions/deals";

interface LostReason {
  id: string;
  descricao: string;
}

interface MarkLostModalProps {
  open: boolean;
  onClose: () => void;
  entidadeTipo: "lead" | "deal";
  entidadeId: string;
  reasons: LostReason[];
  onMarked: () => void;
}

// Opened instead of a direct status write whenever a lead/deal moves to
// "Perdido" (from any board — see the handleMove branch in leads-board.tsx
// and deals-board.tsx) — captures *why*, which lost_reasons/motivo_perda(_id)
// have supported since Week 1 but nothing in the UI set until now.
export function MarkLostModal({ open, onClose, entidadeTipo, entidadeId, reasons, onMarked }: MarkLostModalProps) {
  const [motivoId, setMotivoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoId) {
      setError("Selecione um motivo.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (entidadeTipo === "lead") await markLeadLostAction(entidadeId, motivoId);
        else await markDealLostAction(entidadeId, motivoId);
        setMotivoId("");
        onMarked();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao marcar como perdido.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Marcar como perdido">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo-perda" className={fieldLabelClass}>
            Motivo
          </label>
          <select id="motivo-perda" value={motivoId} onChange={(e) => setMotivoId(e.target.value)} className={fieldInputClass} required>
            <option value="">Selecione…</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.descricao}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Salvando…" : "Marcar como perdido"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
