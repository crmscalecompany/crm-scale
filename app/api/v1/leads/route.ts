import type { NextRequest } from "next/server";
import { resolveApiAuth, ApiAuthError } from "@/lib/api/auth";
import { badRequest, created, list, serverError, unauthorized } from "@/lib/api/response";
import { createLeadSchema, listLeadsQuerySchema } from "@/lib/api/schemas/leads";
import { createLead, listLeads } from "@/lib/data/leads";

export async function GET(request: NextRequest) {
  try {
    const { db } = await resolveApiAuth(request);

    const parsed = listLeadsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return badRequest("Parâmetros de busca inválidos.", parsed.error.issues[0]?.code);

    const { limit, offset, ...filters } = parsed.data;
    const { data, total } = await listLeads(db, { ...filters, limit, offset });

    return list(data, { total, limit, offset });
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[GET /api/v1/leads]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await resolveApiAuth(request);

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) return badRequest("Payload inválido.", parsed.error.issues[0]?.code);

    const lead = await createLead(db, parsed.data);
    return created(lead);
  } catch (err) {
    if (err instanceof ApiAuthError) return unauthorized(err.message);
    console.error("[POST /api/v1/leads]", err);
    return serverError();
  }
}
