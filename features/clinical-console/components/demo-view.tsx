"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { demoCases, riskLevel, rocAndMatrix, trainingCurve, weeklyScans, type DemoGroup } from "../demo-data";
import { PanelHeader, SectionHeading } from "./shared";

const tone: Record<string, string> = { Low: "low", Moderate: "moderate", High: "high" };
const pct = (v: number) => `${Math.round(v * 100)}%`;

function line(values: number[], w: number, h: number, lo: number, hi: number) {
  return values.map((v, i) => `${i ? "L" : "M"}${(i / (values.length - 1)) * w},${h - ((v - lo) / (hi - lo)) * h}`).join(" ");
}

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
  const last = trainingCurve[trainingCurve.length - 1];
  const bestEpoch = trainingCurve.reduce((m, p) => (p.val < m.val ? p : m));

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

      <section className="panel" aria-labelledby="demo-ai">
        <PanelHeader eyebrow="AI training" title="Model training dashboard" badge="Simulated" badgeTone="warning" />
        <div className="metrics-grid">
          <article className="metric metric-green"><span>Validation AUC</span><strong>{stats.auc.toFixed(2)}</strong><small>Epoch {last.epoch} of {trainingCurve.length}</small></article>
          <article className="metric metric-blue"><span>Sensitivity</span><strong>{pct(stats.sensitivity)}</strong><small>Specificity {pct(stats.specificity)}</small></article>
          <article className="metric metric-orange"><span>Best epoch</span><strong>{bestEpoch.epoch}</strong><small>Lowest validation loss {bestEpoch.val.toFixed(2)}</small></article>
          <article className="metric metric-purple"><span>PPV</span><strong>{pct(stats.ppv)}</strong><small>Precision at threshold 0.50</small></article>
        </div>
        <div className="demo-charts">
          <figure>
            <svg viewBox="0 0 320 180" role="img" aria-label="Training and validation loss by epoch">
              <path d={line(trainingCurve.map((p) => p.train), 300, 150, 0.1, 1.2)} transform="translate(10,10)" className="demo-line train" />
              <path d={line(trainingCurve.map((p) => p.val), 300, 150, 0.1, 1.2)} transform="translate(10,10)" className="demo-line val" />
              <path d={line(trainingCurve.map((p) => p.auc), 300, 150, 0.4, 1)} transform="translate(10,10)" className="demo-line auc" />
            </svg>
            <figcaption><i className="dot blue-dot" /> train loss <i className="dot high-dot" /> validation loss <i className="dot green-dot" /> AUC · 40 epochs</figcaption>
          </figure>
          <figure>
            <svg viewBox="0 0 200 200" role="img" aria-label="ROC curve">
              <rect x="20" y="10" width="170" height="170" className="demo-frame" />
              <path d="M20,180 L190,10" className="demo-diag" />
              <path d={stats.points.map((p, i) => `${i ? "L" : "M"}${20 + p.fpr * 170},${180 - p.tpr * 170}`).join(" ")} className="demo-line val" />
            </svg>
            <figcaption>ROC · AUC {stats.auc.toFixed(2)} · n={stats.n} simulated</figcaption>
          </figure>
          <figure>
            <div className="demo-matrix" role="img" aria-label="Confusion matrix">
              <span /><b>Pred +</b><b>Pred −</b>
              <b>True +</b><i className="ok">{stats.tp}</i><i>{stats.fn}</i>
              <b>True −</b><i>{stats.fp}</i><i className="ok">{stats.tn}</i>
            </div>
            <figcaption>Confusion matrix at 0.50</figcaption>
          </figure>
        </div>
      </section>
    </section>
  );
}
