import { NextResponse } from "next/server";
import { decorateStateCases, getConsoleState, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const state = getConsoleState();

  return NextResponse.json({
    auditEvents: state.auditEvents,
    cases: decorateStateCases(),
    reviews: state.reviews,
    actionStates: state.actionStates,
  }, { headers: noStoreHeaders() });
}
