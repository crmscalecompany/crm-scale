"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDateBR } from "@/lib/format";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

interface EventoFilterProps {
  selected: string | undefined;
  onChange: (evento: string | undefined) => void;
  /** "YYYY-MM-DD" values, newest first — see lib/data/lead-attribution.ts's
   * listDistinctEventos. */
  eventos: string[];
}

// Quadro Live-only toolbar filter (crm-workspace.tsx) — lets an SDR narrow
// the board down to one live's signups (e.g. "leads da live de 31/08") in
// the same shape as PersonFilter, but for lead_attribution.evento instead
// of a person.
export function EventoFilter({ selected, onChange, eventos }: EventoFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function select(evento: string) {
    onChange(selected === evento ? undefined : evento);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(secondaryButtonClass, "flex items-center gap-1.5", selected && "border-accent-primary/50 text-accent-light")}
      >
        <CalendarDays size={14} />
        {selected ? `Live ${formatDateBR(selected)}` : "Evento"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-card border border-hairline bg-bg-secondary p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filtrar por evento</p>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="text-xs text-accent-light hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {eventos.map((evento) => (
              <button
                key={evento}
                type="button"
                onClick={() => select(evento)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/5",
                  evento === selected ? "bg-accent-primary/15 text-accent-light" : "text-secondary"
                )}
              >
                Live {formatDateBR(evento)}
              </button>
            ))}
            {eventos.length === 0 && <p className="px-2 py-1.5 text-sm text-muted">Nenhum evento registrado ainda.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
