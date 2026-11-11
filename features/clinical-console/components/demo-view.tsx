"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { demoCases, riskLevel, rocAndMatrix, weeklyScans, type DemoGroup } from "../demo-data";
import { DemoTrainingPanel } from "./demo-panels";
import { PanelHeader, SectionHeading } from "./shared";

const tone: Record<string, string> = { Low: "low", Moderate: "moderate", High: "high" };
const pct = (v: number) => `${Math.round(v * 100)}%`;


export function DemoView() {
  const [selectedId, setSelectedId] = useState("DEMO-300");
  const [filter, setFilter] = useState<"All" | DemoGroup>("All");
  const stats = useMemo(() => rocAndMatrix(0.5), []);
  const shown = demoCases.filter((c) => filter === "All" || c.group === filter).slice(-12).reverse();
  const selected = demoCases.find((c) => c.id === selectedId) ?? demoCases[0];
  const levels = (["Low", "Moderate", "High"] as const).map((l) => ({ l, n: demoCases.filter((c) => riskLevel(c.score) === l).length }));
  const total = demoCases.length;
  const a = (levels[0].n / total) * 100;
  const b = a + (levels[1].n / total) * 100;
  const meanVd = demoCases.reduce((s, c) => s + c.vesselDensity, 0) / total;
  const maxScan = Math.max(...weeklyScans.map((w) => w[1]));

  return (
    <section className="view active" aria-labelledby="demo-title">
      <div className="demo-banner" role="note">
        <strong>SIMULATED DEMO DATA</strong>
        <span>Every number on this page is made up to show what the product could look like. It is not a result from the real model, patients, or any study, and it must not be quoted as performance.</span>
      </div>

      <SectionHeading eyebrow="Preview of a future disease-screening workflow" title={<span id="demo-title">Demo Preview</span>} note="Real analyses live in Dashboard and Analysis Results. This page only illustrates the layout once a validated classifier and a larger cohort exist." />

      <div className="metrics-grid">
        <article className="metric metric-blue"><span>Scans reviewed (simulated)</span><strong>{total}</strong><small>3 groups: Control / MCI / AD</small></article>
        <article className="metric metric-green"><span>Mean vessel density</span><strong>{meanVd.toFixed(1)}%</strong><small>Simulated, differs by group</small></article>
        <article className="metric metric-orange"><span>Simulated AUC</span><strong>{stats.auc.toFixed(2)}</strong><small>Control vs MCI/AD, threshold 0.50</small></article>
        <article className="metric metric-purple"><span>High-risk share</span><strong>{pct(levels[2].n / total)}</strong><small>{levels[2].n} of {total} simulated cases</small></article>
      </div>

      <div className="dashboard-main-grid">
        <section className="panel" aria-labelledby="demo-risk">
          <PanelHeader eyebrow="Score distribution" title="Risk level mix" badge="Simulated" badgeTone="warning" />
          <div className="risk-donut-wrap">
            <div className="donut-chart" role="img" aria-label={`Low ${levels[0].n}, moderate ${levels[1].n}, high ${levels[2].n}`} style={{ background: `radial-gradient(circle at center, #fff 0 54%, transparent 55%), conic-gradient(var(--green) 0 ${a}%, var(--amber) ${a}% ${b}%, var(--red) ${b}% 100%)` }}>
              <strong>{total}</strong><span>Cases</span>
            </div>
            <div className="donut-legend">
              {levels.map((x) => <span key={x.l}><i className={`dot ${x.l === "Low" ? "low" : x.l === "Moderate" ? "moderate" : "high"}-dot`} /> {x.l} <strong>{x.n} ({pct(x.n / total)})</strong></span>)}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="demo-week">
          <PanelHeader eyebrow="Throughput" title="Scans per day" badge="Simulated" badgeTone="warning" />
          <div className="demo-bars" role="img" aria-label="Uploaded and analysed scans per weekday">
            {weeklyScans.map(([d, up, an]) => (
              <div key={d}><i style={{ "--h": `${Math.round((up / maxScan) * 140)}px` } as CSSProperties}><b style={{ height: `${(an / up) * 100}%` }} /></i><span>{d}</span></div>
            ))}
          </div>
          <p className="panel-footnote">Light bar: uploaded. Dark: analysed.</p>
        </section>

        <section className="panel" aria-labelledby="demo-sel">
          <PanelHeader eyebrow="Selected case" title={selected.id} badge={selected.group} />
          <div className={`demo-gauge ${tone[riskLevel(selected.score)]}`} style={{ "--p": `${selected.score * 100}%` } as CSSProperties}>
            <strong>{selected.score.toFixed(2)}</strong><span>{riskLevel(selected.score)} score</span>
          </div>
          <dl className="demo-dl">
            <div><dt>Confidence</dt><dd>{pct(selected.confidence)}</dd></div>
            <div><dt>Vessel density</dt><dd>{selected.vesselDensity}%</dd></div>
            <div><dt>Central non-vessel</dt><dd>{pct(selected.faz)}</dd></div>
            <div><dt>Age / sex / eye</dt><dd>{selected.age} / {selected.sex} / {selected.eye}</dd></div>
          </dl>
        </section>
      </div>

      <section className="panel">
        <PanelHeader eyebrow="Case queue" title="Recent simulated cases" badge={`${shown.length} shown`} />
        <div className="task-toolbar" role="group" aria-label="Filter by simulated group">
          {(["All", "Control", "MCI", "AD"] as const).map((g) => <button key={g} type="button" className={`task-filter ${filter === g ? "active" : ""}`} aria-pressed={filter === g} onClick={() => setFilter(g)}>{g}</button>)}
        </div>
        <div className="demo-table-wrap">
          <table className="case-table">
            <caption className="visually-hidden">Simulated cases</caption>
            <thead><tr className="case-row table-head"><th scope="col">Case</th><th scope="col">Group</th><th scope="col">Score</th><th scope="col">Level</th><th scope="col">Vessel density</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr className={`case-row ${c.id === selected.id ? "active" : ""}`} key={c.id}>
                  <td><button className="case-select-button" type="button" aria-pressed={c.id === selected.id} onClick={() => setSelectedId(c.id)}><strong>{c.id}</strong><small>{c.age}{c.sex} · {c.eye}</small></button></td>
                  <td>{c.group}</td><td>{c.score.toFixed(2)}</td>
                  <td><span className={`risk-chip ${tone[riskLevel(c.score)]}`}>{riskLevel(c.score)}</span></td>
                  <td>{c.vesselDensity}%</td>
                  <td><span className={`status-pill ${c.status === "Report ready" ? "" : "pending"}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DemoTrainingPanel />
    </section>
  );
}
