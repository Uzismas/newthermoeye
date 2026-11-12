import { formatPercent, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { analysisProvenance, hasUsableMeasurements, isSyntheticCase } from "../analysis-presentation";
import type { CaseAction, CaseActionState, CaseRecord } from "../types";
import { Download, FileText } from "lucide-react";
import { canReleaseResearchReport } from "../case-state";
import { simulatedMetrics } from "../demo-data";
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
        <span>No validated disease classifier is connected. Disease risk and confidence are unavailable.</span>
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
        <section className="panel ai-assessment">
          <PanelHeader eyebrow="Disease classification" title="Indeterminate" badge={simulated ? "Simulated" : "Classifier unavailable"} badgeTone="warning" />
          <div className="assessment-copy">
            <p>{classification.finding}</p>
            <strong>{simulated ? `Simulated risk score ${simulated.risk.toFixed(2)} · confidence ${Math.round(simulated.confidence * 100)}% (demo only)` : "Disease risk: N/A · Disease confidence: N/A"}</strong>
            <span>{classification.recommendation}</span>
          </div>
        </section>
        <section className="panel key-metrics">
          <PanelHeader eyebrow="Image measurements" title="Research Metrics" badge={simulated && !measured ? "Simulated" : measured ? "percent_0_100" : "Unavailable"} badgeTone={simulated && !measured ? "warning" : undefined} />
          <MetricLine label="Vessel density proxy" value={show(metrics?.vesselDensity, simulated?.vesselDensity)} />
          <MetricLine label="Central non-vessel fraction (research proxy)" value={show(metrics?.fazRiskProxy, simulated?.faz)} />
          <MetricLine label="Perfusion density proxy" value={show(metrics?.perfusionDensityProxy, simulated?.perfusion)} />
          <MetricLine label="Image quality" value={metrics?.qualityScore != null ? formatPercent(metrics.qualityScore) : simulated ? `${formatPercent(simulated.quality)} (sim)` : "N/A"} />
          <MetricLine label="Contrast index" value={measured && metrics?.contrast != null ? String(metrics.contrast) : simulated ? `${simulated.contrast} (sim)` : "N/A"} />
          <MetricLine label="Artifact estimate" value={show(metrics?.artifactScore, simulated?.artifact)} />
          <p>Proxies are image measurements without disease thresholds or calibrated clinical interpretation.</p>
        </section>
      </div>
      <section className="panel clinical-classification-panel">
        <PanelHeader eyebrow="Acquisition review" title={getClinicalResultLabel(classification.kind)} badge={result?.analysisStatus ?? "Unavailable"} />
        <div className="classification-evidence">{classification.evidence.map((item) => <span key={item}>{item}</span>)}</div>
        <p>Vessel segmentation does not establish Alzheimer disease, MCI, or another diagnosis.</p>
      </section>
      <section className="panel octa-analysis">
        <PanelHeader eyebrow="Current case" title="Image and Segmentation" badge={isSyntheticCase(selectedCase) ? "Synthetic image" : "Uploaded image"} />
        <div className="analysis-grid">
          <ScanPanel title="Source image" src={selectedCase.uploadedImageUrl} alt={`Source scan for ${selectedCase.id}`} />
          <ScanPanel title="Vessel segmentation mask" src={mask} alt={`Returned vessel segmentation mask for ${selectedCase.id}`} />
        </div>
        <p>{mask ? "The vessel mask was returned by the recorded segmentation engine." : "No segmentation mask is available for this case."} Disease heatmaps and density overlays are unavailable.</p>
      </section>
      <div className="analysis-footer-grid">
        <section className="panel compact-panel">
          <PanelHeader eyebrow="Traceability" title="Analysis Provenance" badge="Recorded metadata" />
          <dl>{analysisProvenance(selectedCase).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
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

function ScanPanel({ title, src, alt }: { title: string; src?: string; alt: string }) {
  return <figure className="scan-panel"><div className="scan-title"><h3>{title}</h3></div><div className="retina-scan uploaded-scan-frame">
    {src ? (
      // The source may be a local object URL or a returned data URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} />
    ) : <p>N/A — no image available</p>}
  </div></figure>;
}
