"use client";

import type { CSSProperties } from "react";
import { calibrationBins, demoCases, demoGovernance, demoOps, driftWeeks, errorCases, modelVersions, riskLevel, rocAndMatrix, trainingCurve } from "../demo-data";
import { PanelHeader } from "./shared";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const stats = rocAndMatrix(0.5);

function line(values: number[], w: number, h: number, lo: number, hi: number) {
  return values.map((v, i) => `${i ? "L" : "M"}${(i / (values.length - 1)) * w},${h - ((v - lo) / (hi - lo)) * h}`).join(" ");
}

function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Bars({ rows, max, label }: { rows: readonly (readonly [string, number])[]; max?: number; label: string }) {
  const top = max ?? Math.max(...rows.map((r) => r[1]), 1);
  return (
    <div className="queue-bars" aria-label={label}>
      {rows.map(([name, n]) => <span className="queue-bar good" key={name}><strong>{name}</strong><i style={{ "--bar": `${(n / top) * 100}%` } as CSSProperties} /><em>{n}</em></span>)}
    </div>
  );
}

function ConfusionMatrix() {
  return (
    <div className="demo-matrix" role="img" aria-label={`Confusion matrix: ${stats.tp} true positive, ${stats.fn} missed, ${stats.fp} false alarms, ${stats.tn} true negative`}>
      <span /><b>Pred +</b><b>Pred −</b>
      <b>True +</b><i className="ok">{stats.tp}</i><i>{stats.fn}</i>
      <b>True −</b><i>{stats.fp}</i><i className="ok">{stats.tn}</i>
    </div>
  );
}

function RocChart() {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label="ROC curve">
      <rect x="20" y="10" width="170" height="170" className="demo-frame" />
      <path d="M20,180 L190,10" className="demo-diag" />
      <path d={stats.points.map((p, i) => `${i ? "L" : "M"}${20 + p.fpr * 170},${180 - p.tpr * 170}`).join(" ")} className="demo-line val" />
    </svg>
  );
}

export function DemoTrainingPanel() {
  const bestEpoch = trainingCurve.reduce((m, p) => (p.val < m.val ? p : m));
  return (
    <section className="panel" aria-labelledby="demo-ai">
      <PanelHeader eyebrow="AI training" title="Model training dashboard" badge="Simulated" badgeTone="warning" />
      <div className="metrics-grid">
        <Metric label="Validation AUC" value={stats.auc.toFixed(2)} note={`Epoch ${trainingCurve.length} of ${trainingCurve.length}`} tone="green" />
        <Metric label="Sensitivity" value={pct(stats.sensitivity)} note={`Specificity ${pct(stats.specificity)}`} />
        <Metric label="Best epoch" value={String(bestEpoch.epoch)} note={`Lowest validation loss ${bestEpoch.val.toFixed(2)}`} tone="orange" />
        <Metric label="PPV" value={pct(stats.ppv)} note="Precision at threshold 0.50" tone="purple" />
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
        <figure><RocChart /><figcaption>ROC · AUC {stats.auc.toFixed(2)} · n={stats.n} simulated</figcaption></figure>
        <figure><ConfusionMatrix /><figcaption>Confusion matrix at 0.50</figcaption></figure>
      </div>
    </section>
  );
}

