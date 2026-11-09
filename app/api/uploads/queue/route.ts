import { NextResponse } from "next/server";
import { validateUploadedCase } from "@/features/clinical-console/case-state";
import { verifyAnalysis } from "@/features/clinical-console/server/analysis-receipt";
import { detectImageMime, mimeMatches, MAX_IMAGE_BYTES } from "@/features/clinical-console/image-input";
import {
  addAudit,
  apiError,
  getConsoleState,
  noStoreHeaders,
  requireConsoleSession,
  insertCase,
} from "@/features/clinical-console/server/store";
import { isApprovedDemoCase, takeTransientAsset, PersistenceError } from "@/features/clinical-console/server/persistence";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionError = requireConsoleSession(request);
  if (sessionError) return sessionError;

  const parsed = await readQueueBody(request);
  const result = validateUploadedCase(parsed.caseRecord);
  if (!result.ok) return apiError("BAD_REQUEST", result.message, 400);
  if (!verifyAnalysis(result.caseRecord.analysisMetrics!.visionResult!, parsed.caseRecord?.analysisReceipt)) {
    return apiError("BAD_REQUEST", "Analysis receipt is invalid or expired. Analyze this image again.", 400);
  }
  const approvedMode = parsed.persistApprovedDemo === true && isApprovedDemoCase(result.caseRecord.id);
  let approvedDemo: { source: Buffer; sourceMime: string; mask?: Buffer; maskMime?: string } | undefined;
  if (approvedMode) {
    const transientAsset = takeTransientAsset(result.caseRecord.analysisMetrics?.visionResult?.fileHash);
    const source = parsed.sourceBytes
      ? { source: parsed.sourceBytes, sourceMime: parsed.sourceMime ?? "application/octet-stream" }
      : transientAsset;
    if (!source) return apiError("CONFLICT", "Approved demo persistence requires the original source asset in the same upload operation.", 409);
    const detectedMime = detectImageMime(new Uint8Array(source.source));
    if (!detectedMime || !mimeMatches(source.sourceMime, detectedMime) || source.source.length > MAX_IMAGE_BYTES) {
      return apiError("BAD_REQUEST", "Approved demo source bytes are invalid or exceed the image policy.", 400);
    }
    const mask = parsed.caseRecord?.analysisMetrics && typeof parsed.caseRecord.analysisMetrics === "object"
      ? (parsed.caseRecord.analysisMetrics as { visionResult?: { segmentationMaskDataUrl?: unknown } }).visionResult?.segmentationMaskDataUrl
      : undefined;
    const parsedMask = typeof mask === "string" ? decodeMask(mask) : transientAsset?.mask ? { bytes: transientAsset.mask, mime: transientAsset.maskMime ?? "image/png" } : undefined;
    approvedDemo = { source: source.source, sourceMime: detectedMime, mask: parsedMask?.bytes, maskMime: parsedMask?.mime };
  }
  let caseRecord;
  try {
    caseRecord = insertCase(result.caseRecord, approvedDemo ? { approvedDemo } : undefined);
  } catch (error) {
    if (error instanceof PersistenceError) {
      const status = error.code === "STORAGE_WRITE_FAILED" ? 503 : error.code === "APPROVAL_REQUIRED" ? 403 : 400;
      return apiError(status === 503 ? "CONFLICT" : "BAD_REQUEST", error.message, status);
    }
    throw error;
  }
  if (!caseRecord) return apiError("CONFLICT", "A case with this id already exists. Use a new case id.", 409);
  addAudit(`Research analysis saved for ${caseRecord.id} ${approvedDemo ? "as an approved private demo case" : "in temporary prototype memory"}`);

  return NextResponse.json({
    status: "saved",
    label: approvedDemo ? "Approved demo result saved in private local storage" : "Research result saved for this server session",
    caseRecord,
    storage: { mode: approvedDemo ? "private_local_approved_demo" : "single_process_memory", durable: Boolean(approvedDemo), imagesStored: Boolean(approvedDemo) },
    auditEvents: getConsoleState().auditEvents,
  }, { status: 201, headers: noStoreHeaders() });
}

async function readQueueBody(request: Request): Promise<{
  caseRecord: Record<string, unknown> | null;
  persistApprovedDemo?: boolean;
  sourceBytes?: Buffer;
  sourceMime?: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const rawCase = form?.get("caseRecord");
    let caseRecord: Record<string, unknown> | null = null;
    const rawCaseText = typeof rawCase === "string" ? rawCase : rawCase instanceof File ? await rawCase.text() : null;
    try { caseRecord = rawCaseText ? JSON.parse(rawCaseText) : null; } catch { caseRecord = null; }
    const source = form?.get("source");
    const sourceBytes = source instanceof File ? Buffer.from(await source.arrayBuffer()) : undefined;
    return { caseRecord: caseRecord?.caseRecord && typeof caseRecord.caseRecord === "object" ? caseRecord.caseRecord as Record<string, unknown> : caseRecord, persistApprovedDemo: form?.get("persistApprovedDemo") === "true", sourceBytes, sourceMime: source instanceof File ? source.type : undefined };
  }
  const body = await request.json().catch(() => null) as { caseRecord?: Record<string, unknown>; persistApprovedDemo?: boolean; sourceBase64?: string; sourceMime?: string } | null;
  return { caseRecord: body?.caseRecord ?? null, persistApprovedDemo: body?.persistApprovedDemo, sourceBytes: body?.sourceBase64 ? Buffer.from(body.sourceBase64, "base64") : undefined, sourceMime: body?.sourceMime };
}

function decodeMask(value: string) {
  const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return undefined;
  const bytes = Buffer.from(match[2], "base64");
  return bytes.length > 0 && bytes.length <= 2 * 1024 * 1024 ? { bytes, mime: match[1] } : undefined;
}
