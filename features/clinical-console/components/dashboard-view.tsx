import type { CSSProperties } from "react";
import { formatPercent, getCaseClassification, getClinicalResultLabel } from "../clinical-analysis";
import { isSyntheticCase } from "../analysis-presentation";
import { buildTasks, caseStage, pct, reviewFor } from "../tasks";
import type { CaseRecord, ReviewDecision, ReviewRecord, ViewId } from "../types";
import { PanelHeader, SectionHeading } from "./shared";

export function DashboardView({
  cases,
  reviews,
  selectedCase,
  selectedReview,
  onCaseSelect,
  onNavigate,
  reviewer,
  onReviewSubmit,
  onPreviewReport,
}: {
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  onCaseSelect: (caseId: string) => void;
  onNavigate: (viewId: ViewId) => void;
  reviewer: string;
  onReviewSubmit: (review: ReviewRecord) => void;
  onPreviewReport: () => void;
}) {
  const total = cases.length;
  const measuredCases = cases.filter((item) => caseStage(item) === "measured");
  const blocked = cases.filter((item) => caseStage(item) === "blocked").length;
  const notEvaluated = total - measuredCases.length - blocked;
  const synthetic = cases.filter(isSyntheticCase).length;
  const decisions = cases.map((item) => reviewFor(item, reviews, reviewer).decision);
  const approved = decisions.filter((d) => d === "Approved for release").length;
  const rescans = decisions.filter((d) => d === "Rescan requested").length;
  const tasks = buildTasks(cases, reviews, reviewer);
  const waitingReview = tasks.filter((t) => t.kind === "review").length;
  const densities = measuredCases
    .map((item) => item.analysisMetrics?.vesselDensity)
    .filter((value): value is number => typeof value === "number");
  const meanDensity = densities.length ? densities.reduce((a, b) => a + b, 0) / densities.length : null;
  const evaluated = measuredCases.length + blocked;
  // Real work first, so the dashboard stays short; the full list lives in Patients.
  const recent = [...cases].sort((a, b) => Number(caseStage(a) === "not-evaluated") - Number(caseStage(b) === "not-evaluated")).slice(0, 6);

  const metrics = [
    { label: "Cases in workspace", value: String(total), caption: `${synthetic} synthetic reference cases`, tone: "blue", bars: null },
    { label: "Measured cases", value: String(measuredCases.length), caption: "Vessel segmentation completed", tone: "green", bars: densities.slice(-6) },
    { label: "Mean vessel density", value: meanDensity == null ? "N/A" : formatPercent(meanDensity), caption: "Across measured cases", tone: "orange", bars: null },
    { label: "Quality blocked", value: String(blocked), caption: "Need a clearer rescan", tone: "purple", bars: null },
  ];

  return (
    <section className="view active" aria-labelledby="dashboard-title">
      <SectionHeading
        eyebrow="OCTA vessel research workflow"
        title={<span id="dashboard-title">Welcome back, {reviewer}</span>}
        note="Vessel-segmentation research view. Disease classification is not available; every report needs a reviewer decision."
      />

      <section className="ops-hero dashboard-ops" aria-labelledby="dashboard-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Research workspace</p>
          <h2 id="dashboard-ops-title">Retinal vessel review run</h2>
          <p>Check image quality, review the vessel map and density for each measured case, then record a decision before any report is released.</p>
          <div className="ops-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate("tasks")}>
              Open Task Manager
            </button>
            <button className="ghost-button" type="button" onClick={() => onNavigate("cases")}>
              Queue new scan
            </button>
          </div>
        </div>
        <div className="ops-status-grid" aria-label="Research run status">
          <span>
            <strong>{waitingReview}</strong>
            <em>Reviews waiting</em>
            <small>Measured, no decision yet</small>
          </span>
          <span>
            <strong>{evaluated ? `${pct(measuredCases.length, evaluated)}%` : "N/A"}</strong>
            <em>Quality pass rate</em>
            <small>{evaluated} image{evaluated === 1 ? "" : "s"} evaluated</small>
          </span>
          <span>
            <strong>VD</strong>
            <em>Measured marker</em>
            <small>Vessel density from the U-Net mask</small>
          </span>
          <span>
            <strong>0</strong>
            <em>Reports without review</em>
            <small>Release gate enforced</small>
          </span>
        </div>
      </section>

      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <article className={`metric metric-${metric.tone}`} key={metric.label}>
            <span className="metric-icon" aria-hidden="true">{["▣", "☷", "⌾", "▤"][index]}</span>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.caption}</small>
            {metric.bars && metric.bars.length > 0 ? <MetricBars tone={metric.tone} values={metric.bars} /> : null}
          </article>
        ))}
      </div>

      <StatusDashboard
        total={total}
        measured={measuredCases.length}
        blocked={blocked}
        notEvaluated={notEvaluated}
        waitingReview={waitingReview}
        approved={approved}
        rescans={rescans}
        cases={cases}
      />

      <div className="dashboard-main-grid">
        <section className="panel queue-panel" aria-labelledby="queue-title">
          <PanelHeader eyebrow="Recent analysis" title="Recent Analyses" badge={`${recent.length} of ${total}`} />
          <CaseTable cases={recent} selectedCaseId={selectedCase.id} onCaseSelect={onCaseSelect} />
          <div className="panel-link-row">
            <button className="text-button" type="button" onClick={() => onNavigate("analysis")}>Go to Analysis Results</button>
            <button className="text-button" type="button" onClick={() => onNavigate("patients")}>View all {total} cases</button>
          </div>
        </section>

        <UploadShortcut onNavigate={() => onNavigate("cases")} />

        <section className="panel distribution-panel" aria-labelledby="status-dist-title">
          <PanelHeader eyebrow="Analysis status" title="Analysis Status Mix" badge={`${total} cases`} />
          <StatusDonut measured={measuredCases.length} blocked={blocked} notEvaluated={notEvaluated} />
          <p className="panel-footnote">Disease risk distribution is not shown: no disease classifier is connected.</p>
        </section>
      </div>

      <div className="dashboard-main-grid secondary">
        <AiInsightCard />
        <ActiveCasePanel
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            reviewer={reviewer}
            onReviewSubmit={onReviewSubmit}
            onOpenAnalysis={() => onNavigate("analysis")}
            onPreviewReport={onPreviewReport}
          />
      </div>
    </section>
  );
}

