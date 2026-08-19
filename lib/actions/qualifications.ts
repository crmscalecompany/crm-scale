"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createQualification } from "@/lib/data/qualifications";
import type { Database } from "@/lib/types/database.types";

type QualificationInsert = Database["public"]["Tables"]["qualifications"]["Insert"];

export async function createQualificationAction(input: Omit<QualificationInsert, "qualificado_por">) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const qualification = await createQualification(db, { ...input, qualificado_por: user.id });
  revalidatePath("/crm");
  return qualification;
}
