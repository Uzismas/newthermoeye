import { NextResponse } from "next/server";
import { buildInsightsPdf } from "@/features/clinical-console/server/insights-pdf";
import { addAudit, apiError, getConsoleState, isSafeCaseId, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const payload = await request.json().catch(() => null) as { caseId?: unknown; imageDataUrl?: unknown } | null;
  const caseId = typeof payload?.caseId === "string" ? payload.caseId : "";
  if (!isSafeCaseId(caseId)) return apiError("BAD_REQUEST", "Case id is invalid.", 400);

  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);
  if (!caseRecord) return apiError("NOT_FOUND", "Case was not found.", 404);

  const imageDataUrl = typeof payload?.imageDataUrl === "string" && payload.imageDataUrl.length <= 8_000_000
    ? payload.imageDataUrl
    : undefined;
  let report;
  try { report = buildInsightsPdf({ caseRecord, imageDataUrl }); }
  catch (error) { return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Report generation failed.", 422); }
  addAudit(`Insights PDF downloaded for ${caseId}${imageDataUrl ? " with uploaded scan" : ""}`);

  return new NextResponse(report.bytes, {
    status: 200,
    headers: noStoreHeaders({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
      "X-Report-Number": report.reportNumber,
    }),
  });
}
