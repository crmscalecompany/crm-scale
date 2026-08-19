import type { NextRequest } from "next/server";
import { resolveApiAuth, ApiAuthError } from "@/lib/api/auth";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api/response";
import { updateLeadSchema } from "@/lib/api/schemas/leads";
import { getLead, updateLead } from "@/lib/data/leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await resolveApiAuth(request);
    const { id } = await params;

    const lead = await getLead(db, id);
    if (!lead) return notFound("Lead não encontrado.");

    return ok(lead);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[GET /api/v1/leads/:id]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await resolveApiAuth(request);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const existing = await getLead(db, id);
    if (!existing) return notFound("Lead não encontrado.");

    const lead = await updateLead(db, id, parsed.data);
    return ok(lead);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[PATCH /api/v1/leads/:id]", err);
    return serverError();
  }
}
