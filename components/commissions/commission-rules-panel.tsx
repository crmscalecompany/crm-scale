"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createCommissionRuleAction, deleteCommissionRuleAction } from "@/lib/actions/commissions";
import { fieldLabelClass, fieldInputClass, primaryButtonClass, iconButtonClass } from "@/lib/form-styles";
import { formatDateBR, todayInBrazil } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database, UserRole } from "@/lib/types/database.types";

type CommissionRule = Database["public"]["Tables"]["commission_rules"]["Row"];

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface CommissionRulesPanelProps {
  rules: CommissionRule[];
  closers: Person[];
  onRuleCreated: (rule: CommissionRule) => void;
  onRuleDeleted: (id: string) => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "sdr", label: "SDR" },
  { value: "closer", label: "Closer" },
  { value: "am", label: "Account Manager" },
  { value: "advogado", label: "Advogado responsável" },
  { value: "admin", label: "Admin" },
];
const ROLE_LABEL = new Map(ROLE_OPTIONS.map((r) => [r.value, r.label]));

// Admin-only management for commission_rules — a rule is either a
// role-level default (papel) or a specific seller's override (vendedor_id),
// never both (schema CHECK constraint). Changing a percentage means adding
// a new rule with a later vigente_desde, not editing an old one in place —
// delete is only for fixing a mistake, not for "updating" a rate.
export function CommissionRulesPanel({ rules, closers, onRuleCreated, onRuleDeleted }: CommissionRulesPanelProps) {
  const [ruleType, setRuleType] = useState<"papel" | "vendedor">("papel");
  const [papel, setPapel] = useState<UserRole>("closer");
  const [vendedorId, setVendedorId] = useState("");
  const [percentual, setPercentual] = useState("");
  const [vigenteDesde, setVigenteDesde] = useState(() => todayInBrazil());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closerById = new Map(closers.map((c) => [c.id, c]));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const percentualNum = Number(percentual);
    if (!percentualNum || percentualNum <= 0 || percentualNum > 100) {
      setError("Informe um percentual entre 0 e 100.");
      return;
    }
    if (ruleType === "vendedor" && !vendedorId) {
      setError("Selecione o vendedor.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const rule = await createCommissionRuleAction({
          papel: ruleType === "papel" ? papel : undefined,
          vendedorId: ruleType === "vendedor" ? vendedorId : undefined,
          percentual: percentualNum,
          vigenteDesde,
        });
        onRuleCreated(rule);
        setPercentual("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar regra.");
      }
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteCommissionRuleAction(id);
      onRuleDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir regra.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-card border border-hairline p-4">
      <h2 className="mb-3 text-sm font-semibold text-primary">Regras de comissão</h2>

      {rules.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Aplica-se a</th>
                <th className="px-3 py-2">Percentual</th>
                <th className="px-3 py-2">Vigente desde</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-3 py-2 text-secondary">
                    {r.vendedor_id ? (closerById.get(r.vendedor_id)?.nome ?? "Vendedor removido") : (ROLE_LABEL.get(r.papel!) ?? r.papel)}
                  </td>
                  <td className="px-3 py-2 text-secondary">{r.percentual}%</td>
                  <td className="px-3 py-2 text-secondary">{formatDateBR(r.vigente_desde)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      title="Excluir regra"
                      aria-label="Excluir regra"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className={iconButtonClass}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Tipo</span>
          <div className="flex rounded-lg border border-hairline p-0.5">
            <button
              type="button"
              onClick={() => setRuleType("papel")}
              className={cn("rounded-md px-3 py-1.5 text-sm transition", ruleType === "papel" ? "bg-accent-primary/20 text-primary" : "text-secondary")}
            >
              Por papel
            </button>
            <button
              type="button"
              onClick={() => setRuleType("vendedor")}
              className={cn("rounded-md px-3 py-1.5 text-sm transition", ruleType === "vendedor" ? "bg-accent-primary/20 text-primary" : "text-secondary")}
            >
              Por vendedor
            </button>
          </div>
        </div>

        {ruleType === "papel" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="commission-rule-papel" className={fieldLabelClass}>
              Papel
            </label>
            <select
              id="commission-rule-papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as UserRole)}
              className={fieldInputClass}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="commission-rule-vendedor" className={fieldLabelClass}>
              Vendedor
            </label>
            <select id="commission-rule-vendedor" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={fieldInputClass} required>
              <option value="">Selecione…</option>
              {closers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="commission-rule-percentual" className={fieldLabelClass}>
            Percentual (%)
          </label>
          <input
            id="commission-rule-percentual"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className={cn(fieldInputClass, "w-28")}
            placeholder="10"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="commission-rule-vigente" className={fieldLabelClass}>
            Vigente desde
          </label>
          <input
            id="commission-rule-vigente"
            type="date"
            value={vigenteDesde}
            onChange={(e) => setVigenteDesde(e.target.value)}
            className={fieldInputClass}
            required
          />
        </div>

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Salvando…" : "Adicionar regra"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-status-critical">{error}</p>}
    </div>
  );
}
