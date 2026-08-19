"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { fetchTrashAction, restoreLeadAction } from "@/lib/actions/leads";
import { formatDateTimeBR } from "@/lib/format";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadsTrashProps {
  currentUserRole: string | null;
}

// "Lixeira" — leads soft-deleted via lead-detail-panel.tsx's Excluir
// button. Self-fetches on mount (same pattern as CommissionsView), since
// this is an occasional-use admin screen, not something the initial page
// load needs to pay for. Restoring just clears deleted_at/deleted_by —
// nothing else was ever touched by the delete, so the lead reappears
// exactly as it was.
export function LeadsTrash({ currentUserRole }: LeadsTrashProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [userNameById, setUserNameById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const isAdmin = currentUserRole === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTrashAction();
        if (cancelled) return;
        setLeads(result.leads);
        setUserNameById(new Map(result.users.map((u) => [u.id, u.nome])));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar a lixeira.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleRestore(id: string) {
    setRestoringId(id);
    setError(null);
    try {
      await restoreLeadAction(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao restaurar.");
    } finally {
      setRestoringId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-primary">Lixeira</h1>
        <p className="text-sm text-muted">Apenas administradores podem ver a lixeira.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Lixeira</h1>
        <p className="mt-1 text-sm text-muted">Leads excluídos ficam aqui — restaure a qualquer momento.</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline">
            fechar
          </button>
        </div>
      )}

      <div className={cn("overflow-x-auto rounded-card border border-hairline", loading && "opacity-50 transition-opacity")}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline bg-bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Origem</th>
              <th className="px-3 py-2">Excluído em</th>
              <th className="px-3 py-2">Excluído por</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-hairline/60 last:border-0">
                <td className="px-3 py-2 font-medium text-primary">{lead.nome}</td>
                <td className="px-3 py-2 text-secondary">{lead.empresa || "—"}</td>
                <td className="px-3 py-2 text-secondary">{lead.origem || "—"}</td>
                <td className="px-3 py-2 text-secondary">{lead.deleted_at ? formatDateTimeBR(lead.deleted_at) : "—"}</td>
                <td className="px-3 py-2 text-secondary">{(lead.deleted_by && userNameById.get(lead.deleted_by)) || "—"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(lead.id)}
                    disabled={restoringId === lead.id}
                    className={cn(secondaryButtonClass, "flex items-center gap-1.5 !px-3 !py-1.5 text-xs")}
                  >
                    <RotateCcw size={13} />
                    {restoringId === lead.id ? "Restaurando…" : "Restaurar"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                  A lixeira está vazia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
