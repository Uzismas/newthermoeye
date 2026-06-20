import { NextResponse } from "next/server";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";
import {
  apiError,
  getConsoleState,
  getDefaultReview,
  isSafeCaseId,
  noStoreHeaders,
  requireConsoleSession,
} from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

type CaseRouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(request: Request, context: CaseRouteContext) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const { caseId } = await context.params;
  if (!isSafeCaseId(caseId)) {
    return apiError("BAD_REQUEST", "Case id is invalid.", 400);
  }

  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);

  if (!caseRecord) {
    return apiError("NOT_FOUND", "Case was not found.", 404);
  }

  const review = state.reviews[caseId] ?? getDefaultReview(caseId, state.sessionUser.name);

  return NextResponse.json({
    caseRecord,
    clinicalClassification: getCaseClassification(caseRecord),
    review,
    releaseStatus: review.decision === "Approved for release" ? "ready" : "locked",
  }, { headers: noStoreHeaders() });
}
