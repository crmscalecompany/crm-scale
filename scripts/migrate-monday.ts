// Monday.com -> Supabase migration (blueprint §4.8).
//
// Usage:
//   npm run migrate:monday -- --discover-columns          Step 0: print real column ids (requires MONDAY_TOKEN)
//   npm run migrate:monday -- --dry-run                    Maps everything, writes nothing, prints summary counts
//   npm run migrate:monday -- --exclude-niche="Live Coach" Real run, skipping one or more niches
//   npm run migrate:monday -- --include-filtered           Real run, including Direção="Filter" (junk/test) rows
//   npm run migrate:monday -- --env-file=.env.staging.local  Point at a specific env file (defaults to .env.local)
//
// Safe to re-run: leads are upserted on monday_item_id (unique), deals are
// found-or-created by lead_id, and lead_attribution/deal_products rows are
// replaced (delete + insert) rather than accumulated on each run.
//
// Column mapping and its open questions (Subelementos -> deal_products,
// the unmapped "Status" column, "Comissão" not auto-populated) are
// documented in lib/migration/monday-columns.ts and the Week 1 plan.
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverColumns, fetchAllItems, colText } from "@/lib/migration/monday-client";
import { MONDAY_COL, UNMAPPED_PLACEHOLDER_KEYS, getMondayBoardId } from "@/lib/migration/monday-columns";
import { ETAPA_MAPPING, DEFAULT_ETAPA_MAPPING } from "@/lib/migration/etapa-mapping";
import { resolveUserByName, unresolvedNames } from "@/lib/migration/resolve-user";
import type { Json } from "@/lib/types/database.types";

interface Flags {
  dryRun: boolean;
  discoverColumnsMode: boolean;
  includeFiltered: boolean;
  excludeNiches: Set<string>;
}

function parseFlags(argv: string[]): Flags {
  const excludeNiches = new Set<string>();
  for (const arg of argv) {
    if (arg.startsWith("--exclude-niche=")) excludeNiches.add(arg.slice("--exclude-niche=".length));
  }
  return {
    dryRun: argv.includes("--dry-run"),
    discoverColumnsMode: argv.includes("--discover-columns"),
    includeFiltered: argv.includes("--include-filtered"),
    excludeNiches,
  };
}

function envFileFromArgv(argv: string[]): string {
  const match = argv.find((a) => a.startsWith("--env-file="));
  return match ? match.slice("--env-file=".length) : ".env.local";
}

dotenv.config({ path: envFileFromArgv(process.argv.slice(2)) });

