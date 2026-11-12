import { PanelHeader } from "./shared";

const band = (s: number) => (s < 0.35 ? "low" : s < 0.65 ? "moderate" : "high");
const bandColor = { low: "#0d9488", moderate: "#f59e0b", high: "#ea580c" } as const;
const bandText = {
  low: ["Simulated pattern: vessel measurements sit inside the typical range of the demo cohort.", "Routine follow-up. No further action is suggested in this demo."],
  moderate: ["Simulated pattern: mild reduction in the vessel-density proxy with a small central non-vessel increase.", "Suggest clinician review and a repeat scan at the next visit."],
  high: ["Simulated pattern: reduced vessel-density proxy with central non-vessel deviation. A referral-support illustration, not a diagnosis.", "Recommend clinician review, cognitive screening correlation, and follow-up planning. Do not treat this as a standalone diagnosis."],
} as const;

const CX = 120, CY = 118, R = 92;
const pt = (v: number, r = R) => [CX + r * Math.cos(Math.PI * (1 - v)), CY - r * Math.sin(Math.PI * (1 - v))] as const;
const arc = (a: number, b: number) => {
  const [x1, y1] = pt(a), [x2, y2] = pt(b);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

/** Semi-circular gauge with three risk bands and a marker at the score. Demo mode only: the score is simulated. */
export function RiskAssessmentCard({ score, confidence }: { score: number; confidence: number }) {
  const level = band(score);
  const [mx, my] = pt(score);
  const [finding, recommendation] = bandText[level];
  return (
    <section className="panel ai-assessment ra-card" aria-labelledby="ra-title">
      <PanelHeader eyebrow="AI Risk Assessment" title="AI Risk Assessment" badge="Simulated" badgeTone="warning" />
      <svg viewBox="0 0 240 150" className="ra-gauge" role="img" aria-label={`Simulated risk score ${score.toFixed(2)}, ${level} band`}>
        <path d={arc(0, 0.35)} stroke={bandColor.low} />
        <path d={arc(0.35, 0.65)} stroke={bandColor.moderate} />
        <path d={arc(0.65, 1)} stroke={bandColor.high} />
        <circle cx={mx} cy={my} r="9" fill="#fff" stroke="#0f2742" strokeWidth="3" />
        <text x={CX} y={CY - 6} textAnchor="middle" className="ra-score" fill={bandColor[level]}>{score.toFixed(2)}</text>
        <text x={CX} y={CY + 16} textAnchor="middle" className="ra-label">Simulated Alzheimer risk</text>
      </svg>
      <p className="ra-finding">{finding}</p>
      <h3 className="ra-reco">Recommendation</h3>
      <p className="ra-finding">{recommendation}</p>
      <div className="ra-conf">
        <div className="ra-bar" role="img" aria-label={`Confidence ${Math.round(confidence * 100)} percent`}><i style={{ width: `${Math.round(confidence * 100)}%` }} /></div>
        <span>Confidence Score {Math.round(confidence * 100)}%</span>
      </div>
      <p className="ra-sim-note">Simulated demo output. Not produced by the model; not a diagnosis.</p>
    </section>
  );
}

export type MetricRow = { label: string; display: string; value: number | null; watch?: boolean };

/** Metric rows: label, value, and a bar so the magnitude reads at a glance. Bars are decoration; the value is the text. */
export function MetricRows({ rows, badge, simulated }: { rows: MetricRow[]; badge: string; simulated: boolean }) {
  return (
    <section className="panel key-metrics rm-card">
      <PanelHeader eyebrow="Image measurements" title="Research Metrics" badge={badge} badgeTone={simulated ? "warning" : undefined} />
      <ul className="rm-list">
        {rows.map((row) => (
          <li key={row.label}>
            <div><span>{row.label}</span><strong>{row.display}</strong></div>
            <i aria-hidden="true"><b className={row.watch ? "watch" : ""} style={{ width: `${row.value == null ? 0 : Math.min(100, Math.max(0, row.value))}%` }} /></i>
          </li>
        ))}
      </ul>
      <p className="rm-note">Proxies are image measurements without disease thresholds or calibrated clinical interpretation.</p>
    </section>
  );
}
