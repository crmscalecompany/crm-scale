"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3 } from "lucide-react";
import { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from "@/lib/leads-table-columns";
import { secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

interface ColumnPickerProps {
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
  onReset: () => void;
}

// Popover with a checkbox per optional column (required columns — Lead,
// Etapa — aren't listed, they're always shown) + a reset-to-default button.
export function ColumnPicker({ visible, onChange, onReset }: ColumnPickerProps) {
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

  function toggle(key: string) {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  const isDefault = visible.size === DEFAULT_VISIBLE_COLUMNS.length && DEFAULT_VISIBLE_COLUMNS.every((k) => visible.has(k));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(secondaryButtonClass, "flex items-center gap-1.5")}>
        <Columns3 size={14} />
        Colunas
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-card border border-hairline bg-bg-secondary p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Colunas visíveis</p>
            <button
              type="button"
              onClick={onReset}
              disabled={isDefault}
              className={cn("text-xs text-accent-light hover:underline", isDefault && "cursor-not-allowed opacity-40 hover:no-underline")}
            >
              Redefinir
            </button>
          </div>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {ALL_COLUMNS.filter((c) => !c.required).map((col) => (
              <label key={col.key} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-secondary hover:bg-white/5">
                <input type="checkbox" checked={visible.has(col.key)} onChange={() => toggle(col.key)} />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
