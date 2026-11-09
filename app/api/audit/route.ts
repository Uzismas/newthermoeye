import { NextResponse } from "next/server";
import { addAudit, apiError, getConsoleState, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;

  if (typeof body?.message !== "string" || body.message.trim().length < 4 || body.message.length > 240) {
    return apiError("BAD_REQUEST", "Audit message is invalid.", 400);
  }

  const event = addAudit(body.message.trim());

  return NextResponse.json({ event, auditEvents: getConsoleState().auditEvents }, { headers: noStoreHeaders() });
}
