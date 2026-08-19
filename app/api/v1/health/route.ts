import { NextResponse } from "next/server";

// Unauthenticated on purpose — lets the dashboard/monitoring confirm the
// CRM is reachable at all before debugging auth.
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
