import type { NextRequest } from "next/server";
import { resolveApiAuth, ApiAuthError } from "@/lib/api/auth";
import { badRequest, created, list, serverError, unauthorized } from "@/lib/api/response";
import { createDealSchema, listDealsQuerySchema } from "@/lib/api/schemas/deals";
import { createDeal, listDeals } from "@/lib/data/deals";

export async function GET(request: NextRequest) {
  try {
    const { db } = await resolveApiAuth(request);

    const parsed = listDealsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return badRequest("Parâmetros de busca inválidos.", parsed.error.issues[0]?.code);

    const { limit, offset, ...filters } = parsed.data;
    const { data, total } = await listDeals(db, { ...filters, limit, offset });

    return list(data, { total, limit, offset });
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[GET /api/v1/deals]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await resolveApiAuth(request);

    const body = await request.json();
    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const deal = await createDeal(db, parsed.data);
    return created(deal);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/deals]", err);
    return serverError();
  }
}
