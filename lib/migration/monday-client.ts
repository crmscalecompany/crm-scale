import { MONDAY_COL, getMondayBoardId } from "@/lib/migration/monday-columns";

const MONDAY_API_URL = "https://api.monday.com/v2";
const PAGE_SIZE = 500;

export interface MondayColumnValue {
  id: string;
  text: string | null;
}

export interface MondaySubitem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
  subitems: MondaySubitem[];
}

interface MondayItemsPage {
  cursor: string | null;
  items: MondayItem[];
}

interface MondayGqlResponse {
  next_items_page?: MondayItemsPage;
  boards?: { items_page?: MondayItemsPage; columns?: { id: string; title: string; type: string }[] }[];
}

async function mondayGql(query: string): Promise<MondayGqlResponse> {
  const token = process.env.MONDAY_TOKEN;
  if (!token) throw new Error("MONDAY_TOKEN não configurado.");

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Monday API HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "Erro desconhecido na API do Monday.");
  return json.data;
}

// Step 0 (must run first) — see lib/migration/monday-columns.ts. Prints the
// board's real column ids/titles/types so the ~24 unconfirmed entries in
// MONDAY_COL can be filled in correctly rather than guessed at.
export async function discoverColumns() {
  const data = await mondayGql(`query { boards(ids: [${getMondayBoardId()}]) { columns { id title type } } }`);
  return data.boards?.[0]?.columns ?? [];
}

// Full board re-fetch every run — there's no clean "updated since X" filter
// to page against (an item's etapa can change independent of any date
// column), same rationale as the dashboard's own sync. Extended with a
// `subitems` sub-selection for "Subelementos" (see migration script header
// for the provisional subitems -> deal_products mapping).
export async function fetchAllItems(): Promise<MondayItem[]> {
  const items: MondayItem[] = [];
  let cursor: string | null = null;
  const colsList = Object.values(MONDAY_COL)
    .filter(Boolean)
    .map((c) => `"${c}"`)
    .join(",");

  do {
    const query: string = cursor
      ? `query {
          next_items_page(limit: ${PAGE_SIZE}, cursor: "${cursor}") {
            cursor
            items {
              id
              name
              column_values(ids: [${colsList}]) { id text }
              subitems { id name column_values { id text } }
            }
          }
        }`
      : `query {
          boards(ids: [${getMondayBoardId()}]) {
            items_page(limit: ${PAGE_SIZE}) {
              cursor
              items {
                id
                name
                column_values(ids: [${colsList}]) { id text }
                subitems { id name column_values { id text } }
              }
            }
          }
        }`;

    const data = await mondayGql(query);
    const page: MondayItemsPage | undefined = cursor ? data.next_items_page : data.boards?.[0]?.items_page;
    if (!page) throw new Error("Resposta inesperada da API do Monday (items_page ausente).");
    items.push(...page.items);
    cursor = page.cursor;
  } while (cursor);

  return items;
}

export function colText(item: MondayItem, colId: string): string | null {
  if (!colId) return null;
  return item.column_values.find((c) => c.id === colId)?.text || null;
}
