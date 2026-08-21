"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow } from "lucide-react";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type SortOrder = "recent" | "oldest";

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: "recent", label: "Mais recentes" },
  { key: "oldest", label: "Mais antigos" },
];

interface SortFilterProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

// Sorts by criado_em client-side (leads-board.tsx already holds the whole
// page of leads in state — a date-bounded Quadro loads the full month, so
// this is a real full sort there, not just "reorder whatever's on screen").
export function SortFilter({ value, onChange }: SortFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(secondaryButtonClass, "flex items-center gap-1.5")}>
        <ArrowDownWideNarrow size={14} />
        {selected.label}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-48 rounded-card border border-hairline bg-bg-secondary p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Ordenar por</p>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/5",
                  option.key === value ? "bg-accent-primary/15 text-accent-light" : "text-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
