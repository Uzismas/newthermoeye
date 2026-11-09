import { NextResponse } from "next/server";
import { getPrivateAsset } from "@/features/clinical-console/server/persistence";
import { apiError, isSafeCaseId, noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ caseId: string; asset: string }> }) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;
  const { caseId, asset } = await context.params;
  if (!isSafeCaseId(caseId) || (asset !== "source" && asset !== "mask")) {
    return apiError("BAD_REQUEST", "Private demo asset path is invalid.", 400);
  }
  const result = getPrivateAsset(caseId, asset);
  if (!result.ok) return apiError(result.code === "CORRUPT" ? "CONFLICT" : "NOT_FOUND", result.message, result.code === "CORRUPT" ? 409 : 404);
  return new NextResponse(result.bytes, {
    status: 200,
    headers: noStoreHeaders({ "Content-Type": result.mime, "Content-Length": String(result.bytes.length), "X-Content-Integrity": "sha256" }),
  });
}
