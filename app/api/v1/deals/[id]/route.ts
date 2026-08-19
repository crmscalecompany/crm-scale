import type { NextRequest } from "next/server";
import { resolveApiAuth, ApiAuthError } from "@/lib/api/auth";
import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api/response";
import { updateDealSchema } from "@/lib/api/schemas/deals";
import { getDeal, updateDeal } from "@/lib/data/deals";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await resolveApiAuth(request);
    const { id } = await params;

    const deal = await getDeal(db, id);
    if (!deal) return notFound("Negócio não encontrado.");

    return ok(deal);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[GET /api/v1/deals/:id]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await resolveApiAuth(request);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateDealSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const existing = await getDeal(db, id);
    if (!existing) return notFound("Negócio não encontrado.");

    const deal = await updateDeal(db, id, parsed.data);
    return ok(deal);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[PATCH /api/v1/deals/:id]", err);
    return serverError();
  }
}
