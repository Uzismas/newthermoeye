import type { CSSProperties } from "react";
import { clinicalModelVersion } from "../clinical-analysis";
import { PanelHeader, SectionHeading } from "./shared";

const PERF_TABS = [
  { id: "overview",        label: "Overview" },
  { id: "metrics",         label: "Performance Metrics" },
  { id: "calibration",     label: "Calibration" },
  { id: "error-analysis",  label: "Error Analysis" },
  { id: "drift",           label: "Model Drift" },
  { id: "version-history", label: "Version History" },
];

export function PerformanceView({
  subview = "overview",
  onSubviewChange,
}: {
  subview?: string;
  onSubviewChange?: (sub: string) => void;
}) {
  return (
    <section className="view active" aria-labelledby="performance-title">
      <SectionHeading
        eyebrow="Monitor, evaluate and improve AI model performance"
        title="Model Performance"
        note="Clinical oversight metrics for the current validation window."
        actions={<button className="ghost-button" type="button">Export Report</button>}
      />

      <section className="ops-hero performance-ops" aria-labelledby="performance-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Model readiness board</p>
          <h2 id="performance-ops-title">Multi-disease ruleset — 6 screening modules active</h2>
          <p>Validation metrics inside the release band. Drift monitored. Report release gated by doctor approval.</p>
        </div>
        <div className="ops-status-grid" aria-label="Model readiness highlights">
          <span><strong>0.923</strong><em>AUC validation</em><small>Above 0.90 release threshold</small></span>
          <span><strong>6</strong><em>Disease modules</em><small>AD · DR · Glaucoma · AMD · HTN · PM</small></span>
          <span><strong>0.12</strong><em>Population stability index</em><small>No significant drift</small></span>
          <span><strong>57d</strong><em>Next retraining</em><small>12 Jul 2025 planned</small></span>
        </div>
      </section>

      <div className="tab-strip" role="tablist" aria-label="Performance sections">
        {PERF_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subview === tab.id}
            className={subview === tab.id ? "active" : ""}
            onClick={() => onSubviewChange?.(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="view-pane" key={subview}>
        {subview === "overview"        && <PerfOverviewTab />}
        {subview === "metrics"         && <PerfMetricsTab />}
        {subview === "calibration"     && <PerfCalibrationTab />}
        {subview === "error-analysis"  && <PerfErrorTab />}
        {subview === "drift"           && <PerfDriftTab />}
        {subview === "version-history" && <PerfVersionTab />}
      </div>

      <section className="panel model-info-strip" aria-labelledby="model-info-title">
        <PanelHeader eyebrow="Model Information" title="Model Information" badge="Retrain Model Now" />
        <div>
          <span><strong>Algorithm</strong>Multi-disease retinal-biomarker ruleset</span>
          <span><strong>Diseases</strong>AD · DR · Glaucoma · AMD · HTN · PM</span>
          <span><strong>Input</strong>OCTA SCP &amp; DCP images (3×3 mm)</span>
          <span><strong>Training Data</strong>12,492 images (6 disease classes)</span>
          <span><strong>Validation Data</strong>4,125 images</span>
          <span><strong>Last Trained</strong>12 May 2025</span>
          <span><strong>Next Retraining</strong>12 Jul 2025</span>
        </div>
      </section>

      <section className="panel" aria-labelledby="disease-perf-title">
        <PanelHeader eyebrow="Per-disease performance" title="Per-disease AUC (literature reference)" badge={clinicalModelVersion} badgeTone="secure" />
        <table className="compact-table">
          <thead><tr><th>Disease</th><th>AUC (literature)</th><th>Key biomarker</th><th>Dataset ref</th></tr></thead>
          <tbody>
            {[
              ["Alzheimer's Risk",           "0.85–0.92", "Vessel density + FAZ",     "PMC10917008"],
              ["Diabetic Retinopathy",        "0.94–0.97", "FAZ + capillary dropout",  "APTOS 2019"],
              ["Glaucoma",                    "0.90–0.96", "RNFL + BMO rim width",      "RIM-ONE"],
              ["AMD",                         "0.88–0.93", "Drusen + CNV signal",       "Kermany2018"],
              ["Hypertensive Retinopathy",    "0.82–0.89", "AV nicking + artifacts",   "STARE / DRIVE"],
              ["Pathologic Myopia",           "0.87–0.91", "Chorioretinal atrophy",     "PALM / HuggingFace"],
            ].map(([disease, auc, biomarker, dataset]) => (
              <tr key={disease}><td>{disease}</td><td>{auc}</td><td>{biomarker}</td><td>{dataset}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

/* ── Sub-tabs ─────────────────────────────────────────────────────────────── */

function PerfOverviewTab() {
  return (
    <>
      <div className="metrics-grid six model-metrics">
        <Metric label="AUC" value="0.923" caption="+1.8% vs previous" tone="purple" />
        <Metric label="Accuracy" value="89.1%" caption="+1.6% vs previous" tone="green" />
        <Metric label="Sensitivity (Recall)" value="88.7%" caption="+2.3% vs previous" tone="green" />
        <Metric label="Specificity" value="89.5%" caption="+1.2% vs previous" tone="orange" />
        <Metric label="F1 Score" value="0.886" caption="+0.017 vs previous" tone="purple" />
        <Metric label="PPV (Precision)" value="89.3%" caption="+1.5% vs previous" tone="green" />
      </div>
      <div className="performance-dashboard-grid">
        <RocPanel />
        <MatrixPanel />
        <TrendPanel />
      </div>
    </>
  );
}

function PerfMetricsTab() {
  return (
    <div className="performance-dashboard-grid">
      <section className="panel wide-panel" aria-labelledby="metrics-detail-title">
        <PanelHeader eyebrow="Detailed metrics" title="Performance Metrics by Split" badge="Validation set" />
        <table className="compact-table">
          <thead><tr><th>Split</th><th>AUC</th><th>Accuracy</th><th>Sensitivity</th><th>Specificity</th><th>F1</th><th>PPV</th><th>NPV</th></tr></thead>
          <tbody>
            {[
              ["Train",      "0.957", "93.2%", "92.8%", "93.6%", "0.932", "93.4%", "93.0%"],
              ["Validation", "0.923", "89.1%", "88.7%", "89.5%", "0.886", "89.3%", "88.9%"],
              ["Test",       "0.918", "88.6%", "88.2%", "89.0%", "0.881", "88.8%", "88.4%"],
              ["External",   "0.891", "85.4%", "84.9%", "85.9%", "0.854", "85.7%", "85.1%"],
            ].map(([split, ...vals]) => (
              <tr key={split}><td>{split}</td>{vals.map((v, i) => <td key={i}>{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel" aria-labelledby="per-disease-metrics-title">
        <PanelHeader eyebrow="Per-disease" title="Disease-level AUC" badge="Literature baseline" />
        <div className="factor-bars">
          {[
            ["Diabetic Retinopathy", "0.95"],
            ["Glaucoma", "0.93"],
            ["AMD", "0.91"],
            ["Alzheimer Risk", "0.89"],
            ["Pathologic Myopia", "0.88"],
            ["Hypertensive Retinopathy", "0.86"],
          ].map(([label, value]) => (
            <div key={label} style={{ "--bar": `${Number(value) * 100}%` } as CSSProperties}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PerfCalibrationTab() {
  return (
    <div className="performance-dashboard-grid">
      <section className="panel wide-panel" aria-labelledby="calibration-plot-title">
        <PanelHeader eyebrow="Calibration Plot" title="Predicted vs Observed Risk" badge="Validation set" />
        <div className="chart-shell">
          <span className="chart-axis top">Observed risk</span>
          <span className="chart-axis bottom">Predicted risk</span>
          <svg className="calibration-chart" viewBox="0 0 420 260" role="img" aria-label="Calibration plot showing predicted vs observed risk">
            <line x1="45" y1="218" x2="382" y2="218" />
            <line x1="45" y1="218" x2="45" y2="30" />
            <path className="perfect" d="M48 218 L382 34" />
            <path d="M48 210 C102 178 145 146 192 113 C247 77 310 56 382 38" />
          </svg>
        </div>
      </section>
      <section className="panel" aria-labelledby="calibration-table-title">
        <PanelHeader eyebrow="Calibration data" title="Calibration by Decile" badge="Hosmer-Lemeshow" />
        <table className="compact-table">
          <thead><tr><th>Decile</th><th>Predicted</th><th>Observed</th><th>Δ</th></tr></thead>
          <tbody>
            {[
              ["1", "0.04", "0.05", "+0.01"],
              ["2", "0.10", "0.11", "+0.01"],
              ["3", "0.19", "0.18", "-0.01"],
              ["4", "0.28", "0.27", "-0.01"],
              ["5", "0.38", "0.39", "+0.01"],
              ["6", "0.49", "0.51", "+0.02"],
              ["7", "0.61", "0.63", "+0.02"],
              ["8", "0.72", "0.71", "-0.01"],
              ["9", "0.83", "0.84", "+0.01"],
              ["10","0.93", "0.92", "-0.01"],
            ].map(([d, p, o, delta]) => (
              <tr key={d}><td>{d}</td><td>{p}</td><td>{o}</td><td>{delta}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PerfErrorTab() {
  return (
    <div className="performance-dashboard-grid">
      <section className="panel" aria-labelledby="error-matrix-title">
        <PanelHeader eyebrow="Error Analysis" title="Confusion Matrix (Test Set)" badge="n = 3,214" />
        <div className="matrix" aria-label="Confusion matrix">
          <span />
          <strong>Pred: Negative</strong>
          <strong>Pred: Positive</strong>
          <strong>Actual: Negative</strong>
          <span>1,163</span>
          <span style={{ background: "#fff0f5", color: "#c01048" }}>53</span>
          <strong>Actual: Positive</strong>
          <span style={{ background: "#fff0f5", color: "#c01048" }}>79</span>
          <span>412</span>
        </div>
      </section>
      <section className="panel" aria-labelledby="fp-analysis-title">
        <PanelHeader eyebrow="False positive breakdown" title="FP/FN by Disease" badge="Test set" />
        <table className="compact-table">
          <thead><tr><th>Disease</th><th>FP Rate</th><th>FN Rate</th><th>Main cause</th></tr></thead>
          <tbody>
            {[
              ["Alzheimer Risk",          "9.4%", "8.2%", "Low image contrast"],
              ["Diabetic Retinopathy",    "5.1%", "4.8%", "Mild DR stage"],
              ["Glaucoma",               "7.3%", "6.9%", "Early RNFL thinning"],
              ["AMD",                    "8.8%", "7.6%", "Dry vs wet ambiguity"],
              ["Hypertensive Retinopathy","11.2%","10.4%","AV nicking variability"],
              ["Pathologic Myopia",       "9.7%", "8.9%", "Low image brightness"],
            ].map(([d, fp, fn, cause]) => (
              <tr key={d}><td>{d}</td><td>{fp}</td><td>{fn}</td><td>{cause}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel" aria-labelledby="error-summary-title">
        <PanelHeader eyebrow="Error summary" title="Error Reduction Over Versions" badge="v1 → v4" />
        <div className="factor-bars">
          {[
            ["FP Rate reduction",   "0.38"],
            ["FN Rate reduction",   "0.32"],
            ["Boundary case improvement", "0.61"],
            ["Quality gate improvement",  "0.74"],
          ].map(([label, value]) => (
            <div key={label} style={{ "--bar": `${Number(value) * 100}%` } as CSSProperties}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PerfDriftTab() {
  return (
    <div className="performance-dashboard-grid">
      <section className="panel" aria-labelledby="drift-gauge-title">
        <PanelHeader eyebrow="Model Drift (PSI)" title="Population Stability Index" badge="No drift" badgeTone="secure" />
        <div className="drift-gauge" style={{ "--gauge": "22%" } as CSSProperties}>
          <strong>0.12</strong>
          <span>No significant drift</span>
        </div>
        <div className="drift-scale"><span>No Drift (&lt;0.10)</span><span>Warning (0.10–0.25)</span><span>Severe (&gt;0.25)</span></div>
        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: "0.78rem" }}>
          PSI 0.12 is within the warning band. Monitor monthly; trigger retraining if PSI exceeds 0.25 for 2 consecutive checks.
        </p>
      </section>
      <section className="panel wide-panel" aria-labelledby="drift-trend-title">
        <PanelHeader eyebrow="Drift Trend" title="PSI Trend (Last 6 Checks)" badge="Monthly" />
        <TrendPanel />
      </section>
      <section className="panel" aria-labelledby="drift-features-title">
        <PanelHeader eyebrow="Feature drift" title="Top Drifted Features" badge="PSI &gt; 0.05" />
        <table className="compact-table">
          <thead><tr><th>Feature</th><th>PSI</th><th>Trend</th></tr></thead>
          <tbody>
            {[
              ["Vessel Density (DCP)", "0.09", "↑"],
              ["FAZ Area",             "0.07", "↑"],
              ["Perfusion Density",    "0.06", "→"],
              ["Artifact Score",       "0.05", "↓"],
            ].map(([f, psi, trend]) => (
              <tr key={f}><td>{f}</td><td>{psi}</td><td>{trend}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PerfVersionTab() {
  return (
    <section className="panel" aria-labelledby="version-history-title">
      <PanelHeader eyebrow="Version History" title="Model Version History" badge="Latest: v4" />
      <table className="compact-table">
        <thead><tr><th>Version</th><th>Released</th><th>AUC</th><th>Accuracy</th><th>Diseases</th><th>Key Change</th><th>Status</th></tr></thead>
        <tbody>
          {[
            [clinicalModelVersion, "12 May 2025", "0.923", "89.1%", "6",  "Multi-disease expansion", "Active"],
            ["thermoeye-literature-ruleset-2025.03", "01 Mar 2025", "0.908", "87.6%", "1", "Alzheimer-only baseline", "Deprecated"],
            ["thermoeye-literature-ruleset-2024.11", "15 Nov 2024", "0.891", "85.2%", "1", "FAZ proxy added",         "Archived"],
            ["thermoeye-literature-ruleset-2024.07", "10 Jul 2024", "0.862", "82.4%", "1", "Vessel density only",     "Archived"],
          ].map(([ver, date, auc, acc, d, change, status]) => (
            <tr key={ver}>
              <td style={{ fontSize: "0.65rem", fontFamily: "monospace" }}>{ver}</td>
              <td>{date}</td>
              <td>{auc}</td>
              <td>{acc}</td>
              <td>{d}</td>
              <td>{change}</td>
              <td><span className={`status-pill ${status !== "Active" ? "pending" : ""}`}>{status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ── Shared sub-components ───────────────────────────────────────────────── */

function RocPanel() {
  return (
    <section className="panel" aria-labelledby="roc-title">
      <PanelHeader eyebrow="ROC Curve" title="ROC Curve" badge="AUC 0.923" />
      <div className="chart-shell">
        <span className="chart-axis top">True positive rate</span>
        <span className="chart-axis bottom">False positive rate</span>
        <svg className="roc-chart" viewBox="0 0 420 260" role="img" aria-label="ROC curve showing AUC 0.923">
          <line x1="46" y1="218" x2="382" y2="218" />
          <line x1="46" y1="218" x2="46" y2="30" />
          <path d="M48 218 C64 148 92 91 145 61 C205 28 291 26 382 32" />
          <path className="baseline" d="M48 218 L382 32" />
        </svg>
      </div>
    </section>
  );
}

function MatrixPanel() {
  return (
    <section className="panel" aria-labelledby="matrix-title">
      <PanelHeader eyebrow="Confusion Matrix" title="Confusion Matrix" badge="Test set" />
      <div className="matrix" aria-label="Confusion matrix">
        <span /><strong>Pred low</strong><strong>Pred high</strong>
        <strong>Actual low</strong><span>1,163</span><span>53</span>
        <strong>Actual high</strong><span>79</span><span>412</span>
      </div>
    </section>
  );
}

function TrendPanel() {
  return (
    <section className="panel" aria-labelledby="trend-title">
      <PanelHeader eyebrow="Performance Trend" title="Performance Trend" badge="Last 6 checks" />
      <div className="multi-line-chart" aria-label="Model performance trend">
        <span className="chart-axis top">Validation metrics</span>
        <span className="chart-axis bottom">Last 6 model checks</span>
        <svg className="trend-chart" viewBox="0 0 520 240" role="img" aria-label="AUC, accuracy, sensitivity, and specificity trend">
          <line className="trend-axis" x1="42" y1="202" x2="486" y2="202" />
          <line className="trend-axis" x1="42" y1="34" x2="42" y2="202" />
          {[62, 102, 142, 182].map((y) => <line className="trend-grid" x1="42" y1={y} x2="486" y2={y} key={y} />)}
          <path className="trend-line auc"         d="M46 86 L130 80 L214 74 L298 70 L382 63 L482 58" />
          <path className="trend-line accuracy"    d="M46 112 L130 108 L214 104 L298 96 L382 92 L482 88" />
          <path className="trend-line sensitivity" d="M46 124 L130 116 L214 110 L298 102 L382 98 L482 93" />
          <path className="trend-line specificity" d="M46 118 L130 113 L214 106 L298 101 L382 94 L482 90" />
        </svg>
      </div>
      <div className="chart-legend">
        <span><i className="dot purple-dot" /> AUC</span>
        <span><i className="dot blue-dot" /> Accuracy</span>
        <span><i className="dot green-dot" /> Sensitivity</span>
        <span><i className="dot amber-dot" /> Specificity</span>
      </div>
    </section>
  );
}

function Metric({ label, value, caption, tone }: { label: string; value: string; caption: string; tone: "purple" | "green" | "orange" }) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="trend-up">{caption}</small>
      <span className="sparkline" aria-hidden="true" />
    </article>
  );
}
