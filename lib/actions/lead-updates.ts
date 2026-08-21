"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listUpdatesByLeadId, createLeadUpdate, createLeadUpdateAttachment } from "@/lib/data/lead-updates";
import { getCurrentUserProfile } from "@/lib/data/users";

const ATTACHMENT_BUCKET = "lead-attachments";
// Signed URLs are generated fresh every list — an hour comfortably outlives
// how long the modal stays open in one sitting without handing out a link
// that's still valid days later.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Reads the history for the update modal (leads-table.tsx's new
// "Atualizações" column) — newest first, with each attachment's
// short-lived signed URL (the bucket is private, so a stored storage_path
// alone isn't fetchable from the browser).
export async function listLeadUpdatesAction(leadId: string) {
  const db = await createClient();
  const updates = await listUpdatesByLeadId(db, leadId);

  return Promise.all(
    updates.map(async (update) => ({
      ...update,
      lead_update_attachments: await Promise.all(
        update.lead_update_attachments.map(async (att) => {
          const { data } = await db.storage.from(ATTACHMENT_BUCKET).createSignedUrl(att.storage_path, SIGNED_URL_TTL_SECONDS);
          return { ...att, url: data?.signedUrl ?? null };
        })
      ),
    }))
  );
}

// `formData` carries `texto` (string) plus zero or more `arquivos` File
// entries — a plain object couldn't cross the server/client boundary with
// real File payloads attached. The update row is inserted first (its id
// is the storage path's second segment), then files upload, then the
// attachment rows point at where they landed — in that order, so a failed
// upload never leaves an attachment row pointing at nothing.
export async function createLeadUpdateAction(leadId: string, formData: FormData) {
  const db = await createClient();
  const profile = await getCurrentUserProfile(db);
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) throw new Error("Escreva algo antes de salvar.");

  const update = await createLeadUpdate(db, { lead_id: leadId, autor_id: profile?.id ?? null, texto });

  const files = formData.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const path = `${leadId}/${update.id}/${file.name}`;
    const { error: uploadError } = await db.storage.from(ATTACHMENT_BUCKET).upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    await createLeadUpdateAttachment(db, {
      update_id: update.id,
      nome_arquivo: file.name,
      storage_path: path,
      tamanho_bytes: file.size,
    });
  }

  revalidatePath("/crm");
  return update;
}
