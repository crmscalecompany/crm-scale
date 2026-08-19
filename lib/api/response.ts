import { NextResponse } from "next/server";

// Response envelope conventions for /api/v1/*: list endpoints return
// { data, meta }, single-resource endpoints return { data }, errors return
// { error, code? } with the matching HTTP status. Formalizes (without
// replacing) the ad hoc `{error: string}` pattern already used by the
// dashboard's own API routes.

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function list<T>(data: T[], meta: { total: number; limit: number; offset: number }) {
  return NextResponse.json({ data, meta });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

function errorResponse(status: number, error: string, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

export function badRequest(error: string, code?: string) {
  return errorResponse(400, error, code);
}

export function unauthorized(error = "Não autenticado.", code?: string) {
  return errorResponse(401, error, code);
}

export function forbidden(error = "Sem permissão.", code?: string) {
  return errorResponse(403, error, code);
}

export function notFound(error = "Não encontrado.", code?: string) {
  return errorResponse(404, error, code);
}

export function serverError(error = "Erro interno.", code?: string) {
  return errorResponse(500, error, code);
}
