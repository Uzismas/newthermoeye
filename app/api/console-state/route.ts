import { NextResponse } from "next/server";
import { getConsoleState, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const state = getConsoleState();

  return NextResponse.json({
    auditEvents: state.auditEvents,
    cases: state.cases,
    reviews: state.reviews,
  }, { headers: noStoreHeaders() });
}
