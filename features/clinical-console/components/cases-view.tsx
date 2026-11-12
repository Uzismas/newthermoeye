"use client";

import { useRef, useState } from "react";
import { createCaseFromClinicalInput, metricsFromAnalysis } from "../clinical-analysis";
import { normalizeAnalysis } from "../analysis-contract";
import { detectImageMime, mimeMatches, MAX_IMAGE_BYTES, NON_OCT_FILENAME } from "../image-input";
import type { CaseRecord, VisionResult } from "../types";
import { PanelHeader, SectionHeading } from "./shared";

export function CasesView({
  errorMessage,
  isQueueing = false,
  uploadLabel,
  onCreateDemoCase,
  onFileSelected,
  onBatchDone,
}: {
  errorMessage?: string;
  isQueueing?: boolean;
  uploadLabel: string;
  onCreateDemoCase: (caseRecord: CaseRecord, sourceFile: File, options?: { stay?: boolean }) => void | Promise<void>;
  onFileSelected: (label: string) => void;
  onBatchDone: (summary: string) => void;
}) {
  const [localError, setLocalError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzingRef = useRef(false);

  // Several images at once: analyse and save them one by one so a bad file never blocks the rest.
  async function runBatch(files: File[], base: Omit<DemoCaseInput, "caseCode">) {
    let measured = 0, blocked = 0;
    const failed: string[] = [];
    for (const file of files) {
      try {
        const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36).toUpperCase() || "SCAN";
        const { caseRecord, sourceFile } = await createBaselineDemoCase(file, { ...base, caseCode: `TE-${stem}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` });
        await onCreateDemoCase(caseRecord, sourceFile, { stay: true });
        if (caseRecord.analysisMetrics?.visionResult?.analysisStatus === "measured") measured += 1; else blocked += 1;
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : "could not be processed"}`);
      }
    }
    if (failed.length) setLocalError(`${failed.length} rejected. ${failed.slice(0, 3).join(" · ")}`);
    if (measured + blocked > 0) onBatchDone(`${files.length} images processed: ${measured} measured, ${blocked} blocked by the quality gate${failed.length ? `, ${failed.length} rejected` : ""}.`);
  }

  return (
    <section className="view active" aria-labelledby="cases-title">
      <SectionHeading
        eyebrow="Ingestion"
        title="Case intake and upload"
        note="Research workflow. Upload de-identified scans only; automatic de-identification is not implemented."
      />

      <div className="two-column">
        <section className="panel upload-panel" aria-labelledby="upload-title">
          <PanelHeader eyebrow="New scan" title="Secure upload" badge="Local analysis" badgeTone="secure" />

          <label className="dropzone" htmlFor="scan-file">
            <input
              id="scan-file"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff"
              onChange={(event) => {
                const picked = event.target.files;
                setLocalError("");
                if (picked && picked.length > 1) onFileSelected(`${picked.length} images selected`);
                else if (picked?.[0]) onFileSelected(`${picked[0].name} selected`);
              }}
            />
            <span className="drop-mark" aria-hidden="true" />
            <strong>{uploadLabel}</strong>
            <small>JPEG, PNG, WebP, or TIFF OCTA/OCT image. DICOM must be exported to one of these image formats first.</small>
            <span className="upload-format-list" aria-label="Supported image formats">
              <span>JPG</span>
              <span>PNG</span>
              <span>WebP</span>
              <span>TIFF</span>
              <span className="upload-format-limit">Max 8 MB</span>
            </span>
            <span className="file-picker-button">Choose scan image(s)</span>
            <span className={uploadLabel.endsWith(" selected") ? "upload-state ready" : "upload-state"}>
              {uploadLabel.endsWith(" selected") ? "Ready for screening" : "No file selected yet"}
            </span>
          </label>

          <div className="form-grid">
            <label>
              <span>Case code</span>
              <input name="caseCode" type="text" placeholder="Auto-generated if empty" aria-label="Case code" />
            </label>
            <label>
              <span>Age</span>
              <input name="age" type="number" defaultValue="68" aria-label="Patient age" />
            </label>
            <label>
              <span>Sex</span>
              <select name="sex" aria-label="Patient sex" defaultValue="Female">
                <option>Female</option>
                <option>Male</option>
                <option>Not specified</option>
              </select>
            </label>
            <label>
              <span>Scan type</span>
              <select name="scanType" aria-label="Scan type" defaultValue="OCTA macula">
                <option>OCTA macula</option>
                <option>OCT retinal layer</option>
                <option>OCTA widefield</option>
              </select>
            </label>
          </div>

          <div className="consent-box">
            <label>
              <input type="checkbox" name="consentScreening" defaultChecked /> Screening allowed
            </label>
            <label>
              <input type="checkbox" name="consentResearch" /> Research allowed
            </label>
            <label>
              <input type="checkbox" name="consentTraining" /> Model training allowed
            </label>
            <p className="consent-note">Consent fields are recorded in the researcher&apos;s case record. Backend enforcement is not yet implemented in this research prototype.</p>
          </div>

          {localError ? (
            <p className="form-error" role="alert">
              {localError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="primary-button wide"
            type="button"
            onClick={() => {
              if (analyzingRef.current) return;
              const fileInput = document.querySelector<HTMLInputElement>("#scan-file");
              const files = Array.from(fileInput?.files ?? []);
              const file = files[0];
              const form = fileInput?.closest(".upload-panel");
              const getField = (name: string) => form?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? "";

              if (!file) {
                setLocalError("Please choose an OCTA image before queueing screening.");
                return;
              }

              if (files.length > 20) {
                setLocalError("Choose up to 20 images at a time.");
                return;
              }

              setLocalError("");
              analyzingRef.current = true;
              setIsAnalyzing(true);
              if (files.length > 1) {
                void runBatch(files, { age: Number(getField("age")), sex: getField("sex") === "Male" ? "M" : "F", scanType: getField("scanType") || "OCTA macula" })
                  .finally(() => { analyzingRef.current = false; setIsAnalyzing(false); });
                return;
              }
              void createBaselineDemoCase(file, {
                caseCode: getField("caseCode"),
                age: Number(getField("age")),
                sex: getField("sex") === "Male" ? "M" : "F",
                scanType: getField("scanType") || "OCTA macula",
              }).then(({ caseRecord, sourceFile }) => onCreateDemoCase(caseRecord, sourceFile)).catch((error: unknown) => {
                setLocalError(error instanceof Error ? error.message : "The file could not be accepted as an OCT/OCTA scan.");
              }).finally(() => { analyzingRef.current = false; setIsAnalyzing(false); });
            }}
            disabled={isQueueing || isAnalyzing}
          >
            {isQueueing ? "Queueing..." : isAnalyzing ? "Analyzing..." : uploadLabel.endsWith(" images selected") ? `Queue ${uploadLabel.split(" ")[0]} scans` : "Queue secure screening"}
          </button>
        </section>

        <section className="panel" aria-labelledby="checks-title">
          <PanelHeader eyebrow="Pre-analysis gates" title="Required checks" badge="MVP rules" />
          <div className="checklist">
            <CheckItem tone="hold" title="Metadata" text="Remove identifiers before upload; no automatic de-identification claim" />
            <CheckItem tone="hold" title="Purpose" text="Research measurements only" />
            <CheckItem tone="hold" title="Image quality" text="Evaluated by the local backend after decoding" />
            <CheckItem tone="hold" title="Model release gate" text="Using mock/baseline model until validation package exists" />
          </div>
        </section>
      </div>
    </section>
  );
}

type DemoCaseInput = {
  age: number;
  caseCode: string;
  scanType: string;
  sex: "F" | "M";
};

async function createBaselineDemoCase(file: File, input: DemoCaseInput): Promise<{ caseRecord: CaseRecord; sourceFile: File }> {
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 120) throw new Error("Age must be between 0 and 120.");
  if (input.caseCode && !/^[A-Z0-9-]{4,64}$/i.test(input.caseCode.trim())) throw new Error("Case code must contain 4–64 letters, digits, or hyphens.");
  const { metrics, analysisReceipt } = await analyzeImage(file);
  // Decoder-generated preview also supports TIFF without a browser TIFF codec.
  const imageUrl = metrics.visionResult?.previewDataUrl ?? (file.type.includes("tif") ? undefined : URL.createObjectURL(file));
  return { caseRecord: { ...createCaseFromClinicalInput({ ...input, fileName: file.name, metrics, uploadedImageUrl: imageUrl }), analysisReceipt }, sourceFile: file };
}

async function analyzeImage(file: File) {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("Choose a non-empty image up to 8 MB.");
  if (NON_OCT_FILENAME.test(file.name)) throw new Error("Explicit non-OCT photograph filename. Upload an OCT/OCTA scan.");
  const mime = detectImageMime(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!mime || !mimeMatches(file.type, mime)) throw new Error("Image signature must match JPEG, PNG, WebP, or TIFF.");
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/analyze", { method: "POST", body: form, cache: "no-store" });
  const body = await res.json().catch(() => null) as { error?: string; analysis?: VisionResult; analysisReceipt?: string } | null;
  if (!res.ok || !body?.analysis) throw new Error(body?.error ?? "Analysis failed. No fallback result was created.");
  return { metrics: metricsFromAnalysis(normalizeAnalysis(body.analysis)), analysisReceipt: body.analysisReceipt };
}

function CheckItem({ tone, title, text }: { tone: "pass" | "hold"; title: string; text: string }) {
  return (
    <div className={`check-item ${tone}`}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