export function DemoPerformance({ subview }: { subview: string }) {
  const f1 = (2 * stats.ppv * stats.sensitivity) / (stats.ppv + stats.sensitivity);
  const acc = (stats.tp + stats.tn) / (stats.tp + stats.tn + stats.fp + stats.fn);
  const bins = calibrationBins();
  const groups = (["Control", "MCI", "AD"] as const).map((g) => {
    const rows = demoCases.filter((c) => c.group === g);
    return [g, Math.round((rows.reduce((a, c) => a + c.score, 0) / rows.length) * 100) / 100] as const;
  });

  const note = <p className="panel-footnote">Simulated numbers for layout preview only. The real model measures vessels; no disease classifier exists.</p>;

  if (subview === "metrics") {
    return (
      <>
        <div className="metrics-grid">
          <Metric label="Disease AUC" value={stats.auc.toFixed(2)} note="Simulated" tone="green" />
          <Metric label="Accuracy" value={pct(acc)} note="Threshold 0.50" />
          <Metric label="Sensitivity" value={pct(stats.sensitivity)} note="Recall of MCI/AD" tone="orange" />
          <Metric label="Specificity" value={pct(stats.specificity)} note="Controls cleared" tone="purple" />
          <Metric label="F1" value={f1.toFixed(2)} note="Harmonic mean" />
          <Metric label="Precision" value={pct(stats.ppv)} note="PPV" tone="green" />
        </div>
        <div className="demo-charts">
          <figure><RocChart /><figcaption>ROC curve · AUC {stats.auc.toFixed(2)}</figcaption></figure>
          <figure>
            <Bars rows={groups.map(([g, v]) => [g, Math.round(v * 100)] as const)} max={100} label="Mean score by group" />
            <figcaption>Mean simulated score (0–100) by group</figcaption>
          </figure>
          <figure><ConfusionMatrix /><figcaption>Confusion matrix at 0.50</figcaption></figure>
        </div>
        {note}
      </>
    );
  }

  if (subview === "calibration") {
    return (
      <section className="panel">
        <PanelHeader eyebrow="Calibration" title="Predicted vs observed" badge="Simulated" badgeTone="warning" />
        <div className="demo-charts">
          <figure>
            <svg viewBox="0 0 200 200" role="img" aria-label="Calibration curve">
              <rect x="20" y="10" width="170" height="170" className="demo-frame" />
              <path d="M20,180 L190,10" className="demo-diag" />
              <path d={bins.filter((b) => b.observed != null).map((b, i) => `${i ? "L" : "M"}${20 + b.predicted * 170},${180 - (b.observed as number) * 170}`).join(" ")} className="demo-line val" />
            </svg>
            <figcaption>Dashed line = perfect calibration</figcaption>
          </figure>
          <figure>
            <Bars rows={bins.map((b) => [`${Math.round((b.predicted - 0.05) * 100)}–${Math.round((b.predicted + 0.05) * 100)}`, b.n] as const)} label="Cases per score bin" />
            <figcaption>Cases per score bin</figcaption>
          </figure>
        </div>
        {note}
      </section>
    );
  }

  if (subview === "error-analysis") {
    const list = (title: string, rows: typeof errorCases.missed) => (
      <div className="demo-table-wrap">
        <h3 className="demo-subhead">{title}</h3>
        <table className="case-table"><thead><tr className="case-row table-head"><th scope="col">Case</th><th scope="col">Group</th><th scope="col">Score</th><th scope="col">Level</th></tr></thead>
          <tbody>{rows.map((c) => <tr className="case-row" key={c.id}><td><strong>{c.id}</strong></td><td>{c.group}</td><td>{c.score.toFixed(2)}</td><td><span className={`risk-chip ${riskLevel(c.score).toLowerCase()}`}>{riskLevel(c.score)}</span></td></tr>)}</tbody>
        </table>
      </div>
    );
    return (
      <section className="panel">
        <PanelHeader eyebrow="Error analysis" title="Where the model is wrong" badge="Simulated" badgeTone="warning" />
        <div className="demo-charts"><figure><ConfusionMatrix /><figcaption>{stats.fn} missed · {stats.fp} false alarms</figcaption></figure></div>
        <div className="demo-two">{list("Lowest-scored MCI/AD (missed)", errorCases.missed)}{list("Highest-scored controls (false alarms)", errorCases.falseAlarms)}</div>
        {note}
      </section>
    );
  }

  if (subview === "drift") {
    return (
      <section className="panel">
        <PanelHeader eyebrow="Monitoring" title="Weekly drift" badge="Simulated" badgeTone="warning" />
        <div className="demo-charts">
          <figure>
            <svg viewBox="0 0 320 180" role="img" aria-label="Weekly AUC and mean score">
              <path d={line(driftWeeks.map((w) => w.auc), 300, 150, 0.9, 0.97)} transform="translate(10,10)" className="demo-line auc" />
              <path d={line(driftWeeks.map((w) => w.meanScore), 300, 150, 0.36, 0.46)} transform="translate(10,10)" className="demo-line train" />
            </svg>
            <figcaption><i className="dot green-dot" /> weekly AUC <i className="dot blue-dot" /> mean score · 12 weeks</figcaption>
          </figure>
          <figure>
            <Bars rows={driftWeeks.slice(-6).map((w) => [w.week, Math.round(w.auc * 100)] as const)} max={100} label="Recent weekly AUC" />
            <figcaption>Last 6 weeks AUC (%) · small dip after W10 flagged for review</figcaption>
          </figure>
        </div>
        {note}
      </section>
    );
  }

  if (subview === "version-history") {
    return (
      <section className="panel">
        <PanelHeader eyebrow="Releases" title="Model versions" badge="Simulated" badgeTone="warning" />
        <div className="demo-table-wrap">
          <table className="case-table"><thead><tr className="case-row table-head"><th scope="col">Version</th><th scope="col">Date</th><th scope="col">AUC</th><th scope="col">Change</th><th scope="col">State</th></tr></thead>
            <tbody>{modelVersions.map((m) => <tr className="case-row" key={m.version}><td><strong>{m.version}</strong></td><td>{m.date}</td><td>{m.auc.toFixed(2)}</td><td>{m.note}</td><td><span className={`status-pill ${m.current ? "" : "pending"}`}>{m.current ? "Current" : "Retired"}</span></td></tr>)}</tbody>
          </table>
        </div>
        {note}
      </section>
    );
  }

  return (
    <>
      <div className="metrics-grid">
        <Metric label="Training cases" value={String(demoGovernance.split[0][1])} note="Patient-level split" tone="green" />
        <Metric label="Validation / test" value={`${demoGovernance.split[1][1]} / ${demoGovernance.split[2][1]}`} note="Test set locked" />
        <Metric label="Model version" value="v0.4.0" note="Demo release 2026-11-10" tone="orange" />
        <Metric label="Quality pass" value={pct(demoOps.measured / (demoOps.measured + demoOps.blocked))} note={`${demoOps.blocked} images blocked`} tone="purple" />
      </div>
      <DemoTrainingPanel />
    </>
  );
}