function MetricBars({ tone, values }: { tone: string; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`metric-bars ${tone}`} aria-hidden="true">
      {values.map((value, index) => (
        <i style={{ "--bar": `${Math.max(8, (value / max) * 100)}%` } as CSSProperties} key={index} />
      ))}
    </div>
  );
}

function StatusDashboard({
  total,
  measured,
  blocked,
  notEvaluated,
  waitingReview,
  approved,
  rescans,
  cases,
}: {
  total: number;
  measured: number;
  blocked: number;
  notEvaluated: number;
  waitingReview: number;
  approved: number;
  rescans: number;
  cases: CaseRecord[];
}) {
  const pipeline: Array<[string, number]> = [
    ["In workspace", total],
    ["Image evaluated", measured + blocked],
    ["Vessels measured", measured],
    ["Review approved", approved],
  ];
  const eyes = (["OD", "OS", "OU"] as const)
    .map((eye) => {
      const group = cases.filter((item) => item.eye === eye);
      return {
        eye,
        n: group.length,
        measured: group.filter((item) => caseStage(item) === "measured").length,
        blocked: group.filter((item) => caseStage(item) === "blocked").length,
      };
    })
    .filter((row) => row.n > 0);
  const queue: Array<[string, number, string]> = [
    ["Quality passed", pct(measured, measured + blocked), "good"],
    ["Review pending", pct(waitingReview, Math.max(measured, 1)), "warn"],
    ["Reports approved", pct(approved, Math.max(measured, 1)), "good"],
    ["Rescan requested", pct(rescans, Math.max(total, 1)), "risk"],
  ];

  return (
    <section className="panel status-dashboard" aria-labelledby="status-dashboard-title">
      <PanelHeader eyebrow="Status dashboard" title="Research Operations Status" badge="Live data" badgeTone="secure" />
      <div className="status-dashboard-grid">
        <div className="status-chart-card status-bars-card">
          <div>
            <strong>Case pipeline</strong>
            <span>How far each case has progressed</span>
          </div>
          <div className="queue-bars" aria-label="Case pipeline">
            {pipeline.map(([label, value]) => (
              <span className="queue-bar good" key={label}>
                <strong>{label}</strong>
                <i style={{ "--bar": `${pct(value, Math.max(total, 1))}%` } as CSSProperties} />
                <em>{value}</em>
              </span>
            ))}
          </div>
        </div>

        <div className="status-chart-card stacked-risk-chart">
          <div>
            <strong>Analysis outcome by eye</strong>
            <span>Measured, quality-blocked, or not yet evaluated</span>
          </div>
          <div className="stacked-bars" aria-label="Analysis outcome by eye">
            {eyes.map((row) => (
              <span key={row.eye}>
                <em>{row.eye}</em>
                <i
                  style={{
                    "--low": `${pct(row.measured, row.n)}%`,
                    "--moderate": `${pct(row.blocked, row.n)}%`,
                    "--high": `${100 - pct(row.measured, row.n) - pct(row.blocked, row.n)}%`,
                  } as CSSProperties}
                />
              </span>
            ))}
          </div>
          <div className="chart-legend inline">
            <span><i className="dot low-dot" /> Measured</span>
            <span><i className="dot moderate-dot" /> Blocked</span>
            <span><i className="dot neutral-dot" /> Not evaluated</span>
          </div>
        </div>

        <div className="status-chart-card status-bars-card">
          <div>
            <strong>Current queue status</strong>
            <span>Share of cases at each gate</span>
          </div>
          <div className="queue-bars" aria-label="Current queue status">
            {queue.map(([label, value, tone]) => (
              <span className={`queue-bar ${tone}`} key={label}>
                <strong>{label}</strong>
                <i style={{ "--bar": `${value}%` } as CSSProperties} />
                <em>{value}%</em>
              </span>
            ))}
          </div>
        </div>
      </div>
      {notEvaluated > 0 ? (
        <p className="panel-footnote">
          {notEvaluated} synthetic reference {notEvaluated === 1 ? "case is" : "cases are"} listed for the workflow demo and not yet analysed.
        </p>
      ) : null}
    </section>
  );
}

