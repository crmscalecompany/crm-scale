// Monday.com column IDs for board MONDAY_BOARD_ID.
//
// All 35 columns confirmed via `npm run migrate:monday -- --discover-columns`
// against the real board (2026-08-06) — the 11 ported from the commercial
// dashboard's own sync all matched exactly, confirming it's the same board.
//
// "Subelementos" (subtasks_mkta44g3) is deliberately NOT listed here — it's
// a Monday subitems column, fetched via the `subitems { ... }`
// sub-selection in lib/migration/monday-client.ts, not a normal
// column_values entry. "Name" isn't listed either — it's `item.name`,
// fetched directly by the query, not a column.
//
// A function, not a top-level const: the migration script loads .env.local
// (or --env-file=...) via dotenv AFTER its imports are evaluated (normal
// ESM hoisting), so reading process.env at module-load time would miss a
// custom env file's value. Reading it lazily, inside a function called from
// main(), sidesteps that ordering entirely.
export function getMondayBoardId(): number {
  return Number(process.env.MONDAY_BOARD_ID ?? 9613941689);
}

export const MONDAY_COL = {
  // --- confirmed ---
  etapa: "color_mksyb52r",
  valor: "numeric_mksykxx",
  dtFecha: "date_mksyxsgr",
  dtEntrada: "data",
  dtAgenda: "date_mkt23t3n",
  closer: "dropdown_mkt2ehgd",
  sdr: "dropdown_mkt2jm28",
  modelo: "color_mm5gmp1",
  origem: "color_mksy15sp",
  criativo: "text_mkv5psxz",
  direcao: "color_mkta1n92",

  // --- confirmed via --discover-columns (2026-08-06) ---
  empresa: "text_mksyegb",
  cargo: "text_mkwcgtgq",
  observacao: "text_mm47k9s0",
  qualificador: "color_mkwcsphe",
  whatsappTxt: "text_mktrk1js",
  insta: "text_mkwt6vkg",
  faturamentoMedioNum: "numeric_mksyvw71",
  faturamentoMedioTxt: "text_mkt3tj3e",
  vendedorOutrosProdutos: "dropdown_mksyk5bc",
  valorUnicoOutrosProdutos: "numeric_mksydyfq",
  email: "text_mkt2drvg",
  janelaFechamento: "formula_mkt5ncpw",
  nichos: "dropdown_mkt2n0b4",
  nichosTxt: "text_mkt3b375",
  comissao: "formula_mkt5hn2j", // not auto-populated into commissions — see migration script header
  campanha: "text_mkwt5gd8",
  publico: "text_mkv52h5w",
  formula: "formula_mkzt9fz6", // Monday "formula" column type — passthrough to raw_monday only
  leadIdAds: "text_mkv9hqh5",
  fbclid: "text_mm50wg33",
  statusColumn: "color_mm5a6fjc", // Monday's auto-created "Status" column, distinct from "Etapa" — meaning unconfirmed
} as const;

export type MondayColKey = keyof typeof MONDAY_COL;

export const UNMAPPED_PLACEHOLDER_KEYS = (Object.keys(MONDAY_COL) as MondayColKey[]).filter((key) => (MONDAY_COL[key] as string) === "");
