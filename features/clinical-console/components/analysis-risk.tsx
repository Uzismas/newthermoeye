import { PanelHeader } from "./shared";

import { ClipboardList, Info } from "lucide-react";
import { estimateAlzheimerRisk, RISK_AGE_GROUPS, type AlzheimerRiskEstimate } from "../alzheimer-risk";

const band = (s: number) => (s < 0.35 ? "low" : s < 0.65 ? "moderate" : "high");
const bandColor = { low: "#0d9488", moderate: "#f59e0b", high: "#ea580c" } as const;
const bandName = { low: "Low", moderate: "Moderate", high: "High" } as const;
const BANDS = [["low", 0, 0.35], ["moderate", 0.35, 0.65], ["high", 0.65, 1]] as const;
const bandText = {
  low: ["Vessel measurements sit inside the typical range of the demo cohort.", "Routine follow-up. No further action is suggested in this demo."],
  moderate: ["Mild reduction in the vessel-density proxy with a small central non-vessel increase.", "Suggest clinician review and a repeat scan at the next visit."],
  high: ["Reduced vessel-density proxy with central non-vessel deviation. A referral-support illustration, not a diagnosis.", "Recommend clinician review, cognitive screening correlation, and follow-up planning. Do not treat this as a standalone diagnosis."],
} as const;
const fazText = {
  low: ["The measured FAZ is smaller than the published control average, which points away from the Alzheimer pattern.", "No retinal sign of concern from FAZ size. FAZ alone cannot rule Alzheimer's in or out."],
  moderate: ["The measured FAZ is close to the published control average, so it gives little evidence either way.", "Interpret with clinical and cognitive history; repeat imaging can track change over time."],
  high: ["The measured FAZ is larger than the published control average, a pattern reported more often in Alzheimer's disease.", "Suggest clinician review and cognitive screening correlation. An enlarged FAZ also occurs in other eye conditions; this is not a diagnosis."],
} as const;

