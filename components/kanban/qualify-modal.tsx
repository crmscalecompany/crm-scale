"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { createQualificationAction } from "@/lib/actions/qualifications";
import type { QualificationEntidadeTipo, QualificationEtapa } from "@/lib/types/database.types";

interface QualificationReason {
  id: string;
  descricao: string;
}

interface QualifyModalProps {
  open: boolean;
  onClose: () => void;
  entidadeTipo: QualificationEntidadeTipo;
  entidadeId: string;
  etapa: QualificationEtapa;
  reasons: QualificationReason[];
  onQualified: () => void;
}

// Shared between the leads board (etapa="sdr") and the deals board
// (etapa="closer") — blueprint §2.4: same 1-5 + required reason + optional
// comment shape for both stages, stored as separate rows that are never
// overwritten.
export function QualifyModal({ open, onClose, entidadeTipo, entidadeId, etapa, reasons, onQualified }: QualifyModalProps) {
  const [nota, setNota] = useState(3);
  const [motivoId, setMotivoId] = useState("");
  const [comentario, setComentario] = useState("");
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
        await createQualificationAction({
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId,
          etapa,
          nota,
          motivo_id: motivoId,
          comentario: comentario || null,
        });
        setMotivoId("");
        setComentario("");
        setNota(3);
        onQualified();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao qualificar.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Qualificar">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Nota</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                  nota === n
                    ? "border-accent-primary bg-accent-primary/20 text-primary"
                    : "border-hairline text-secondary hover:border-hairline-strong"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className={fieldLabelClass}>
            Motivo
          </label>
          <select id="motivo" value={motivoId} onChange={(e) => setMotivoId(e.target.value)} className={fieldInputClass} required>
            <option value="">Selecione…</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.descricao}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="comentario" className={fieldLabelClass}>
            Comentário (opcional)
          </label>
          <textarea
            id="comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className={fieldInputClass}
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
