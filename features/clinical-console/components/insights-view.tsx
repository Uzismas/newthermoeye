"use client";

import { useState } from "react";
import { researchEvidence } from "../mock-data";
import { SUMMARY_AGE, testScanSummary } from "../model-evaluation";
import { ChartCard, HBars } from "./demo-charts";
import { PanelHeader, SectionHeading } from "./shared";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function InsightsView({ isExporting = false, onExport }: { isExporting?: boolean; onExport?: () => void }) {
  const t = testScanSummary();
  return <section className="view active" aria-labelledby="insights-title">
    <SectionHeading eyebrow="Research context" title="Data Insights" note={`From the ${t.scans.length} real ROSE-O test scans, assuming age ${SUMMARY_AGE}. Literature-based estimates, not a validated classifier.`} actions={<button className="ghost-button" type="button" onClick={onExport} disabled={isExporting || !onExport}>{isExporting ? "Preparing PDF..." : "Export Insights Report"}</button>} />
    <div className="metrics-grid">
      <article className="metric metric-blue"><span>Alzheimer FAZ index distribution</span><strong>{t.bands.low} / {t.bands.moderate} / {t.bands.high}</strong><small>Low / Moderate / High · {t.scans.length} test scans</small></article>
      <article className="metric metric-orange"><span>Average estimated Alzheimer risk</span><strong>{pct(t.meanRisk)}</strong><small>Age {t.ageGroup} population average {pct(t.baseline)}</small></article>
      <article className="metric metric-purple"><span>What drives the risk</span><strong>FAZ area</strong><small>Odds ×{t.lrMin.toFixed(2)} to ×{t.lrMax.toFixed(2)} across the scans; age sets the baseline</small></article>
      <article className="metric metric-blue"><span>Hospital comparison</span><strong>N/A</strong><small>Scans come from one public dataset, not partner hospitals</small></article>
    </div>
    <section className="panel">
      <PanelHeader eyebrow="Real test scans" title="Estimated Alzheimer risk per scan" badge="Literature-based" badgeTone="warning" />
      <div className="ec-grid">
        <ChartCard title={`Risk at age ${SUMMARY_AGE} (%)`} takeaway={`Orange = above the age ${t.ageGroup} average of ${pct(t.baseline)}. Larger FAZ, higher estimate.`}>
          <HBars max={10} unit="%" label="Estimated Alzheimer risk per test scan" rows={t.scans.map((s) => [`test_${s.id}`, Math.round(s.risk * 1000) / 10, s.risk > s.baseline * 1.1 ? "warn" : undefined] as const)} />
        </ChartCard>
        <ChartCard title="FAZ area (mm²)" takeaway={`Mean ${t.meanFaz.toFixed(3)} mm²; published control average 0.275 mm².`}>
          <HBars max={0.5} label="FAZ area per test scan" rows={t.scans.map((s) => [`test_${s.id}`, s.faz, s.faz > 0.375 ? "warn" : undefined] as const)} />
        </ChartCard>
      </div>
      <p className="panel-footnote">FAZ measured by the AI on each scan. Risk = age baseline (Alzheimer&apos;s Association 2024) × FAZ likelihood ratio (meta-analysis). The people in these scans have no recorded diagnosis, so these estimates have not been checked against real outcomes.</p>
    </section>
    <section className="panel research-evidence-panel">
      <PanelHeader eyebrow="External literature" title="Research evidence board" badge="Background only" badgeTone="warning" />
      <div className="evidence-lead"><p>These sources describe retinal imaging research. They do not establish the performance or diagnostic capability of Thermoeye. Synthetic demonstration cases and segmentation measurements cannot establish disease status.</p></div>
      <EvidenceBoard />
    </section>
  </section>;
}

function EvidenceBoard() {
  const diseases = ["All", ...new Set(researchEvidence.map((item) => item.type))];
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? researchEvidence : researchEvidence.filter((e) => e.type === active);
  return (
    <>
      <div className="tab-strip" role="tablist" aria-label="Filter evidence by disease">
        {diseases.map((d) => (
          <button key={d} type="button" role="tab" aria-selected={active === d} className={active === d ? "active" : ""} onClick={() => setActive(d)}>{d}</button>
        ))}
      </div>
      <div className="evidence-grid">
        {filtered.map((item) => (
          <article className="evidence-card" key={item.url}>
            <span>{item.type}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <a href={item.url} target="_blank" rel="noreferrer">Open source ↗</a>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
      <p className="evidence-rights-note">
        ResearchGate figures are linked as external references. Image reuse rights must be confirmed before embedding into product assets.
      </p>
    </>
  );
}
