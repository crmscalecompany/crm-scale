"use client";

import { useEffect, useState } from "react";
import { fetchCommissionsDataAction, markCommissionPaidAction, type CommissionViewModel } from "@/lib/actions/commissions";
import { CommissionRulesPanel } from "@/components/commissions/commission-rules-panel";
import { primaryButtonClass } from "@/lib/form-styles";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type CommissionRule = Database["public"]["Tables"]["commission_rules"]["Row"];

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface CommissionsViewProps {
  closers: Person[];
  currentUserRole: string | null;
}

function StatusBadge({ status }: { status: CommissionViewModel["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "pago" ? "bg-status-good/15 text-status-good" : "bg-status-warning/15 text-status-warning"
      )}
    >
      {status === "pago" ? "Paga" : "Pendente"}
    </span>
  );
}

// Admin-only management panel (commission_rules) + a commissions list whose
// scope is entirely driven by RLS, not client-side filtering: an admin's
// query returns every commission, a seller's returns only their own (see
// lib/actions/commissions.ts). Self-fetches on mount, matching the
// SDR's/Closer's pipeline boards' pattern — kept mounted-but-hidden by the
// parent CrmWorkspace when the section isn't active, so switching back
// doesn't re-fetch.
export function CommissionsView({ closers, currentUserRole }: CommissionsViewProps) {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [commissions, setCommissions] = useState<CommissionViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const isAdmin = currentUserRole === "admin";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCommissionsDataAction();
        if (cancelled) return;
        setRules(result.rules);
        setCommissions(result.commissions);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar comissões.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const closerById = new Map(closers.map((c) => [c.id, c]));

  async function handleMarkPaid(id: string) {
    setMarkingPaidId(id);
    setError(null);
    try {
      await markCommissionPaidAction(id);
      setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status: "pago" } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao marcar como paga.");
    } finally {
      setMarkingPaidId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-primary">{isAdmin ? "Comissões" : "Minhas comissões"}</h1>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline">
            fechar
          </button>
        </div>
      )}

      {isAdmin && (
        <CommissionRulesPanel
          rules={rules}
          closers={closers}
          onRuleCreated={(rule) => setRules((prev) => [rule, ...prev])}
          onRuleDeleted={(id) => setRules((prev) => prev.filter((r) => r.id !== id))}
        />
      )}

      <div className={cn("overflow-x-auto rounded-card border border-hairline", loading && "opacity-50 transition-opacity")}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline bg-bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Lead</th>
              {isAdmin && <th className="px-3 py-2">Vendedor</th>}
              <th className="px-3 py-2">Valor fechado</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Comissão</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Status</th>
              {isAdmin && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id} className="border-b border-hairline/60 last:border-0">
                <td className="px-3 py-2 text-secondary">{c.leadNome ?? "—"}</td>
                {isAdmin && <td className="px-3 py-2 text-secondary">{c.vendedorId ? (closerById.get(c.vendedorId)?.nome ?? "—") : "—"}</td>}
                <td className="px-3 py-2 text-secondary">{formatBRL(c.valorBruto) ?? "—"}</td>
                <td className="px-3 py-2 text-secondary">{c.percentual != null ? `${c.percentual}%` : "sem regra"}</td>
                <td className="px-3 py-2 font-medium text-primary">{formatBRL(c.valorCalculado) ?? "—"}</td>
                <td className="px-3 py-2 text-secondary">{formatDateBR(c.calculadoEm.slice(0, 10))}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={c.status} />
                </td>
                {isAdmin && (
                  <td className="px-3 py-2">
                    {c.status === "pendente" && (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(c.id)}
                        disabled={markingPaidId === c.id}
                        className={cn(primaryButtonClass, "!px-3 !py-1.5 text-xs")}
                      >
                        {markingPaidId === c.id ? "Salvando…" : "Marcar como paga"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-4 py-8 text-center text-sm text-muted">
                  Nenhuma comissão ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