function parseNumber(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

// Monday's column_values text for date columns comes back as "YYYY-MM-DD"
// (or "YYYY-MM-DD HH:mm:ss" for datetime columns) — already ISO-ish, just
// strip any time component to match our `date` columns (data_agendamento,
// data_fechamento).
function parseMondayDate(text: string | null): string | null {
  if (!text) return null;
  return text.split(" ")[0] || null;
}

// criado_em ("Data Entrada") is a timestamptz — preserve Monday's time
// component when the column actually has one ("YYYY-MM-DD HH:mm:ss"),
// otherwise fall back to midnight UTC for the plain-date rows (Monday's
// "Data Entrada" column is date-only for most historical items).
function parseMondayDateTime(text: string | null): string | null {
  if (!text) return null;
  const parsed = new Date(text.includes(" ") ? text.replace(" ", "T") + "Z" : `${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// A 7421-item run takes long enough (tens of minutes, one item at a time)
// that a single transient network hiccup (DNS blip, connect timeout) will
// happen — and without this, it kills the whole run partway through (as it
// did on the first real attempt: died at item ~1200 on a Supabase connect
// timeout). Retries the item's whole write sequence up to 3x with backoff;
// if it still fails, the item is skipped (not the run) and reported at the
// end — safe because the migration is idempotent on monday_item_id, so a
// second pass over just the failed items is a normal re-run.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
    }
  }
  throw lastErr;
}

async function runDiscovery() {
  console.log(`Descobrindo colunas do board ${getMondayBoardId()}...\n`);
  const columns = await discoverColumns();
  for (const col of columns) {
    console.log(`${col.id}\t${col.type}\t${col.title}`);
  }
  console.log(`\n${columns.length} colunas encontradas. Preencha lib/migration/monday-columns.ts com os ids reais.`);
}

export type AdminClient = ReturnType<typeof createAdminClient>;

async function upsertNiche(db: AdminClient, name: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();

  const { data: existing, error: findError } = await db.from("niches").select("id").ilike("nome", trimmed).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await db.from("niches").insert({ nome: trimmed }).select("id").single();
  if (createError) throw createError;
  return created.id;
}

interface Summary {
  leadsUpserted: number;
  dealsUpserted: number;
  dealProductsInserted: number;
  excludedFilter: number;
  excludedNiche: number;
  byNiche: Map<string, number>;
  failedItems: { id: string; name: string; error: string }[];
}

interface ItemWriteResult {
  leads: number;
  deals: number;
  dealProducts: number;
}

// The actual write sequence for one item — extracted so it can be wrapped
// in withRetry() + a per-item try/catch in the main loop (see withRetry's
// comment for why: a multi-thousand-item run WILL hit a transient network
// error, and one item's failure shouldn't take down the other ~7000).
export async function writeItemToDb(
  db: AdminClient,
  item: Awaited<ReturnType<typeof fetchAllItems>>[number],
  nicheName: string | null,
  sdrId: string | null,
  closerId: string | null,
  closerName: string | null
): Promise<ItemWriteResult> {
  const result: ItemWriteResult = { leads: 0, deals: 0, dealProducts: 0 };
  const direcao = colText(item, MONDAY_COL.direcao);
  const nicheId = await upsertNiche(db, nicheName);

  const etapaRaw = colText(item, MONDAY_COL.etapa);
  const mapping = (etapaRaw && ETAPA_MAPPING[etapaRaw]) || DEFAULT_ETAPA_MAPPING;

  const { data: leadRow, error: leadError } = await db
    .from("leads")
    .upsert(
      {
        nome: item.name,
        empresa: colText(item, MONDAY_COL.empresa),
        cargo: colText(item, MONDAY_COL.cargo),
        whatsapp_txt: colText(item, MONDAY_COL.whatsappTxt),
        email: colText(item, MONDAY_COL.email),
        insta: colText(item, MONDAY_COL.insta),
        niche_id: nicheId,
        origem: colText(item, MONDAY_COL.origem),
        direcao,
        tipo: colText(item, MONDAY_COL.tipo),
        qualificador: colText(item, MONDAY_COL.qualificador),
        observacao: colText(item, MONDAY_COL.observacao),
        owner_sdr_id: sdrId,
        faturamento_medio: parseNumber(colText(item, MONDAY_COL.faturamentoMedioNum)),
        faturamento_medio_label: colText(item, MONDAY_COL.faturamentoMedioTxt),
        status: mapping.leadStatus,
        criado_em: parseMondayDateTime(colText(item, MONDAY_COL.dtEntrada)),
        monday_item_id: Number(item.id),
        raw_monday: item as unknown as Json,
      },
      { onConflict: "monday_item_id" }
    )
    .select("id")
    .single();
  if (leadError) throw leadError;
  result.leads = 1;

  // Attribution: replace rather than accumulate on re-run.
  await db.from("lead_attribution").delete().eq("lead_id", leadRow.id);
  await db.from("lead_attribution").insert({
    lead_id: leadRow.id,
    campanha: colText(item, MONDAY_COL.campanha),
    publico: colText(item, MONDAY_COL.publico),
    criativo: colText(item, MONDAY_COL.criativo),
    fbclid: colText(item, MONDAY_COL.fbclid),
    lead_id_ads: colText(item, MONDAY_COL.leadIdAds),
    lp: colText(item, MONDAY_COL.lp),
  });

  // Presence of a Closer — not the etapa text — is the signal a deals row
  // should exist at all (see blueprint §7 mapping table / lib/migration/etapa-mapping.ts).
  if (closerName) {
    const modeloRaw = colText(item, MONDAY_COL.modelo);

    const dealPayload = {
      lead_id: leadRow.id,
      closer_id: closerId,
      status: mapping.dealStatus ?? ("em_negociacao" as const),
      valor_bruto: parseNumber(colText(item, MONDAY_COL.valor)),
      modelo: (modeloRaw === "TCV" || modeloRaw === "MRR" ? modeloRaw : null) as "TCV" | "MRR" | null,
      data_agendamento: parseMondayDate(colText(item, MONDAY_COL.dtAgenda)),
      data_fechamento: parseMondayDate(colText(item, MONDAY_COL.dtFecha)),
      janela_fechamento: colText(item, MONDAY_COL.janelaFechamento),
      raw_monday: item as unknown as Json,
    };

    // No monday_item_id on deals in the Week 1 schema — idempotency here
    // is find-or-create by lead_id (one deal per lead is the Week 1
    // assumption; revisit if the real board ever shows re-opened deals).
    const { data: existingDeal, error: findDealError } = await db.from("deals").select("id").eq("lead_id", leadRow.id).maybeSingle();
    if (findDealError) throw findDealError;

    let dealId: string;
    if (existingDeal) {
      const { error: updateError } = await db.from("deals").update(dealPayload).eq("id", existingDeal.id);
      if (updateError) throw updateError;
      dealId = existingDeal.id;
    } else {
      const { data: createdDeal, error: insertError } = await db.from("deals").insert(dealPayload).select("id").single();
      if (insertError) throw insertError;
      dealId = createdDeal.id;
    }
    result.deals = 1;

    // Subelementos -> deal_products (provisional — see monday-client.ts).
    await db.from("deal_products").delete().eq("deal_id", dealId);

    if (item.subitems.length > 0) {
      const rows = item.subitems.map((sub) => ({ deal_id: dealId, produto: sub.name }));
      const { error: subError } = await db.from("deal_products").insert(rows);
      if (subError) throw subError;
      result.dealProducts += rows.length;
    }

    const vendedorOutros = colText(item, MONDAY_COL.vendedorOutrosProdutos);
    const valorOutros = parseNumber(colText(item, MONDAY_COL.valorUnicoOutrosProdutos));
    if (vendedorOutros || valorOutros) {
      const vendedorId = await resolveUserByName(db, vendedorOutros);
      const { error: outrosError } = await db.from("deal_products").insert({
        deal_id: dealId,
        produto: "Outros",
        vendedor_id: vendedorId,
        valor_bruto: valorOutros,
      });
      if (outrosError) throw outrosError;
      result.dealProducts += 1;
    }
  }

  return result;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.discoverColumnsMode) {
    await runDiscovery();
    return;
  }

  if (!flags.dryRun && UNMAPPED_PLACEHOLDER_KEYS.length > 0) {
    console.error(
      `Recusando rodar uma migração real: ${UNMAPPED_PLACEHOLDER_KEYS.length} coluna(s) do Monday ainda sem id confirmado (${UNMAPPED_PLACEHOLDER_KEYS.join(", ")}).\n` +
        `Rode "npm run migrate:monday -- --discover-columns" e preencha lib/migration/monday-columns.ts primeiro, ou use --dry-run para uma prévia com os campos já confirmados.`
    );
    process.exit(1);
  }

  const db = createAdminClient();
  const items = await fetchAllItems();
  console.log(`${items.length} itens encontrados no board ${getMondayBoardId()}.${flags.dryRun ? " (--dry-run: nada será escrito)" : ""}\n`);

  const summary: Summary = {
    leadsUpserted: 0,
    dealsUpserted: 0,
    dealProductsInserted: 0,
    excludedFilter: 0,
    excludedNiche: 0,
    byNiche: new Map(),
    failedItems: [],
  };

  let processed = 0;

  for (const item of items) {
    const direcao = colText(item, MONDAY_COL.direcao);
    if (direcao === "Filter" && !flags.includeFiltered) {
      summary.excludedFilter++;
      continue;
    }

    const nicheName = colText(item, MONDAY_COL.nichos) || colText(item, MONDAY_COL.nichosTxt);

    if (nicheName && flags.excludeNiches.has(nicheName)) {
      summary.excludedNiche++;
      continue;
    }

    const nicheKey = nicheName ?? "(sem nicho)";
    summary.byNiche.set(nicheKey, (summary.byNiche.get(nicheKey) ?? 0) + 1);

    // Read-only lookups (no writes) — safe and useful to run even in
    // --dry-run, so the unresolved-names summary is accurate for the
    // niche-inclusion / user-onboarding decision this is meant to inform.
    const sdrId = await resolveUserByName(db, colText(item, MONDAY_COL.sdr));
    const closerName = colText(item, MONDAY_COL.closer);
    const closerId = await resolveUserByName(db, closerName);

    if (flags.dryRun) continue;

    try {
      const result = await withRetry(() => writeItemToDb(db, item, nicheName, sdrId, closerId, closerName));
      summary.leadsUpserted += result.leads;
      summary.dealsUpserted += result.deals;
      summary.dealProductsInserted += result.dealProducts;
    } catch (err) {
      summary.failedItems.push({ id: item.id, name: item.name, error: err instanceof Error ? err.message : String(err) });
      console.error(`  [item ${item.id} "${item.name}"] falhou após retries, pulando:`, err instanceof Error ? err.message : err);
    }

    processed++;
    if (processed % 200 === 0) {
      console.log(`  ... ${processed}/${items.length} processados (${summary.leadsUpserted} leads, ${summary.dealsUpserted} deals, ${summary.failedItems.length} falhas)`);
    }
  }

  console.log("=== Resumo da migração ===");
  console.log(flags.dryRun ? "(dry-run — nada foi escrito)" : "(escrita real concluída)");
  console.log(`Leads: ${summary.leadsUpserted}`);
  console.log(`Deals: ${summary.dealsUpserted}`);
  console.log(`Deal products: ${summary.dealProductsInserted}`);
  console.log(`Excluídos (Direção=Filter): ${summary.excludedFilter}`);
  console.log(`Excluídos (nicho na --exclude-niche): ${summary.excludedNiche}`);
  console.log("\nPor nicho:");
  for (const [niche, count] of summary.byNiche) console.log(`  ${niche}: ${count}`);

  if (unresolvedNames.size > 0) {
    console.log(`\nNomes não resolvidos (${unresolvedNames.size}) — sem usuário correspondente em public.users:`);
    for (const name of unresolvedNames) console.log(`  - ${name}`);
    console.log("Esses itens migram com owner_sdr_id/closer_id/vendedor_id nulos (nome preservado em raw_monday).");
  }

  if (summary.failedItems.length > 0) {
    console.log(`\nItens que falharam mesmo após retries (${summary.failedItems.length}) — re-rode o script para tentar de novo (idempotente):`);
    for (const f of summary.failedItems) console.log(`  - ${f.id} "${f.name}": ${f.error}`);
  }
}

// Guarded — this module is also `import`ed for its writeItemToDb/withRetry
// exports (see scripts/import-missing-monday-leads.ts) now that it isn't
// the only script touching Monday data. Without this check, importing them
// silently re-ran this whole file's main() too — including a real,
// destructive re-migration of all ~7,600 leads if the importing script
// wasn't itself passed --dry-run (caught during testing: it happened to
// inherit --dry-run from shared process.argv, or it would have).
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
