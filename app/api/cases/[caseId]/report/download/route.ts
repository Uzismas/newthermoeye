import { NextResponse } from "next/server";
import { getCaseClassification } from "@/features/clinical-console/clinical-analysis";
import { canReleaseResearchReport } from "@/features/clinical-console/case-state";
import { buildReportPdf } from "@/features/clinical-console/server/report-pdf";
import {
  addAudit,
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

export async function POST(request: Request, context: CaseRouteContext) {
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
  const classification = getCaseClassification(caseRecord);

  if (!canReleaseResearchReport(caseRecord)) {
    return apiError("FORBIDDEN", "Blocked or unavailable analysis cannot produce a released research report PDF.", 403);
  }

  if (review.decision !== "Approved for release") {
    return apiError("FORBIDDEN", "Doctor approval is required before downloading a report PDF.", 403);
  }

  let report;
  try { report = buildReportPdf({ caseRecord, classification, review }); }
  catch (error) { return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Report generation failed.", 422); }
  addAudit(`Research PDF downloaded for ${caseId}`);

  return new NextResponse(report.bytes, {
    status: 200,
    headers: noStoreHeaders({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
      "X-Report-Number": report.reportNumber,
    }),
  });
}
