import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { noStoreHeaders, requireConsoleSession } from "@/features/clinical-console/server/store";
import { normalizeAnalysis, normalizeLocalResult, unavailableAnalysis } from "@/features/clinical-console/analysis-contract";
import { detectImageMime, mimeMatches, MAX_IMAGE_BYTES, NON_OCT_FILENAME } from "@/features/clinical-console/image-input";
import type { VisionResult } from "@/features/clinical-console/types";
import { signAnalysis } from "@/features/clinical-console/server/analysis-receipt";
import { rememberTransientAsset } from "@/features/clinical-console/server/persistence";

export const runtime = "nodejs";
const PROMPT = 'This is a research-only image transport check. No validated disease classifier is available. Do not diagnose, infer risk, estimate confidence, or invent vessel/FAZ/perfusion measurements. Return only {"received":true}.';

async function externalReceipt(bytes: ArrayBuffer, mime: string): Promise<VisionResult> {
  const base64 = Buffer.from(bytes).toString("base64");
  // This function is invoked only by an explicit per-upload opt-in with the server switch enabled.
  if (process.env.ANTHROPIC_API_KEY) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const model = process.env.THERMOEYE_ANALYSIS_MODEL || "claude-haiku-4-5-20251001";
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 15000 });
    await client.messages.create({ model, max_tokens: 32, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mime as "image/png" | "image/jpeg" | "image/webp", data: base64 } },
      { type: "text", text: PROMPT },
    ] }] });
    return normalizeAnalysis({ engine: "external_provider", modelVersion: model, analysisStatus: "unavailable", failureReason: "External provider called. No validated segmentation or disease measurements are available." });
  }
  if (process.env.GOOGLE_API_KEY) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const modelName = process.env.THERMOEYE_GOOGLE_MODEL || "gemini-1.5-flash";
    await new GoogleGenerativeAI(process.env.GOOGLE_API_KEY).getGenerativeModel({ model: modelName }).generateContent([{ inlineData: { data: base64, mimeType: mime } }, PROMPT], { timeout: 15000 });
    return normalizeAnalysis({ engine: "external_provider", modelVersion: modelName, analysisStatus: "unavailable", failureReason: "External provider called. No validated segmentation or disease measurements are available." });
  }
  return unavailableAnalysis("External provider was requested but is not configured.");
}

export async function POST(req: NextRequest) {
  const sessionError = requireConsoleSession(req);
  if (sessionError) return sessionError;
  const requestId = randomUUID(), timestamp = new Date().toISOString();
  let fileHash: string | null = null;
  const error = (message: string, status: number) => NextResponse.json({ error: message, requestId }, { status, headers: noStoreHeaders() });
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size) return error("A non-empty image is required.", 400);
    if (file.size > MAX_IMAGE_BYTES) return error("Maximum image size is 8 MB.", 413);
    const bytes = await file.arrayBuffer();
    const mime = detectImageMime(new Uint8Array(bytes));
    if (!mime || !mimeMatches(file.type, mime)) return error("Image signature and MIME type must match JPEG, PNG, WebP, or TIFF.", 415);
    fileHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
    if (NON_OCT_FILENAME.test(file.name)) return error("Explicit filename signal indicates a non-OCT photograph; OCT/OCTA retinal scan required.", 422);

    const endpoint = (process.env.THERMOEYE_LOCAL_INFERENCE_URL?.trim() || "http://127.0.0.1:8000").replace(/\/$/, "");
    let analysis = unavailableAnalysis("Local inference service could not be reached.");
    let localValidated = false;
    try {
      const upload = new FormData();
      upload.append("image", new Blob([bytes], { type: mime }), file.name);
      const serviceKey = process.env.THERMOEYE_BACKEND_KEY?.trim();
      const response = await fetch(`${endpoint}/octa/analyze`, { method: "POST", body: upload, cache: "no-store", headers: serviceKey ? { "X-Thermoeye-Key": serviceKey } : undefined, signal: AbortSignal.timeout(25000) });
      if ([400, 413, 415, 422].includes(response.status)) return error("Local decoder rejected this image. Check format, dimensions, and image integrity.", response.status);
      if (response.ok) {
        const payload = await response.json();
        analysis = normalizeLocalResult(payload);
        localValidated = analysis.qualityStatus === "passed" && ["passed", "passed_with_color_warning"].includes(analysis.modalityGateStatus ?? "");
      } else analysis = unavailableAnalysis(`Local inference returned HTTP ${response.status}.`);
    } catch {
      // No inferred or browser fallback measurements are generated.
    }
    const optedIn = form.get("allowExternal") === "true" && process.env.THERMOEYE_ALLOW_EXTERNAL_VISION === "true";
    if (optedIn && localValidated && analysis.analysisStatus === "unavailable" && mime !== "image/tiff") {
      try { analysis = await externalReceipt(bytes, mime); }
      catch { analysis = unavailableAnalysis("Explicitly requested external provider failed."); }
    }
    analysis = { ...analysis, requestId, timestamp, fileHash, mimeType: mime };
    console.info(JSON.stringify({ event: "octa_analysis", requestId, fileHash, timestamp, mimeType: mime,
      imageMode: analysis.inputMode, width: analysis.imageWidth, height: analysis.imageHeight, decodedFormat: analysis.decodedFormat,
      modalityStatus: analysis.modalityGateStatus, qualityStatus: analysis.qualityStatus, engine: analysis.engine,
      modelVersion: analysis.modelVersion, preprocessingVersion: analysis.preprocessingVersion, metricUnit: analysis.metricUnit,
      status: analysis.analysisStatus, failureReason: analysis.failureReason }));
    const analysisReceipt = signAnalysis(analysis);
    rememberTransientAsset({ fileHash, source: Buffer.from(bytes), sourceMime: mime, maskDataUrl: analysis.segmentationMaskDataUrl });
    return NextResponse.json({ ok: true, analysis, analysisReceipt }, { headers: noStoreHeaders() });
  } catch {
    console.error(JSON.stringify({ event: "octa_request_failed", requestId, fileHash, timestamp }));
    return error("Invalid image analysis request.", 400);
  }
}
