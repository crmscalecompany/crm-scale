"use client";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/format";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

interface MonthFilterProps {
  /** "YYYY-MM", or null for "todos os períodos" (no date filtering). */
  month: string | null;
  onChange: (month: string | null) => void;
  /** What to filter back to when re-enabling from "todos" — usually the
   * current month. */
  defaultMonth: string;
}

// Used by the SDR's/Closer's pipeline boards (Week 2.7 follow-up) — those
// default to the current month so "Novo"/"Em Atendimento" don't silently
// accumulate years of never-followed-up leads, but a lead genuinely from
// last month still needs to be reachable, hence prev/next + a clear
// "todos os períodos" escape hatch rather than a hard cutoff.
export function MonthFilter({ month, onChange, defaultMonth }: MonthFilterProps) {
  if (month === null) {
    return (
      <button type="button" onClick={() => onChange(defaultMonth)} className={cn(secondaryButtonClass, "flex items-center gap-1.5")}>
        <Calendar size={14} />
        Todos os períodos
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-hairline p-1">
      <button
        type="button"
        title="Mês anterior"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-md p-1 text-secondary transition hover:bg-white/5 hover:text-primary"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[9rem] px-1 text-center text-sm capitalize text-primary">{monthLabel(month)}</span>
      <button
        type="button"
        title="Próximo mês"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-md p-1 text-secondary transition hover:bg-white/5 hover:text-primary"
      >
        <ChevronRight size={14} />
      </button>
      <button
        type="button"
        title="Ver todos os períodos"
        aria-label="Ver todos os períodos"
        onClick={() => onChange(null)}
        className="ml-1 rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
