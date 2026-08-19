"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMeetingStatus } from "@/lib/data/meetings";
import type { MeetingStatus } from "@/lib/types/database.types";

export async function updateMeetingStatusAction(meetingId: string, status: MeetingStatus) {
  const db = await createClient();
  const meeting = await updateMeetingStatus(db, meetingId, status);
  revalidatePath("/crm");
  return meeting;
}