export function DemoGovernance({ subview }: { subview: string }) {
  const g = demoGovernance;
  const note = <p className="panel-footnote">Simulated numbers for layout preview only. No dataset registry or consent system is connected.</p>;
  const totalConsent = g.consent.granted + g.consent.pending + g.consent.withdrawn;
  const rows: Record<string, React.ReactNode> = {
    "data-overview": (
      <div className="demo-charts">
        <figure><Bars rows={g.split} label="Dataset split" /><figcaption>Patient-level split (300 cases)</figcaption></figure>
        <figure><Bars rows={(["Control", "MCI", "AD"] as const).map((x) => [x, demoCases.filter((c) => c.group === x).length] as const)} label="Cases per group" /><figcaption>Cases per diagnostic group</figcaption></figure>
      </div>
    ),
    "data-sources": (
      <div className="demo-table-wrap">
        <table className="case-table"><thead><tr className="case-row table-head"><th scope="col">Source</th><th scope="col">Scans</th><th scope="col">Protocol</th><th scope="col">Status</th></tr></thead>
          <tbody>{g.sources.map((s) => <tr className="case-row" key={s.name}><td><strong>{s.name}</strong></td><td>{s.n}</td><td>{s.kind}</td><td><span className={`status-pill ${s.status === "Active" ? "" : "pending"}`}>{s.status}</span></td></tr>)}</tbody>
        </table>
      </div>
    ),
    deidentification: (
      <div className="demo-charts">
        <figure><Bars rows={[["Verified", g.deid.verified], ["Flagged for review", g.deid.flagged]] as const} max={300} label="De-identification" /><figcaption>{Math.round((g.deid.verified / 300) * 100)}% verified clean</figcaption></figure>
      </div>
    ),
    consent: (
      <div className="demo-charts">
        <figure><Bars rows={[["Granted", g.consent.granted], ["Pending", g.consent.pending], ["Withdrawn", g.consent.withdrawn]] as const} max={totalConsent} label="Consent status" /><figcaption>{Math.round((g.consent.granted / totalConsent) * 100)}% granted</figcaption></figure>
      </div>
    ),
    "usage-log": (
      <div className="demo-charts"><figure><Bars rows={g.usage} label="Data usage by purpose" /><figcaption>Accesses by purpose, last 30 days</figcaption></figure></div>
    ),
  };
  return (
    <>
      <div className="metrics-grid">
        <Metric label="Dataset registry" value={`${g.sources.length} sources`} note={`${demoOps.total} scans (simulated)`} />
        <Metric label="Consent verified" value={`${Math.round((g.consent.granted / totalConsent) * 100)}%`} note={`${g.consent.pending} pending`} tone="green" />
        <Metric label="De-identified" value={`${Math.round((g.deid.verified / 300) * 100)}%`} note={`${g.deid.flagged} flagged`} tone="orange" />
        <Metric label="Clinical validation" value="Pending" note="Not started — shown honestly" tone="purple" />
      </div>
      <section className="panel">
        <PanelHeader eyebrow="Overview" title="Simulated registry view" badge="Simulated" badgeTone="warning" />
        {rows[subview] ?? rows["data-overview"]}
        {note}
      </section>
    </>
  );
}
