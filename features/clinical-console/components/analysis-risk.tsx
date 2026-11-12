import { PanelHeader } from "./shared";

import { ClipboardList, Info } from "lucide-react";

const band = (s: number) => (s < 0.35 ? "low" : s < 0.65 ? "moderate" : "high");
const bandColor = { low: "#0d9488", moderate: "#f59e0b", high: "#ea580c" } as const;
const bandName = { low: "Low", moderate: "Moderate", high: "High" } as const;
const BANDS = [["low", 0, 0.35], ["moderate", 0.35, 0.65], ["high", 0.65, 1]] as const;
const bandText = {
  low: ["Vessel measurements sit inside the typical range of the demo cohort.", "Routine follow-up. No further action is suggested in this demo."],
  moderate: ["Mild reduction in the vessel-density proxy with a small central non-vessel increase.", "Suggest clinician review and a repeat scan at the next visit."],
  high: ["Reduced vessel-density proxy with central non-vessel deviation. A referral-support illustration, not a diagnosis.", "Recommend clinician review, cognitive screening correlation, and follow-up planning. Do not treat this as a standalone diagnosis."],
} as const;

const CX = 130, CY = 124, R = 96, GAP = 0.03;
const pt = (v: number, r = R) => [CX + r * Math.cos(Math.PI * (1 - v)), CY - r * Math.sin(Math.PI * (1 - v))] as const;
const arc = (from: number, to: number) => {
  const [x1, y1] = pt(from), [x2, y2] = pt(to);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

/** Segmented meter: three muted band tracks fill with solid colour up to the score. Demo mode only: the score is simulated. */
export function RiskAssessmentCard({ score, confidence, signals }: { score: number; confidence: number; signals: { label: string; value: string }[] }) {
  const level = band(score);
  const [mx, my] = pt(score);
  const [finding, recommendation] = bandText[level];
  const conf = Math.round(confidence * 100);
  return (
    <section className="panel ai-assessment ra-card" aria-label="AI risk assessment">
      <PanelHeader eyebrow="Simulated output" title="AI Risk Assessment" badge="Simulated" badgeTone="warning" />
      <div className="ra-gauge-wrap">
        <svg viewBox="0 0 260 150" className="ra-gauge" role="img" aria-label={`Simulated risk score ${score.toFixed(2)}, ${bandName[level]} band`}>
          {BANDS.map(([name, lo, hi]) => <path key={`t-${name}`} d={arc(lo + GAP, hi - GAP)} stroke={bandColor[name]} strokeOpacity="0.22" />)}
          {BANDS.map(([name, lo, hi]) => score > lo + GAP ? <path key={`a-${name}`} d={arc(lo + GAP, Math.min(score, hi - GAP))} stroke={bandColor[name]} /> : null)}
          <circle cx={mx} cy={my} r="9.5" fill="#fff" stroke={bandColor[level]} strokeWidth="4" />
          <text x={CX - R} y={CY + 20} textAnchor="middle" className="ra-tick">0</text>
          <text x={CX + R} y={CY + 20} textAnchor="middle" className="ra-tick">1</text>
          <text x={CX} y={CY - 14} textAnchor="middle" className="ra-score" fill={bandColor[level]}>{score.toFixed(2)}</text>
          <text x={CX} y={CY + 8} textAnchor="middle" className="ra-label">Simulated Alzheimer risk</text>
        </svg>
        <div className={`ra-level ra-${level}`}><i />{bandName[level]} band</div>
        <ul className="ra-legend" aria-label="Score bands">
          <li className={level === "low" ? "on" : ""}><i style={{ background: bandColor.low }} />Low &lt; 0.35</li>
          <li className={level === "moderate" ? "on" : ""}><i style={{ background: bandColor.moderate }} />Moderate 0.35–0.65</li>
          <li className={level === "high" ? "on" : ""}><i style={{ background: bandColor.high }} />High &gt; 0.65</li>
        </ul>
      </div>
      <ul className="ra-signals" aria-label="Key image signals">
        {signals.map((x) => <li key={x.label}><span>{x.label}</span><strong>{x.value}</strong></li>)}
      </ul>
      <p className="ra-finding">{finding}</p>
      <div className="ra-reco"><ClipboardList size={18} aria-hidden="true" /><div><h3>Recommendation</h3><p>{recommendation}</p></div></div>
      <div className="ra-conf">
        <div><span>Confidence</span><strong>{conf}%</strong></div>
        <div className="ra-bar" role="img" aria-label={`Confidence ${conf} percent`}><i style={{ width: `${conf}%` }} /></div>
      </div>
      <p className="ra-sim-note"><Info size={15} aria-hidden="true" />Simulated demo output. Not produced by the model; not a diagnosis.</p>
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
