import { NextResponse } from "next/server";
import { previewReset } from "@/features/clinical-console/server/persistence";
import {
  apiError,
  noStoreHeaders,
  requireConsoleSession,
  resetApprovedCase,
  restoreApprovedBackup,
} from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;
  const caseId = new URL(request.url).searchParams.get("caseId") ?? "";
  try {
    return NextResponse.json({ case: previewReset(caseId), storage: "private_local_approved_demo" }, { headers: noStoreHeaders() });
  } catch (error) {
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Demo storage preview failed.", 400);
  }
}

export async function POST(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;
  const body = await request.json().catch(() => null) as { action?: unknown; caseId?: unknown } | null;
  if (body?.action === "reset" && typeof body.caseId === "string") {
    try {
      const reset = resetApprovedCase(body.caseId);
      return NextResponse.json({ ok: reset, caseId: body.caseId }, { headers: noStoreHeaders() });
    } catch (error) {
      return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Demo reset failed.", 400);
    }
  }
  if (body?.action === "restore") {
    try {
      const restored = restoreApprovedBackup();
      return NextResponse.json({ ok: true, caseIds: restored.durableCaseIds }, { headers: noStoreHeaders() });
    } catch (error) {
      return apiError("CONFLICT", error instanceof Error ? error.message : "Demo restore failed.", 409);
    }
  }
  return apiError("BAD_REQUEST", "Use reset with an approved caseId or restore.", 400);
}
