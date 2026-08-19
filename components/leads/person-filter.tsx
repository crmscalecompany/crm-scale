"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}

interface PersonFilterProps {
  selectedId: string | undefined;
  onChange: (id: string | undefined) => void;
  people: Person[];
  /** "Pessoa" by default — callers with a specific person pool (e.g. the
   * Closer's board) can relabel the button so it doesn't read like it's
   * still SDR-only. */
  label?: string;
}

// Dedicated quick-filter by person, split out of the Filtros popover into
// its own toolbar button (per explicit user request) — a person picker
// gets avatars next to each name, which doesn't fit inside a plain
// <select>. Decoupled from LeadFilters (just selectedId/onChange) so it can
// filter SDRs (Filtros toolbar, writes filters.owner_sdr_id) or closers
// (Closer's pipeline board, local state) with the same component.
export function PersonFilter({ selectedId, onChange, people, label = "Pessoa" }: PersonFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = people.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function select(id: string) {
    onChange(selectedId === id ? undefined : id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(secondaryButtonClass, "flex items-center gap-1.5", selected && "border-accent-primary/50 text-accent-light")}
      >
        {selected ? <Avatar name={selected.nome} src={selected.foto_url} size={16} /> : <User size={14} />}
        {selected ? selected.nome : label}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-card border border-hairline bg-bg-secondary p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filtrar por pessoa</p>
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
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/5",
                  p.id === selectedId ? "bg-accent-primary/15 text-accent-light" : "text-secondary"
                )}
              >
                <Avatar name={p.nome} src={p.foto_url} size={22} />
                {p.nome}
              </button>
            ))}
            {people.length === 0 && <p className="px-2 py-1.5 text-sm text-muted">Ninguém cadastrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
