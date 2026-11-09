import { NextResponse } from "next/server";
import { buildDicomExport } from "@/features/clinical-console/server/dicom-export";
import { addAudit, apiError, getConsoleState, isSafeCaseId, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const { caseId } = await context.params;
  if (!isSafeCaseId(caseId)) return apiError("BAD_REQUEST", "Case id is invalid.", 400);
  const state = getConsoleState();
  const caseRecord = state.cases.find((item) => item.id === caseId);
  if (!caseRecord) return apiError("NOT_FOUND", "Case was not found.", 404);

  const exportFile = buildDicomExport(caseRecord);
  addAudit(`De-identified DICOM metadata exported for ${caseId}`);
  return new NextResponse(exportFile.bytes, {
    headers: noStoreHeaders({
      "Content-Type": "application/dicom",
      "Content-Disposition": `attachment; filename="${exportFile.fileName}"`,
    }),
  });
}
