import { PanelHeader, SectionHeading } from "./shared";

const PERF_TABS = [
  { id: "overview", label: "Overview" }, { id: "metrics", label: "Performance Metrics" },
  { id: "calibration", label: "Calibration" }, { id: "error-analysis", label: "Error Analysis" },
  { id: "drift", label: "Model Drift" }, { id: "version-history", label: "Version History" },
];

export function PerformanceView({ subview = "overview", onSubviewChange }: { subview?: string; onSubviewChange?: (sub: string) => void }) {
  const descriptions: Record<string, string> = {
    overview: "No validated disease classifier is connected. A trained vessel segmentation model, when connected, measures vessels only.",
    metrics: "No patient-level held-out disease evaluation artifact is connected. AUC, accuracy, sensitivity, specificity, F1, and precision are unavailable.",
    calibration: "No calibrated disease probabilities are available. Calibration curves and probability thresholds are unavailable.",
    "error-analysis": "No disease labels and predictions are connected for error analysis. A confusion matrix is unavailable.",
    drift: "No monitored production cohort is connected. Population or model drift is unavailable.",
    "version-history": "Case-level engine, model version, preprocessing version, and segmentation threshold are recorded with each analysis. No validated disease model release is available.",
  };
  return <section className="view active" aria-labelledby="performance-title">
    <SectionHeading eyebrow="Research readiness" title="Model Performance" note="Segmentation measurements and disease classification are separate tasks." />
    <div className="tab-strip" role="tablist" aria-label="Performance sections">{PERF_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={subview === tab.id} className={subview === tab.id ? "active" : ""} onClick={() => onSubviewChange?.(tab.id)}>{tab.label}</button>)}</div>
    <section className="panel" role="tabpanel"><PanelHeader eyebrow="Validation status" title={PERF_TABS.find((tab) => tab.id === subview)?.label ?? "Overview"} badge="Unavailable" badgeTone="warning" /><p>{descriptions[subview] ?? descriptions.overview}</p></section>
    <div className="metrics-grid">{["Disease AUC", "Accuracy", "Sensitivity", "Specificity", "F1", "Precision"].map((label) => <article className="metric metric-blue" key={label}><span>{label}</span><strong>N/A</strong><small>No disease validation artifact</small></article>)}</div>
    <section className="panel"><PanelHeader eyebrow="Interpretation" title="Current capability" badge="Research only" /><p>ONNX vessel U-Net and heuristic vessel baselines do not diagnose Alzheimer disease, MCI, or retinal disease. Literature results are not Thermoeye performance measurements.</p></section>
  </section>;
}
