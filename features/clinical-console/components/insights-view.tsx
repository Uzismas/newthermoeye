"use client";

import { useState } from "react";
import { researchEvidence } from "../mock-data";
import { PanelHeader, SectionHeading } from "./shared";

export function InsightsView({ isExporting = false, onExport }: { isExporting?: boolean; onExport?: () => void }) {
  return <section className="view active" aria-labelledby="insights-title">
    <SectionHeading eyebrow="Research context" title="Data Insights" note="Disease risk aggregates are unavailable because no validated disease classifier is connected." actions={<button className="ghost-button" type="button" onClick={onExport} disabled={isExporting || !onExport}>{isExporting ? "Preparing PDF..." : "Export Insights Report"}</button>} />
    <div className="metrics-grid">
      {["Disease risk distribution", "Average disease risk", "Disease feature importance", "Hospital comparison"].map((label) => <article className="metric metric-blue" key={label}><span>{label}</span><strong>N/A</strong><small>No validated disease output or connected aggregate source</small></article>)}
    </div>
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
