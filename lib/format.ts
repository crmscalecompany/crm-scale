export function formatBRL(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

// America/Sao_Paulo, fixed -03:00 (Brazil has had no DST since 2019) — same
// assumption lib/google-calendar-link.ts makes. Plain
// `new Date().toISOString()` would be wrong here during the last 3 hours of
// each Brazil day, since UTC has already rolled over to tomorrow by then.
export function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// "YYYY-MM-DD" -> "sexta-feira" — parsed as noon UTC (not midnight) so the
// -03:00 Brazil offset never rolls it back to the previous day.
export function weekdayName(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(new Date(`${date}T12:00:00Z`));
}

// Month-filter helpers for the SDR's/Closer's pipeline boards — default to
// the current month (so "Novo"/"Em Atendimento" don't accumulate years of
// never-followed-up leads visually), with a way to page to other months or
// clear the filter entirely.
export function currentMonthInBrazil(): string {
  return todayInBrazil().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}

// "YYYY-MM" -> first/last day of that month as "YYYY-MM-DD", for
// criado_em_from/criado_em_to style range filters.
export function monthDateRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

// `date` columns come back as "YYYY-MM-DD" strings — format for display
// without going through a Date object (avoids UTC/local timezone shifting
// the day by one).
export function formatDateBR(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

// criado_em is a timestamptz — format with time-of-day (unlike the plain
// `date` columns above) so peak lead-entry hours are visible in the table.
// Every lead migrated from Monday has criado_em defaulted to exactly
// 00:00:00 UTC (Monday's "Data Entrada" column never had a real time — see
// scripts/migrate-monday.ts::parseMondayDateTime) — that's a fabricated
// placeholder, not a real entry time, so showing it would be misleading.
// A lead created directly in the CRM gets `new Date().toISOString()` at
// creation, which will essentially never land on exact midnight UTC — so
// this is a safe way to tell "real timestamp" from "no time was ever
// captured" without a separate flag column.
export function formatDateTimeBR(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(date);

  const isFabricatedMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (isFabricatedMidnight) return datePart;

  const timePart = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
  return `${datePart} ${timePart}`;
}
