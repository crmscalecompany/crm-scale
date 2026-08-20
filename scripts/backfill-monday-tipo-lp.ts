// One-off backfill for two Monday columns ("Tipo" and "LP") that were
// missing from the original migration's column map (MONDAY_COL) — see
// lib/migration/monday-columns.ts's 2026-08-20 comment. scripts/migrate-
// monday.ts now captures both for *future* runs, but re-running that whole
// script against the ~7,600 already-migrated leads would overwrite every
// other field (status, owner_sdr_id, niche_id, ...) with whatever Monday
// currently has — silently reverting any manual edit made in the CRM since
// the original migration. This script only ever touches leads.tipo and
// lead_attribution.lp, by monday_item_id, leaving everything else alone.
//
// Usage:
//   npm run backfill:monday-tipo-lp -- --dry-run   Prints counts, writes nothing
//   npm run backfill:monday-tipo-lp                Real run
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllItems, colText } from "@/lib/migration/monday-client";
import { MONDAY_COL } from "@/lib/migration/monday-columns";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = createAdminClient();

  const items = await fetchAllItems();
  console.log(`${items.length} itens encontrados no Monday.${dryRun ? " (--dry-run: nada será escrito)" : ""}\n`);

  let tipoUpdated = 0;
  let lpUpdated = 0;
  let leadNotFound = 0;
  let attributionMissing = 0;
  const tipoCounts: Record<string, number> = {};

  for (const item of items) {
    const tipo = colText(item, MONDAY_COL.tipo);
    const lp = colText(item, MONDAY_COL.lp);
    if (!tipo && !lp) continue;

    const { data: lead, error: leadFindError } = await db
      .from("leads")
      .select("id")
      .eq("monday_item_id", Number(item.id))
      .maybeSingle();
    if (leadFindError) throw leadFindError;
    if (!lead) {
      leadNotFound++;
      continue;
    }

    if (tipo) {
      tipoCounts[tipo] = (tipoCounts[tipo] ?? 0) + 1;
      if (!dryRun) {
        const { error } = await db.from("leads").update({ tipo }).eq("id", lead.id);
        if (error) throw error;
      }
      tipoUpdated++;
    }

    if (lp) {
      if (!dryRun) {
        const { data: attrRow, error: attrFindError } = await db
          .from("lead_attribution")
          .select("id")
          .eq("lead_id", lead.id)
          .maybeSingle();
        if (attrFindError) throw attrFindError;
        if (attrRow) {
          const { error } = await db.from("lead_attribution").update({ lp }).eq("id", attrRow.id);
          if (error) throw error;
        } else {
          // Every migrated lead gets a lead_attribution row today (see
          // migrate-monday.ts), but guard anyway rather than assume it.
          attributionMissing++;
          const { error } = await db.from("lead_attribution").insert({ lead_id: lead.id, lp });
          if (error) throw error;
        }
      }
      lpUpdated++;
    }
  }

  console.log("=== Resumo do backfill ===");
  console.log(dryRun ? "(dry-run — nada foi escrito)" : "(escrita real concluída)");
  console.log(`leads.tipo atualizado: ${tipoUpdated}`);
  console.log(`lead_attribution.lp atualizado: ${lpUpdated}`);
  console.log(`Itens do Monday sem lead correspondente (monday_item_id não encontrado): ${leadNotFound}`);
  console.log(`lead_attribution criado do zero (não deveria acontecer, mas coberto): ${attributionMissing}`);
  console.log("\nDistribuição de Tipo:");
  for (const [value, count] of Object.entries(tipoCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${value}: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
