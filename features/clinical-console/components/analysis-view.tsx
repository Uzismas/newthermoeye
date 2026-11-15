import { formatPercent, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { analysisProvenance, hasUsableMeasurements, isSyntheticCase } from "../analysis-presentation";
import type { CaseAction, CaseActionState, CaseRecord } from "../types";
import { Download, FileText } from "lucide-react";
import { canReleaseResearchReport } from "../case-state";
import { simulatedMetrics } from "../demo-data";
import { DemoVesselPreview, MaskEmpty } from "./analysis-media";
import { AlzheimerRiskPercentCard, MetricRows, RiskAssessmentCard, type MetricRow } from "./analysis-risk";
import { estimateAlzheimerRisk } from "../alzheimer-risk";
import { PanelHeader, SectionHeading } from "./shared";

export function AnalysisView({ selectedCase, actionState, activeAction, onAction, demo = false, isApproved = false, isPdfBusy = false, onDownloadPdf, onOpenReport }: {
  demo?: boolean; isApproved?: boolean; isPdfBusy?: boolean; onDownloadPdf?: () => void; onOpenReport?: () => void;
  selectedCase: CaseRecord;
  actionState?: CaseActionState;
  activeAction?: CaseAction;
  onAction?: (action: CaseAction) => void;
}) {
  const metrics = selectedCase.analysisMetrics;
  const classification = getCaseClassification(selectedCase);
  const result = metrics?.visionResult;
  const measured = hasUsableMeasurements(selectedCase);
  const mask = measured ? result?.segmentationMaskDataUrl : undefined;
  const simulated = demo ? simulatedMetrics(selectedCase.id) : null;
  // Demo mode fills any missing value; "(sim)" keeps made-up numbers distinguishable from the real measurement.
  const show = (real: number | null | undefined, sim: number | undefined) => (measured && real != null ? formatPercent(real) : simulated && sim != null ? `${formatPercent(sim)} (sim)` : formatPercent(null));
  const canRelease = canReleaseResearchReport(selectedCase);
  const pdfLabel = isPdfBusy ? "Preparing PDF..." : isApproved ? "Download PDF report" : demo ? "Approve & download PDF" : "Review & download PDF";
  // One number per metric: the real measurement when present, else the simulated one in demo mode.
  const num = (real: number | null | undefined, sim: number | undefined) => (measured && real != null ? real : simulated && sim != null ? sim : null);
  const isSim = (real: number | null | undefined) => !(measured && real != null);
  const fmt = (real: number | null | undefined, n: number | null) => (n == null ? "N/A" : `${formatPercent(n)}${simulated && isSim(real) ? " (sim)" : ""}`);
  const qualityN = metrics?.qualityScore != null ? metrics.qualityScore : simulated?.quality ?? null;
  const contrastN = measured && metrics?.contrast != null ? metrics.contrast : simulated?.contrast ?? null;
  const artifactN = num(metrics?.artifactScore, simulated?.artifact);
  const faz = measured ? result?.fazAreaMm2 ?? null : null;
  const fazIndex = measured ? result?.alzheimerFazIndex ?? null : null;
  const rows: MetricRow[] = [
    ...(faz != null ? [{ label: "FAZ area (foveal avascular zone)", value: Math.min(100, (faz / 0.6) * 100), display: `${faz.toFixed(3)} mm²`, watch: faz > 0.375 }] : []),
    { label: "Vessel density proxy", value: num(metrics?.vesselDensity, simulated?.vesselDensity), display: fmt(metrics?.vesselDensity, num(metrics?.vesselDensity, simulated?.vesselDensity)) },
    { label: "Central non-vessel fraction (research proxy)", value: num(metrics?.fazRiskProxy, simulated?.faz), display: fmt(metrics?.fazRiskProxy, num(metrics?.fazRiskProxy, simulated?.faz)) },
    { label: "Perfusion density proxy", value: num(metrics?.perfusionDensityProxy, simulated?.perfusion), display: fmt(metrics?.perfusionDensityProxy, num(metrics?.perfusionDensityProxy, simulated?.perfusion)) },
    { label: "Image quality", value: qualityN, display: qualityN == null ? "N/A" : `${formatPercent(qualityN)}${metrics?.qualityScore == null && simulated ? " (sim)" : ""}`, watch: qualityN != null && qualityN < 60 },
    { label: "Contrast index", value: contrastN, display: contrastN == null ? "N/A" : `${contrastN}${!(measured && metrics?.contrast != null) && simulated ? " (sim)" : ""}` },
    { label: "Artifact estimate", value: artifactN, display: fmt(metrics?.artifactScore, artifactN), watch: artifactN != null && artifactN > 10 },
  ];

  return (
    <section className="view active" aria-labelledby="analysis-title">
      <SectionHeading eyebrow="Research measurements" title="Analysis Result" note={`Scan ID: ${selectedCase.id}`} />
      <div className="export-bar" role="group" aria-label="Export this analysis">
        <div>
          <strong>Export this result</strong>
          <span>{canRelease ? (isApproved ? "Approved. The research report is ready." : demo ? "Demo: one click records the approval and downloads the PDF." : "A reviewer must approve before the PDF is released.") : "Reports and DICOM need a measured image. Upload an OCTA scan to enable them."}</span>
        </div>
        <button className="primary-button" type="button" disabled={!canRelease || isPdfBusy} onClick={isApproved || demo ? onDownloadPdf : onOpenReport}><FileText size={17} aria-hidden="true" />{pdfLabel}</button>
        <button className="ghost-button" type="button" disabled={!canRelease || !onAction || activeAction === "export_dicom"} onClick={() => onAction?.("export_dicom")}><Download size={17} aria-hidden="true" />{activeAction === "export_dicom" ? "Preparing DICOM..." : "Export DICOM (.dcm)"}</button>
      </div>
      <div className="analysis-mode-banner ruleset" role="status">
        <strong>{isSyntheticCase(selectedCase) ? "Synthetic demonstration / research only" : "Research measurements only"}</strong>
        <span>{fazIndex != null ? "The Alzheimer index is computed from the measured FAZ with published group averages. It is not a validated classifier or a diagnosis." : "No validated disease classifier is connected. Disease risk and confidence are unavailable."}</span>
      </div>
      <div className="analysis-hero-grid">
        <section className="panel patient-overview">
          <PanelHeader eyebrow="Selected case" title="Case Overview" badge="Research only" />
          <dl>
            <div><dt>Case ID</dt><dd>{selectedCase.id}</dd></div>
            <div><dt>Age / Sex</dt><dd>{selectedCase.age} / {selectedCase.sex}</dd></div>
            <div><dt>Scan type</dt><dd>{selectedCase.scanType} · {selectedCase.eye}</dd></div>
            <div><dt>Source file</dt><dd>{selectedCase.uploadedFileName ?? "Synthetic fixture"}</dd></div>
            <div><dt>Context</dt><dd>{selectedCase.context}</dd></div>
          </dl>
        </section>
        {fazIndex != null && faz != null ? (
          <RiskAssessmentCard mode="literature" score={fazIndex} signals={[
            { label: "FAZ area", value: `${faz.toFixed(3)} mm²` },
            { label: "Control reference", value: "0.275 ± 0.10 mm²" },
            { label: "Difference from controls", value: result?.alzheimerFazZ != null ? `${result.alzheimerFazZ > 0 ? "+" : ""}${result.alzheimerFazZ.toFixed(2)} SD` : "N/A" },
          ]} />
        ) : simulated ? <RiskAssessmentCard score={simulated.risk} confidence={simulated.confidence} signals={rows.slice(0, 3).map((r) => ({ label: r.label.replace(" proxy", "").replace(" (research proxy)", ""), value: r.display }))} /> : (
          <section className="panel ai-assessment">
          <PanelHeader eyebrow="Disease classification" title="Indeterminate" badge="Classifier unavailable" badgeTone="warning" />
          <div className="assessment-copy">
            <p>{classification.finding}</p>
            <strong>Disease risk: N/A · Disease confidence: N/A</strong>
            <span>{classification.recommendation}</span>
          </div>
          </section>
        )}
        <MetricRows rows={rows} simulated={Boolean(simulated && !measured)} badge={simulated && !measured ? "Simulated" : measured ? "percent_0_100" : "Unavailable"} />
      </div>
      {faz != null && result?.alzheimerFazZ != null ? (
        <AlzheimerRiskPercentCard estimate={estimateAlzheimerRisk(selectedCase.age, result.alzheimerFazZ)} age={selectedCase.age} fazAreaMm2={faz} fazZ={result.alzheimerFazZ} />
      ) : null}
      <section className="panel clinical-classification-panel">
        <PanelHeader eyebrow="Acquisition review" title={getClinicalResultLabel(classification.kind)} badge={result?.analysisStatus ?? "Unavailable"} />
        <div className="classification-evidence">{classification.evidence.map((item) => <span key={item}>{item}</span>)}</div>
        <p>Vessel segmentation does not establish Alzheimer disease, MCI, or another diagnosis.</p>
      </section>
      <section className="panel octa-analysis">
        <PanelHeader eyebrow="Current case" title="Image and Segmentation" badge={isSyntheticCase(selectedCase) ? "Synthetic image" : "Uploaded image"} />
        <div className="analysis-grid">
          <ScanPanel title="Source image" src={selectedCase.uploadedImageUrl} alt={`Source scan for ${selectedCase.id}`} />
          <ScanPanel title="Vessel segmentation mask" src={mask} alt={`Returned vessel segmentation mask for ${selectedCase.id}`}
            empty={demo && selectedCase.uploadedImageUrl ? <DemoVesselPreview src={selectedCase.uploadedImageUrl} />
              : <MaskEmpty notConnected={result?.analysisStatus === "unavailable"}
                  title={result?.analysisStatus === "unavailable" ? "AI service not connected" : result?.analysisStatus?.endsWith("blocked") ? "Image was not analysed" : "No vessel map yet"}
                  reason={result?.failureReason ?? "This case has no AI result attached."} />} />
          {faz != null && result?.fazOutlinePath && selectedCase.uploadedImageUrl ? <FazOverlayPanel src={selectedCase.uploadedImageUrl} outline={result.fazOutlinePath} areaMm2={faz} caseId={selectedCase.id} /> : null}
        </div>
        <p>{mask ? "The vessel mask was returned by the AI segmentation model." : demo && selectedCase.uploadedImageUrl ? "Demo preview: a simple brightness filter stands in because the AI did not run for this image. It is not the AI result." : "The AI did not produce a vessel mask for this case."}</p>
      </section>
      <div className="analysis-footer-grid">
        <section className="panel compact-panel">
          <PanelHeader eyebrow="Traceability" title="Analysis Provenance" badge="Recorded metadata" />
          {result?.analysisStatus !== "measured" ? <p className="prov-summary">The AI did not run on this image{result?.failureReason ? `: ${result.failureReason}` : "."}</p> : null}
          {(() => {
            const rows = analysisProvenance(selectedCase);
            const empty = (v: string) => v === "N/A" || v === "Not evaluated" || v === "not_evaluated";
            const shown = rows.filter(([, v]) => !empty(v));
            const hidden = rows.filter(([, v]) => empty(v));
            return <>
              <dl className="prov-list">{shown.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              {hidden.length ? <details className="prov-more"><summary>{hidden.length} fields not recorded for this image</summary><dl className="prov-list">{hidden.map(([label]) => <div key={label}><dt>{label}</dt><dd>Not recorded</dd></div>)}</dl></details> : null}
            </>;
          })()}
        </section>
        <section className="panel action-stack">
          <PanelHeader eyebrow="Actions" title="Case Actions" badge="Research workflow" />
          <button className="ghost-button wide" disabled={!onAction || actionState?.patientRecordAdded || activeAction === "add_to_patient"} type="button" onClick={() => onAction?.("add_to_patient")}>
            {actionState?.patientRecordAdded ? "Added to Patient Record" : activeAction === "add_to_patient" ? "Adding..." : "Add to Patient Record"}
          </button>
          <button className="ghost-button wide" disabled={!onAction || actionState?.secondReviewRequested || activeAction === "second_review"} type="button" onClick={() => onAction?.("second_review")}>
            {actionState?.secondReviewRequested ? "Second Review Requested" : activeAction === "second_review" ? "Requesting..." : "Request Second Review"}
          </button>
          <button className="ghost-button wide" disabled={!onAction || activeAction === "export_dicom"} type="button" onClick={() => onAction?.("export_dicom")}>{activeAction === "export_dicom" ? "Preparing DICOM..." : "Download DICOM (.dcm)"}</button>
          <button className="danger-button wide" disabled={!onAction || activeAction === "delete_scan"} type="button" onClick={() => onAction?.("delete_scan")}>{activeAction === "delete_scan" ? "Deleting..." : "Delete Scan"}</button>
        </section>
      </div>
    </section>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="metric-line"><span>{label}</span><strong>{value}</strong></div>;
}

/** Source scan with the AI FAZ boundary (red), the circle of equal area (blue) and its two axes through the FAZ centre. */
function FazOverlayPanel({ src, outline, areaMm2, caseId }: { src: string; outline: string; areaMm2: number; caseId: string }) {
  const pts = outline.slice(1, -2).split(" L").map((p) => p.split(" ").map(Number) as [number, number]);
  let a = 0, cx = 0, cy = 0;
  pts.forEach(([x0, y0], i) => { const [x1, y1] = pts[(i + 1) % pts.length]; const c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; });
  cx /= 3 * a; cy /= 3 * a; // polygon centroid (shoelace)
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const [sxx, syy, sxy] = pts.reduce(([u, v, w], [x, y]) => [u + (x - mx) ** 2, v + (y - my) ** 2, w + (x - mx) * (y - my)], [0, 0, 0]);
  const t = Math.atan2(2 * sxy, sxx - syy) / 2; // long axis of the outline
  const diameterMm = 2 * Math.sqrt(areaMm2 / Math.PI);
  const r = (diameterMm / 2 / 3) * 1000; // 3 mm scan width = 1000 units
  const axis = (ang: number) => <line x1={cx - r * Math.cos(ang)} y1={cy - r * Math.sin(ang)} x2={cx + r * Math.cos(ang)} y2={cy + r * Math.sin(ang)} />;
  // Zoom on the FAZ like published FAZ figures: a square window about 3.2 FAZ radii wide, kept inside the scan.
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.min(1000, Math.max(320, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), r * 2) * 1.6);
  const vx = Math.min(1000 - w, Math.max(0, cx - w / 2)), vy = Math.min(1000 - w, Math.max(0, cy - w / 2));
  const labelBelow = cy - r - w * 0.1 < vy;
  return <figure className="scan-panel"><div className="scan-title"><h3>FAZ (foveal avascular zone)</h3></div><div className="retina-scan uploaded-scan-frame">
    {/* shortcut: FAZ is measured on a square grid, so a non-square upload is shown stretched to a square here. */}
    <svg className="faz-overlay" viewBox={`${vx} ${vy} ${w} ${w}`} role="img" aria-label={`FAZ outline over the source scan for ${caseId}: area ${areaMm2.toFixed(3)} mm², equal-area circle diameter ${diameterMm.toFixed(2)} mm`}>
      <image href={src} width="1000" height="1000" preserveAspectRatio="none" />
      <path d={outline} className="faz-outline" />
      <circle cx={cx} cy={cy} r={r} className="faz-circle" />
      <g className="faz-axes">{axis(t)}{axis(t + Math.PI / 2)}</g>
      <circle cx={cx} cy={cy} r={w * 0.012} className="faz-centre" />
      <text x={cx} y={labelBelow ? cy + r + w * 0.09 : cy - r - w * 0.04} textAnchor="middle" fontSize={w * 0.06} className="faz-label">Center of FAZ</text>
    </svg>
  </div><figcaption className="faz-legend"><span><i className="red" />AI FAZ boundary · {areaMm2.toFixed(3)} mm²</span><span><i className="blue" />Equal-area circle · Ø {diameterMm.toFixed(2)} mm</span></figcaption></figure>;
}

function ScanPanel({ title, src, alt, empty }: { title: string; src?: string; alt: string; empty?: React.ReactNode }) {
  return <figure className="scan-panel"><div className="scan-title"><h3>{title}</h3></div><div className="retina-scan uploaded-scan-frame">
    {src ? (
      // The source may be a local object URL or a returned data URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} />
    ) : empty ?? <MaskEmpty title="No image" reason="No source image is stored for this case." />}
  </div></figure>;
}
