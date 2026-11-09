import { NextResponse } from "next/server";
import {
  addAudit,
  apiError,
  getConsoleState,
  isSafeCaseId,
  noStoreHeaders,
  requireConsoleSession,
  resetApprovedCase,
} from "@/features/clinical-console/server/store";
import type { CaseAction, CaseActionState } from "@/features/clinical-console/types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: Context) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const { caseId } = await context.params;
  if (!isSafeCaseId(caseId)) return apiError("BAD_REQUEST", "Case id is invalid.", 400);

  const state = getConsoleState();
  if (!state.cases.some((item) => item.id === caseId)) return apiError("NOT_FOUND", "Case was not found.", 404);

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "add_to_patient" && body?.action !== "second_review" && body?.action !== "delete_scan") {
    return apiError("BAD_REQUEST", "Case action is invalid.", 400);
  }

  const action = body.action as CaseAction;
  if (action === "delete_scan") {
    if (state.durableCaseIds.includes(caseId)) resetApprovedCase(caseId);
    else {
      state.cases = state.cases.filter((item) => item.id !== caseId);
      delete state.reviews[caseId];
      delete state.actionStates[caseId];
    }
    addAudit(`Scan ${caseId} deleted by ${state.sessionUser.name}`);
  } else {
    const current = state.actionStates[caseId] ?? {};
    const next: CaseActionState = {
      ...current,
      ...(action === "add_to_patient" ? { patientRecordAdded: true } : { secondReviewRequested: true }),
      updatedAt: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    };
    state.actionStates[caseId] = next;
    if (action === "second_review") {
      state.reviews[caseId] = {
        decision: "Follow-up required",
        note: "Second clinician review requested before report release.",
        reviewer: state.sessionUser.name,
        followUpWindow: "30 days",
        updatedAt: next.updatedAt ?? "Pending",
      };
    }
    addAudit(
      action === "add_to_patient"
        ? `Case ${caseId} added to patient record by ${state.sessionUser.name}`
        : `Second review requested for ${caseId} by ${state.sessionUser.name}`,
    );
  }

  return NextResponse.json({
    actionStates: state.actionStates,
    cases: state.cases,
    reviews: state.reviews,
    auditEvents: state.auditEvents,
  }, { headers: noStoreHeaders() });
}