function StatusDonut({ measured, blocked, notEvaluated }: { measured: number; blocked: number; notEvaluated: number }) {
  const total = measured + blocked + notEvaluated;
  const a = total ? (measured / total) * 100 : 0;
  const b = total ? a + (blocked / total) * 100 : 0;
  const share = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
  return (
    <div className="risk-donut-wrap">
      <div
        className="donut-chart"
        role="img"
        aria-label={`Analysis status: ${measured} measured, ${blocked} blocked, ${notEvaluated} not evaluated`}
        style={{ background: `radial-gradient(circle at center, #ffffff 0 54%, transparent 55%), conic-gradient(var(--green) 0 ${a}%, var(--amber) ${a}% ${b}%, #c5d3e2 ${b}% 100%)` }}
      >
        <strong>{total}</strong>
        <span>Cases</span>
      </div>
      <div className="donut-legend">
        <span><i className="dot low-dot" /> Measured <strong>{measured} ({share(measured)})</strong></span>
        <span><i className="dot moderate-dot" /> Blocked <strong>{blocked} ({share(blocked)})</strong></span>
        <span><i className="dot neutral-dot" /> Not evaluated <strong>{notEvaluated} ({share(notEvaluated)})</strong></span>
      </div>
    </div>
  );
}

function CaseTable({
  cases,
  selectedCaseId,
  onCaseSelect,
}: {
  cases: CaseRecord[];
  selectedCaseId: string;
  onCaseSelect: (caseId: string) => void;
}) {
  return (
    <table className="case-table">
      <caption className="visually-hidden">Recent Eyezheimer cases</caption>
      <thead>
          <tr className="case-row table-head">
          <th scope="col">Case ID</th>
          <th scope="col">Vessel Density</th>
          <th scope="col">Quality</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((caseRecord) => (
          <tr className={`case-row ${selectedCaseId === caseRecord.id ? "active" : ""}`} key={caseRecord.id}>
            <td>
              <button
                className="case-select-button"
                type="button"
                onClick={() => onCaseSelect(caseRecord.id)}
                aria-pressed={selectedCaseId === caseRecord.id}
              >
                <strong>{caseRecord.id}</strong>
                <small>
                  {isSyntheticCase(caseRecord) ? "Synthetic · " : ""}{caseRecord.scanType} {caseRecord.eye}
                </small>
              </button>
            </td>
            <td>{caseRecord.analysisMetrics?.vesselDensity != null ? formatPercent(caseRecord.analysisMetrics.vesselDensity) : "N/A"}</td>
            <td>
              <span className={`status-pill ${caseRecord.analysisMetrics?.visionResult?.analysisStatus === "measured" ? "" : "pending"}`}>
                {caseRecord.qualityLabel ?? (caseRecord.analysisMetrics?.visionResult?.analysisStatus === "measured" ? "Pass" : "Blocked")}
              </span>
            </td>
            <td>
              <span className={`status-pill ${caseRecord.status === "Report ready" ? "" : "pending"}`}>
                {caseRecord.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActiveCasePanel({
  selectedCase,
  selectedReview,
  reviewer,
  onReviewSubmit,
  onOpenAnalysis,
  onPreviewReport,
}: {
  selectedCase: CaseRecord;
  selectedReview: ReviewRecord;
  reviewer: string;
  onReviewSubmit: (review: ReviewRecord) => void;
  onOpenAnalysis: () => void;
  onPreviewReport: () => void;
}) {
  const classification = getCaseClassification(selectedCase);

  return (
    <section className="panel active-case" aria-labelledby="active-case-title">
      <PanelHeader eyebrow="Review workflow" title="Selected Case Review" badge="Research only" />

      <div className={`case-alert ${selectedCase.riskLevel}`}>
        <strong>
          {classification.kind === "quality_blocked" ? "Acquisition blocked" : getClinicalResultLabel(classification.kind)}
        </strong>
        <span>{classification.finding}</span>
      </div>

      <div className="case-focus">
        <div className="assessment-copy"><strong>Vessel segmentation only</strong><small>Disease classifier unavailable — indeterminate</small></div>
        <div className="case-summary">
          <dl>
            <div>
              <dt>Case code</dt>
              <dd>{selectedCase.id}</dd>
            </div>
            <div>
              <dt>Patient context</dt>
              <dd>{selectedCase.context}</dd>
            </div>
            <div>
              <dt>Measurement engine</dt>
              <dd>{selectedCase.analysisMetrics?.visionResult?.engine ?? (isSyntheticCase(selectedCase) ? "Synthetic fixture" : "Unavailable")}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="decision-strip">
        <span>Vessel density: {selectedCase.analysisMetrics?.vesselDensity != null ? formatPercent(selectedCase.analysisMetrics.vesselDensity) : "N/A"}</span>
        <span>{selectedCase.density}</span>
        <span>{classification.label}</span>
        <span>{selectedReview.decision}</span>
        <span>{selectedReview.followUpWindow}</span>
      </div>

      <DoctorReviewPanel
        currentReview={selectedReview}
        reviewer={reviewer}
        onSubmit={onReviewSubmit}
      />

      <div className="actions-row">
        <button className="ghost-button" type="button" onClick={onPreviewReport}>
          Preview report
        </button>
        <button className="text-button" type="button" onClick={onOpenAnalysis}>
          Open analysis
        </button>
      </div>
    </section>
  );
}

function DoctorReviewPanel({
  currentReview,
  reviewer,
  onSubmit,
}: {
  currentReview: ReviewRecord;
  reviewer: string;
  onSubmit: (review: ReviewRecord) => void;
}) {
  return (
    <form
      className="review-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSubmit({
          decision: formData.get("decision") as ReviewDecision,
          followUpWindow: formData.get("followUpWindow") as ReviewRecord["followUpWindow"],
          note: String(formData.get("note") || ""),
          reviewer,
          updatedAt: new Date().toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        });
      }}
    >
      <div className="review-form-header">
        <div>
          <p className="eyebrow">Doctor review</p>
          <h3>Clinical decision record</h3>
        </div>
        <span className="badge">{currentReview.updatedAt}</span>
      </div>

      <div className="review-controls">
        <label>
          <span>Decision</span>
          <select name="decision" defaultValue={currentReview.decision} aria-label="Review decision">
            <option>Pending review</option>
            <option>Approved for release</option>
            <option>Follow-up required</option>
            <option>Rescan requested</option>
          </select>
        </label>
        <label>
          <span>Follow-up</span>
          <select name="followUpWindow" defaultValue={currentReview.followUpWindow} aria-label="Follow-up window">
            <option>Routine</option>
            <option>30 days</option>
            <option>90 days</option>
            <option>Rescan first</option>
          </select>
        </label>
      </div>

      <label className="review-note">
        <span>Clinical note</span>
        <textarea
          name="note"
          defaultValue={currentReview.note}
          rows={4}
          aria-label="Clinical review note"
        />
      </label>

      <button className="primary-button wide" type="submit">
        Save review decision
      </button>
    </form>
  );
}

function UploadShortcut({ onNavigate }: { onNavigate: () => void }) {
  return (
    <section className="panel upload-shortcut" aria-labelledby="upload-shortcut-title">
      <PanelHeader eyebrow="Upload New OCTA Scan" title="Upload New OCTA Scan" badge="Raster images" />
      <button className="dropzone compact" type="button" onClick={onNavigate}>
        <span className="drop-mark" aria-hidden="true" />
        <strong>Drag and drop OCTA images</strong>
        <small>or browse files</small>
      </button>
      <button className="primary-button wide" type="button" onClick={onNavigate}>Browse Files</button>
    </section>
  );
}

function AiInsightCard() {
  return (
    <section className="panel ai-insight-card" aria-labelledby="ai-insight-title">
      <PanelHeader eyebrow="Clinical guardrails" title="Screening Safety" badge="Updated" badgeTone="secure" />
      <p>
        Disease status remains indeterminate. Image quality and modality gates control whether research measurements are available. Report approval records a review decision and does not establish clinical validation.
      </p>
      <div className="insight-benefits">
        <span>Research measurements</span>
        <span>Doctor approval</span>
        <span>Recorded provenance</span>
      </div>
    </section>
  );
}
