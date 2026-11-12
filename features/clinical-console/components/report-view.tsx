import { clinicalEvidenceSources, formatPercent, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import type { CaseRecord, ReviewRecord, ViewId } from "../types";
import { riskTone } from "../utils";
import { analysisProvenance, hasUsableMeasurements, isSyntheticCase } from "../analysis-presentation";
import { PanelHeader, SectionHeading } from "./shared";
import { canReleaseResearchReport } from "../case-state";
import { simulatedMetrics } from "../demo-data";

export function ReportView({
  selectedCase,
  selectedReview,
  isDownloading,
  onBack,
  onDownload,
  demo = false,
  onApproveDownload,
}: {
  demo?: boolean;
  onApproveDownload?: () => void;
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  isDownloading: boolean;
  onBack: (viewId: ViewId) => void;
  onDownload: () => void;
}) {
  const classification = getCaseClassification(selectedCase);
  const isApproved = selectedReview.decision === "Approved for release" && canReleaseResearchReport(selectedCase);
  const metrics = selectedCase.analysisMetrics;
  const measured = hasUsableMeasurements(selectedCase);
  const demoRelease = demo && !isApproved && canReleaseResearchReport(selectedCase);
  const pdfEnabled = isApproved || demoRelease;
  const pdfLabel = isDownloading ? "Preparing PDF..." : demoRelease ? "Approve & download PDF" : "Download PDF";
  const pdfClick = isApproved ? onDownload : onApproveDownload;

  return (
    <section className="view active" aria-labelledby="report-title">
      <SectionHeading
        eyebrow="Report release"
        title="Research report preview"
        note={isApproved ? "Doctor approval is complete. The PDF is ready for download." : "Preview only. Review and approve this case before downloading or releasing the PDF."}
      />

      <div className="report-grid">
        <article className="panel report-document" aria-labelledby="report-document-title">
          <div className="report-header">
            <div>
              <p className="eyebrow">Eyezheimer research measurement report</p>
              <h2 id="report-document-title">{selectedCase.id}</h2>
            </div>
            <span className={`risk-chip ${riskTone[selectedCase.riskLevel]}`}>
              {classification.kind === "quality_blocked" ? "Blocked" : getClinicalResultLabel(classification.kind)}
            </span>
          </div>
          <div className="report-top-actions">
            <button className="primary-button" type="button" onClick={pdfClick} disabled={isDownloading || !pdfEnabled}>
              {pdfLabel}
            </button>
            {!pdfEnabled ? (
              <>
                <span>Download locked until doctor approval.</span>
                <button className="text-button report-review-link" type="button" onClick={() => onBack("dashboard")}>
                  Review and approve case
                </button>
              </>
            ) : null}
          </div>

          <div className="report-summary">
            <dl>
              <div>
                <dt>Patient context</dt>
                <dd>{selectedCase.context}</dd>
              </div>
              <div>
                <dt>Scan</dt>
                <dd>
                  {selectedCase.scanType} · {selectedCase.eye} · {selectedCase.qualityLabel}
                </dd>
              </div>
              <div>
                <dt>Analysis result</dt>
                <dd>{getClinicalResultLabel(classification.kind)}{classification.kind === "quality_blocked" ? " (blocked)" : " — disease classifier unavailable"}</dd>
              </div>
              <div>
                <dt>Vessel density / Central non-vessel fraction</dt>
                <dd>{metrics && measured ? `${formatPercent(metrics.vesselDensity)} / ${formatPercent(metrics.fazRiskProxy)}` : demo ? `${formatPercent(simulatedMetrics(selectedCase.id).vesselDensity)} / ${formatPercent(simulatedMetrics(selectedCase.id).faz)} (simulated)` : "N/A"}</dd>
              </div>
              <div>
                <dt>Engine / unit</dt>
                <dd>{metrics?.visionResult?.engine ?? "N/A"} / {metrics?.visionResult?.metricUnit ?? "percent_0_100"}</dd>
              </div>
              <div>
                <dt>Doctor review</dt>
                <dd>{selectedReview.decision}</dd>
              </div>
              <div>
                <dt>Reviewer</dt>
                <dd>{selectedReview.reviewer}</dd>
              </div>
              <div>
                <dt>Follow-up</dt>
                <dd>{selectedReview.followUpWindow}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{selectedReview.updatedAt}</dd>
              </div>
            </dl>
          </div>

          <div className="report-visuals">
            <ReportScanFrame
              alt={`Report source scan for ${selectedCase.uploadedFileName ?? selectedCase.id}`}
              label={isSyntheticCase(selectedCase) ? "Synthetic source image" : "Uploaded source image"}
              src={selectedCase.uploadedImageUrl}
            />
            <ReportScanFrame
              alt={`Returned vessel segmentation mask for ${selectedCase.id}`}
              label="Vessel segmentation mask"
              src={measured ? metrics?.visionResult?.segmentationMaskDataUrl : undefined}
            />
          </div>

          <section className="report-section">
            <h3>Research interpretation</h3>
            <p>{classification.finding}</p>
            <div className="report-evidence-list">
              {classification.evidence.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="report-section">
            <h3>Acquisition and review guidance</h3>
            <p>{classification.recommendation}</p>
          </section>

          <section className="report-section">
            <h3>Doctor note</h3>
            <p>{selectedReview.note}</p>
          </section>

          <section className="report-section">
            <h3>Analysis provenance</h3>
            <p>Research only. Reviewer approval does not validate a disease classifier. De-identification and consent are not independently verified by this report.</p>
            <dl>{analysisProvenance(selectedCase).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>

          <section className="report-section">
            <h3>Evidence references</h3>
            <ul>
              {clinicalEvidenceSources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <section className="panel report-actions" aria-labelledby="report-actions-title">
          <PanelHeader eyebrow="Controls" title="Report actions" badge="Audit logged" />
          <div className="checklist">
            <div className="check-item hold"><strong>Disease classifier unavailable</strong><span>Indeterminate; disease risk and confidence N/A</span></div>
            <div className="check-item pass"><strong>Research provenance attached</strong><span>{metrics?.visionResult?.engine ?? "Synthetic fixture"}</span></div>
            <div className={isApproved ? "check-item pass" : "check-item hold"}>
              <strong>Doctor approval</strong>
              <span>{isApproved ? "Ready for release" : demoRelease ? "Demo: approve and download in one click" : "Download locked until approval"}</span>
            </div>
          </div>

          <div className="actions-row vertical-actions">
            <button className="primary-button wide" type="button" onClick={pdfClick} disabled={isDownloading || !pdfEnabled}>
              {pdfLabel}
            </button>
            <button className="ghost-button wide" type="button" onClick={() => onBack("dashboard")}>
              Review and approve case
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function ReportScanFrame({ alt, label, src }: { alt: string; label: string; src?: string }) {
  return (
    <figure className="report-scan-frame">
      <div className="retina-scan report-scan uploaded-scan-frame">
        {src ? (
          // Local object URLs and returned masks are displayed without image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={alt} src={src} />
        ) : <p>N/A — no image available</p>}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
