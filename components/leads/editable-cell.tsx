"use client";

import { useEffect, useRef, useState } from "react";
import { fieldInputClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import type { ColumnEditKind } from "@/lib/leads-table-columns";

export interface EditableOption {
  id: string;
  label: string;
}

interface EditableCellProps {
  kind: ColumnEditKind;
  /** Raw current value — the select/combobox kinds use this to highlight
   * the active option; text/number use it to seed the input. */
  value: string;
  /** Already-rendered read display (badges, avatars, dashes, …) — reused
   * as-is from renderColumnCell so editable and read-only cells look
   * identical until interacted with. */
  display: React.ReactNode;
  /** niche_select/sdr_select/combobox only. */
  options?: EditableOption[];
  onSave: (value: string | null) => Promise<void>;
  /** niche_select only — "criar novo nicho". */
  onCreateOption?: (label: string) => Promise<EditableOption>;
}

// Inline editing for one table cell — double-click enters text/number edit
// mode, single-click opens a dropdown for select/combobox kinds. Owns only
// its own open/editing UI state; persistence (and optimistic
// update/rollback) is the caller's job via onSave, same division of labor
// as every other mutation in leads-board.tsx (handleMove/handleClaim).
export function EditableCell({ kind, value, display, options = [], onSave, onCreateOption }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus/select the input once it mounts (entering edit mode) — a DOM
  // side effect, not a setState-in-effect: `draft`/`filter` are seeded
  // directly in the click/double-click handlers below instead of synced
  // here, since setState inside an effect body is disallowed in this repo
  // (see LeadDetailPanel's comment on the same lint rule).
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing && !open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setEditing(false);
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditing(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editing, open]);

  async function commitText() {
    setEditing(false);
    const next = draft.trim();
    if (next === value.trim()) return;
    setSaving(true);
    try {
      await onSave(next || null);
    } finally {
      setSaving(false);
    }
  }

  async function commitOption(next: string | null) {
    setOpen(false);
    if (next === (value || null)) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  async function commitCreate() {
    const label = filter.trim();
    if (!label) return;
    setSaving(true);
    try {
      if (onCreateOption) {
        const created = await onCreateOption(label);
        await onSave(created.id);
      } else {
        // combobox kind — the field is free text, so "create" is just
        // saving whatever was typed.
        await onSave(label);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (kind === "text" || kind === "number") {
    if (!editing) {
      return (
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setDraft(value);
            setEditing(true);
          }}
          className={cn("min-h-[20px] truncate whitespace-nowrap", saving && "opacity-50")}
          title="Duplo clique para editar"
        >
          {display}
        </div>
      );
    }
    return (
      <div ref={wrapRef} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type={kind === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            }
          }}
          className={cn(fieldInputClass, "h-8 w-full !py-1 text-sm")}
        />
      </div>
    );
  }

  // niche_select / sdr_select / combobox — single-click opens a dropdown.
  const filtered =
    filter.trim() === "" ? options : options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const exactMatch = options.some((o) => o.label.toLowerCase() === filter.trim().toLowerCase());

  return (
    <div ref={wrapRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <div
        onClick={() => {
          if (!open) setFilter("");
          setOpen(!open);
        }}
        className={cn("min-h-[20px] cursor-pointer truncate whitespace-nowrap", saving && "opacity-50")}
        title="Clique para escolher"
      >
        {display}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-card border border-hairline bg-bg-secondary p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {kind !== "sdr_select" && (
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filter.trim() && !exactMatch) commitCreate();
              }}
              placeholder={kind === "niche_select" ? "Buscar ou criar nicho…" : "Buscar ou criar…"}
              className={cn(fieldInputClass, "mb-2 h-8 w-full !py-1 text-sm")}
            />
          )}

          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            <button
              type="button"
              onClick={() => commitOption(null)}
              className="rounded-md px-2 py-1.5 text-left text-sm text-muted transition hover:bg-white/5"
            >
              — Limpar
            </button>
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => commitOption(opt.id)}
                className={cn(
                  "truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/5",
                  opt.id === value ? "bg-accent-primary/15 text-accent-light" : "text-secondary"
                )}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-1.5 text-sm text-muted">Nada encontrado.</p>}
          </div>

          {kind !== "sdr_select" && filter.trim() !== "" && !exactMatch && (
            <button
              type="button"
              onClick={commitCreate}
              className="mt-1 w-full rounded-md border border-hairline px-2 py-1.5 text-left text-xs font-semibold text-accent-light transition hover:bg-accent-primary/10"
            >
              + Criar “{filter.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
