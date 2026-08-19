"use server";

import { createClient } from "@/lib/supabase/server";
import { createNiche } from "@/lib/data/niches";

// "Criar novo nicho" from the leads table's inline Nicho combobox. RLS
// (niches_insert) is admin-only, same as every other Tier A reference-data
// write — a non-admin's call fails there, surfaced generically like any
// other action error.
export async function createNicheAction(nome: string) {
  const db = await createClient();
  return createNiche(db, nome);
}
