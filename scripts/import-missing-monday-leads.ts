// One-off import for Monday items that were never migrated at all — found
// while investigating a user report that fields/leads seemed to be missing
// (see scripts/backfill-monday-tipo-lp.ts's header for the sibling field-
// level gap). 209 of 7,617 Monday items have no matching leads.monday_item_id:
// 27 are direcao="Filter" (correctly excluded by design, see migrate-
// monday.ts) and ~183 are real "Scale"-direction leads (mostly niche
// "Advocacia", with real SDR/Closer names) that simply never made it in —
// almost certainly items that failed even after migrate-monday.ts's 3x
// retry during the original run and were never re-run afterward.
//
// Deliberately narrower than re-running migrate-monday.ts for real: this
// only ever calls writeItemToDb() for items whose monday_item_id doesn't
// exist in leads yet, so it can only INSERT — it never touches (and can't
// accidentally revert) any of the ~7,400 already-migrated leads, even
// though writeItemToDb's own upsert would otherwise overwrite manual CRM
// edits made since the original migration.
//
// Usage:
//   npm run import:missing-monday -- --dry-run   Prints what would be created
//   npm run import:missing-monday                Real run
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllItems, colText } from "@/lib/migration/monday-client";
import { MONDAY_COL } from "@/lib/migration/monday-columns";
import { resolveUserByName, unresolvedNames } from "@/lib/migration/resolve-user";
import { writeItemToDb, withRetry } from "./migrate-monday";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const includeFiltered = process.argv.includes("--include-filtered");
  const db = createAdminClient();

  const items = await fetchAllItems();

  const existingIds = new Set<number>();
  let offset = 0;
  for (;;) {
    const { data: page, error } = await db.from("leads").select("monday_item_id").not("monday_item_id", "is", null).range(offset, offset + 999);
    if (error) throw error;
    if (!page || page.length === 0) break;
    for (const row of page) if (row.monday_item_id) existingIds.add(row.monday_item_id);
    if (page.length < 1000) break;
    offset += 1000;
  }

  const missing = items.filter((item) => !existingIds.has(Number(item.id)));
  console.log(`${items.length} itens no Monday, ${existingIds.size} já migrados, ${missing.length} faltando.`);
  console.log(dryRun ? "(--dry-run: nada será escrito)\n" : "\n");

  let created = 0;
  let excludedFilter = 0;
  const failed: { id: string; name: string; error: string }[] = [];

  for (const item of missing) {
    const direcao = colText(item, MONDAY_COL.direcao);
    if (direcao === "Filter" && !includeFiltered) {
      excludedFilter++;
      continue;
    }

    const nicheName = colText(item, MONDAY_COL.nichos) || colText(item, MONDAY_COL.nichosTxt);
    const sdrId = await resolveUserByName(db, colText(item, MONDAY_COL.sdr));
    const closerName = colText(item, MONDAY_COL.closer);
    const closerId = await resolveUserByName(db, closerName);

    console.log(`  + ${item.id} "${item.name}" (${nicheName ?? "sem nicho"})`);
    if (dryRun) continue;

    try {
      await withRetry(() => writeItemToDb(db, item, nicheName, sdrId, closerId, closerName));
      created++;
    } catch (err) {
      failed.push({ id: item.id, name: item.name, error: err instanceof Error ? err.message : String(err) });
      console.error(`    falhou após retries:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n=== Resumo ===");
  console.log(dryRun ? "(dry-run — nada foi escrito)" : "(escrita real concluída)");
  console.log(`Leads criados: ${dryRun ? "(seriam) " + (missing.length - excludedFilter) : created}`);
  console.log(`Excluídos (Direção=Filter): ${excludedFilter}`);
  if (unresolvedNames.size > 0) {
    console.log(`\nNomes não resolvidos (${unresolvedNames.size}):`);
    for (const name of unresolvedNames) console.log(`  - ${name}`);
  }
  if (failed.length > 0) {
    console.log(`\nFalharam mesmo após retries (${failed.length}) — re-rode o script (idempotente por monday_item_id):`);
    for (const f of failed) console.log(`  - ${f.id} "${f.name}": ${f.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
