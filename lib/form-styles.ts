// Shared input/select/label classes for the kanban forms — same visual
// language as the login page's fields, factored out once it started
// repeating across create-lead/create-deal/qualify forms.
export const fieldLabelClass = "text-xs font-semibold uppercase tracking-wide text-muted";

export const fieldInputClass =
  "rounded-lg border border-hairline bg-black/30 px-3 py-2.5 text-sm text-primary outline-none transition focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-soft)]";

export const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-accent-primary to-accent-light px-4 py-2.5 text-sm font-bold text-ink-strong shadow-[0_0_20px_var(--accent-primary-glow)] transition hover:shadow-[0_0_28px_var(--accent-primary-glow)] disabled:opacity-60";

export const secondaryButtonClass =
  "rounded-lg border border-hairline px-4 py-2.5 text-sm text-secondary transition hover:border-hairline-strong hover:text-primary disabled:opacity-60";

// Compact icon-only action button (kanban/table cards) — Qualificar/Marcar
// reunião/meeting-outcome controls all use this to stay unobtrusive on
// narrow cards and dense table rows.
export const iconButtonClass =
  "flex items-center justify-center rounded-md border border-hairline p-1.5 text-secondary transition hover:border-hairline-strong hover:text-primary";
