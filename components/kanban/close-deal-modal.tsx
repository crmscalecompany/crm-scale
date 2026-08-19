"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { closeDealAction } from "@/lib/actions/deals";

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface CloseDealModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
  closers: Person[];
  /** The deal's own closer, preselected — almost always correct, editable
   * for the rare case a different seller gets credit. */
  defaultVendedorId?: string;
  onClosed: (valorBruto: number) => void;
}

// Opened instead of a direct status write whenever a deal moves to
// "Fechado" (see the handleMove branch in deals-board.tsx and
// closer-pipeline-board.tsx) — this is the one point in the funnel a
// deal's value is captured (removed from the earlier "Marcar reunião" form
// on purpose, since no real value is known that early). Feeds
// closeDealAction, which creates the deal_product + resulting commission.
export function CloseDealModal({ open, onClose, dealId, closers, defaultVendedorId, onClosed }: CloseDealModalProps) {
  const [valor, setValor] = useState("");
  const [vendedorId, setVendedorId] = useState(defaultVendedorId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Number(valor);
    if (!valorNum || valorNum <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!vendedorId) {
      setError("Selecione o vendedor responsável.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await closeDealAction(dealId, { valorBruto: valorNum, vendedorId });
        onClosed(valorNum);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao fechar negócio.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Fechar negócio">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="close-deal-valor" className={fieldLabelClass}>
            Valor fechado
          </label>
          <input
            id="close-deal-valor"
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={fieldInputClass}
            placeholder="0,00"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="close-deal-vendedor" className={fieldLabelClass}>
            Vendedor responsável
          </label>
          <select id="close-deal-vendedor" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={fieldInputClass} required>
            <option value="">Selecione…</option>
            {closers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
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
            {pending ? "Salvando…" : "Fechar negócio"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