const CX = 130, CY = 124, R = 96, GAP = 0.03;
const pt = (v: number, r = R) => [CX + r * Math.cos(Math.PI * (1 - v)), CY - r * Math.sin(Math.PI * (1 - v))] as const;
const arc = (from: number, to: number) => {
  const [x1, y1] = pt(from), [x2, y2] = pt(to);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

/**
 * Segmented meter: three muted band tracks fill with solid colour up to the score.
 * "literature": score computed from the measured FAZ with published group averages. "simulated": demo-only number.
 */
export function RiskAssessmentCard({ score, confidence, signals, mode = "simulated" }: { score: number; confidence?: number; signals: { label: string; value: string }[]; mode?: "simulated" | "literature" }) {
  const lit = mode === "literature";
  const level = band(score);
  const [mx, my] = pt(score);
  const [finding, recommendation] = (lit ? fazText : bandText)[level];
  const conf = Math.round((confidence ?? 0) * 100);
  return (
    <section className="panel ai-assessment ra-card" aria-label="AI risk assessment">
      {lit ? <PanelHeader eyebrow="Measured FAZ · literature-based" title="Alzheimer Risk Index" badge="Research · not a diagnosis" />
        : <PanelHeader eyebrow="Simulated output" title="AI Risk Assessment" badge="Simulated" badgeTone="warning" />}
      <div className="ra-gauge-wrap">
        <svg viewBox="0 0 260 150" className="ra-gauge" role="img" aria-label={`${lit ? "Alzheimer FAZ index" : "Simulated risk score"} ${score.toFixed(2)}, ${bandName[level]} band`}>
          {BANDS.map(([name, lo, hi]) => <path key={`t-${name}`} d={arc(lo + GAP, hi - GAP)} stroke={bandColor[name]} strokeOpacity="0.22" />)}
          {BANDS.map(([name, lo, hi]) => score > lo + GAP ? <path key={`a-${name}`} d={arc(lo + GAP, Math.min(score, hi - GAP))} stroke={bandColor[name]} /> : null)}
          <circle cx={mx} cy={my} r="9.5" fill="#fff" stroke={bandColor[level]} strokeWidth="4" />
          <text x={CX - R} y={CY + 20} textAnchor="middle" className="ra-tick">0</text>
          <text x={CX + R} y={CY + 20} textAnchor="middle" className="ra-tick">1</text>
          <text x={CX} y={CY - 14} textAnchor="middle" className="ra-score" fill={bandColor[level]}>{score.toFixed(2)}</text>
          <text x={CX} y={CY + 8} textAnchor="middle" className="ra-label">{lit ? "Alzheimer FAZ index" : "Simulated Alzheimer risk"}</text>
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
      {lit ? (
        <p className="ra-sim-note"><Info size={15} aria-hidden="true" />Computed from this scan&apos;s measured FAZ area against published averages: controls 0.275 ± 0.10 mm² (O&apos;Bryhim 2018), Alzheimer shift 0.54 SD (Frontiers in Aging Neuroscience 2022 meta-analysis). 0.50 means no evidence either way. Not a validated classifier; accuracy has not been measured.</p>
      ) : <>
        <div className="ra-conf">
          <div><span>Confidence</span><strong>{conf}%</strong></div>
          <div className="ra-bar" role="img" aria-label={`Confidence ${conf} percent`}><i style={{ width: `${conf}%` }} /></div>
        </div>
        <p className="ra-sim-note"><Info size={15} aria-hidden="true" />Simulated demo output. Not produced by the model; not a diagnosis.</p>
      </>}
    </section>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 ? 2 : 1)}%`;

/** One card per age group with this scan's FAZ; the patient's group is highlighted so it reads without the table. */
function AgeComparison({ age, fazZ }: { age: number; fazZ: number }) {
  const mine = estimateAlzheimerRisk(age, fazZ)?.ageGroup;
  const groups = RISK_AGE_GROUPS.map((g) => ({
    ...g,
    normal: estimateAlzheimerRisk(g.minAge, 0)!.risk, // FAZ = 0.275 mm² (z = 0)
    scan: estimateAlzheimerRisk(g.minAge, fazZ)!.risk,
  }));
  return (
    <div className="ad-age">
      <div className={`ad-age-callout${mine ? "" : " none"}`} role="note">
        <span className="ad-age-pin" aria-hidden="true">{age}</span>
        <p>{mine
          ? <>Patient age <strong>{age}</strong> falls in the <strong>{mine}</strong> group. The highlighted card is this patient.</>
          : <>Age <strong>{age}</strong> is under 60. No published baseline exists, so no group is highlighted; the cards show older age groups for comparison.</>}</p>
      </div>
      <ul className="ad-age-grid" aria-label="Estimated Alzheimer risk by age group with this scan's FAZ">
        {groups.map((g) => {
          const isMine = g.label === mine;
          const tone = g.scan > g.prevalence * 1.1 ? "high" : g.scan < g.prevalence * 0.9 ? "low" : "moderate";
          return (
            <li key={g.label} className={isMine ? "mine" : undefined} aria-current={isMine ? "true" : undefined}>
              <div className="ad-age-head"><span>Age {g.label}</span>{isMine ? <em>This patient</em> : null}</div>
              <strong className="ad-age-value" style={{ color: bandColor[tone] }}>{pct(g.scan)}</strong>
              <small>with this scan&apos;s FAZ</small>
              <dl>
                <div><dt>Average person</dt><dd>{pct(g.prevalence)}</dd></div>
                <div><dt>Normal FAZ</dt><dd>{pct(g.normal)}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="ad-age-note">Average person: everyone of that age. Normal FAZ: someone whose FAZ equals the published control average (0.275 mm²). Colour shows this scan against the average: orange higher, teal lower.</p>
    </div>
  );
}

/** Separate card: age-group baseline updated by the measured FAZ, shown as a percentage. */
export function AlzheimerRiskPercentCard({ estimate, age, fazAreaMm2, fazZ }: { estimate: AlzheimerRiskEstimate | null; age: number; fazAreaMm2: number; fazZ: number }) {
  const header = <PanelHeader eyebrow="Age + measured FAZ · literature-based" title="Estimated Alzheimer Risk" badge="Research · not a diagnosis" />;
  if (!estimate) {
    return (
      <section className="panel ad-risk-card" aria-label="Estimated Alzheimer risk">
        {header}
        <p className="ra-finding">Age {age} is under 60. Published age baselines start at 60, so a risk percentage is not computed for this case.</p>
        <AgeComparison age={age} fazZ={fazZ} />
      </section>
    );
  }
  const { baseline, ageGroup, likelihoodRatio, risk } = estimate;
  const level = risk < baseline * 0.9 ? "low" : risk > baseline * 1.1 ? "high" : "moderate";
  const scale = Math.max(risk, baseline) * 1.25;
  const relative = risk / baseline;
  return (
    <section className="panel ad-risk-card" aria-label="Estimated Alzheimer risk">
      {header}
      <div className="ad-risk-body">
        <div className="ad-risk-main">
          <strong className="ad-risk-value" style={{ color: bandColor[level] }}>{pct(risk)}</strong>
          <span>estimated risk of Alzheimer&apos;s disease</span>
          <em className={`ra-level ra-${level}`}><i />{level === "moderate" ? `About the average for age ${ageGroup}` : level === "high" ? `${relative.toFixed(1)}× the average for age ${ageGroup}` : `${(1 / relative).toFixed(1)}× lower than the average for age ${ageGroup}`}</em>
        </div>
        <div className="ad-risk-bars" role="img" aria-label={`Average for age ${ageGroup} ${pct(baseline)}; this scan ${pct(risk)}`}>
          <div><span>Average for age {ageGroup}</span><i><b style={{ width: `${(baseline / scale) * 100}%` }} /></i><strong>{pct(baseline)}</strong></div>
          <div><span>This scan (age + FAZ)</span><i><b style={{ width: `${(risk / scale) * 100}%`, background: bandColor[level] }} /></i><strong>{pct(risk)}</strong></div>
        </div>
        <ol className="ad-risk-steps" aria-label="How the estimate is calculated">
          <li><span>1. Age {age}</span><strong>baseline {pct(baseline)}</strong></li>
          <li><span>2. FAZ {fazAreaMm2.toFixed(3)} mm² ({fazZ > 0 ? "+" : ""}{fazZ.toFixed(2)} SD)</span><strong>odds ×{likelihoodRatio.toFixed(2)}</strong></li>
          <li><span>3. Combined</span><strong>{pct(risk)}</strong></li>
        </ol>
      </div>
      <AgeComparison age={age} fazZ={fazZ} />
      <p className="ra-sim-note"><Info size={15} aria-hidden="true" />Age baseline: Alzheimer&apos;s Association 2024 (US prevalence 5.0% at 65–74, 13.1% at 75–84, 33.3% at 85+); 60–64 ≈ 0.23%, derived from young-onset dementia prevalence (Hendriks et al., JAMA Neurology 2021) × the Alzheimer share. FAZ effect: Alzheimer shift 0.54 SD against controls 0.275 ± 0.10 mm². Vessel density is not added because it has no published reference in this model&apos;s units and overlaps with FAZ. Not validated on patients with known diagnoses; not a diagnosis.</p>
    </section>
  );
}

export type MetricRow ={ label: string; display: string; value: number | null; watch?: boolean };

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
