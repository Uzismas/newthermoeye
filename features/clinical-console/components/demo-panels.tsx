"use client";

import type { CSSProperties, ReactNode } from "react";
import { calibrationBins, demoCases, demoGovernance, demoOps, driftWeeks, errorCases, modelVersions, riskLevel, rocAndMatrix, trainingCurve } from "../demo-data";
import { CalibrationChart, ChartCard, ConfusionMatrix, HBars, LegendItem, LineChart, RocChart, chartColor } from "./demo-charts";
import { PanelHeader } from "./shared";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const stats = rocAndMatrix(0.5);
const op = { fpr: stats.fp / (stats.fp + stats.tn), tpr: stats.sensitivity };

function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

const SimNote = ({ children }: { children?: ReactNode }) => (
  <p className="panel-footnote">{children ?? "Simulated numbers for layout preview only. The real model measures vessels; no disease classifier exists."}</p>
);

const epochs = trainingCurve.map((p) => String(p.epoch));
const bestEpoch = trainingCurve.reduce((m, p) => (p.val < m.val ? p : m));

export function DemoTrainingPanel() {
  return (
    <section className="panel" aria-labelledby="demo-ai">
      <PanelHeader eyebrow="AI training" title="Training run" badge="Simulated" badgeTone="warning" />
      <div className="ec-grid">
        <ChartCard wide title="Loss by epoch" takeaway={`Validation loss bottoms out at epoch ${bestEpoch.epoch}, then drifts up: the model starts to overfit.`}
          legend={<><LegendItem color={chartColor.sky} label="Train loss" /><LegendItem color={chartColor.deep} label="Validation loss" /><LegendItem color={chartColor.amber} label="Best epoch" dashed /></>}>
          <LineChart wide label="Training and validation loss by epoch" xLabels={epochs} xEvery={5} lo={0.2} hi={1.2} yTicks={[0.2, 0.5, 0.8, 1.1]} fmt={(v) => v.toFixed(1)} xTitle="Epoch" yTitle="Loss"
            marker={{ index: bestEpoch.epoch - 1, label: `Best · epoch ${bestEpoch.epoch}` }}
            series={[{ name: "train", values: trainingCurve.map((p) => p.train), color: chartColor.sky }, { name: "val", values: trainingCurve.map((p) => p.val), color: chartColor.deep }]} />
        </ChartCard>
        <ChartCard title="Validation AUC" takeaway={`Climbs to ${stats.auc.toFixed(2)} and levels off.`}>
          <LineChart label="Validation AUC by epoch" xLabels={epochs} xEvery={10} lo={0.5} hi={1} yTicks={[0.5, 0.75, 1]} fmt={(v) => v.toFixed(2)} xTitle="Epoch" yTitle="AUC"
            series={[{ name: "auc", values: trainingCurve.map((p) => p.auc), color: chartColor.teal, area: true }]} />
        </ChartCard>
        <ChartCard title="ROC curve" takeaway="Higher and further left is better. Dot = chosen threshold."><RocChart points={stats.points} auc={stats.auc} op={op} /></ChartCard>
        <ChartCard title="Confusion matrix" takeaway={`${stats.fn} of ${stats.tp + stats.fn} MCI/AD cases missed at 0.50.`}><ConfusionMatrix tp={stats.tp} fn={stats.fn} fp={stats.fp} tn={stats.tn} /></ChartCard>
        <ChartCard title="At threshold 0.50" takeaway="Raising the cut-off trades sensitivity for fewer false alarms.">
          <HBars max={100} unit="%" label="Metrics at threshold 0.50" rows={[["Sensitivity", Math.round(stats.sensitivity * 100)], ["Specificity", Math.round(stats.specificity * 100)], ["Precision", Math.round(stats.ppv * 100)], ["Accuracy", Math.round(((stats.tp + stats.tn) / stats.n) * 100)]]} />
        </ChartCard>
      </div>
    </section>
  );
}

export function DemoPerformance({ subview }: { subview: string }) {
  const f1 = (2 * stats.ppv * stats.sensitivity) / (stats.ppv + stats.sensitivity);
  const acc = (stats.tp + stats.tn) / (stats.tp + stats.tn + stats.fp + stats.fn);
  const groups = (["Control", "MCI", "AD"] as const).map((g) => {
    const rows = demoCases.filter((c) => c.group === g);
    return [g, Math.round((rows.reduce((a, c) => a + c.score, 0) / rows.length) * 100)] as const;
  });

  if (subview === "metrics") {
    return (
      <>
        <div className="metrics-grid six">
          <Metric label="Disease AUC" value={stats.auc.toFixed(2)} note="Simulated" tone="green" />
          <Metric label="Accuracy" value={pct(acc)} note="Threshold 0.50" />
          <Metric label="Sensitivity" value={pct(stats.sensitivity)} note="Recall of MCI/AD" tone="orange" />
          <Metric label="Specificity" value={pct(stats.specificity)} note="Controls cleared" tone="purple" />
          <Metric label="F1" value={f1.toFixed(2)} note="Harmonic mean" />
          <Metric label="Precision" value={pct(stats.ppv)} note="PPV" tone="green" />
        </div>
        <section className="panel">
          <PanelHeader eyebrow="Discrimination" title="How well scores separate the groups" badge="Simulated" badgeTone="warning" />
          <div className="ec-grid">
            <ChartCard title="ROC curve" takeaway="Dot = chosen threshold 0.50."><RocChart points={stats.points} auc={stats.auc} op={op} /></ChartCard>
            <ChartCard title="Mean score by group" takeaway="Scores rise with disease stage, as designed for this demo."><HBars rows={groups} max={100} label="Mean score by group" /></ChartCard>
            <ChartCard title="Confusion matrix"><ConfusionMatrix tp={stats.tp} fn={stats.fn} fp={stats.fp} tn={stats.tn} /></ChartCard>
          </div>
          <SimNote />
        </section>
      </>
    );
  }

  if (subview === "calibration") {
    const bins = calibrationBins();
    return (
      <section className="panel">
        <PanelHeader eyebrow="Calibration" title="Do scores mean what they say?" badge="Simulated" badgeTone="warning" />
        <div className="ec-grid">
          <ChartCard title="Predicted vs observed" takeaway="On the dashed line a score of 0.7 means 70% really are MCI/AD. Bubble size = cases in bin."><CalibrationChart bins={bins} /></ChartCard>
          <ChartCard title="Cases per score bin" takeaway="Most simulated cases sit at the low end.">
            <HBars rows={bins.map((b) => [`${Math.round((b.predicted - 0.05) * 100)}–${Math.round((b.predicted + 0.05) * 100)}`, b.n] as const)} label="Cases per score bin" />
          </ChartCard>
        </div>
        <SimNote />
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
        <div className="ec-grid">
          <ChartCard title="Confusion matrix" takeaway={`${stats.fn} missed · ${stats.fp} false alarms out of ${stats.n}.`}><ConfusionMatrix tp={stats.tp} fn={stats.fn} fp={stats.fp} tn={stats.tn} /></ChartCard>
        </div>
        <div className="demo-two">{list("Lowest-scored MCI/AD (missed)", errorCases.missed)}{list("Highest-scored controls (false alarms)", errorCases.falseAlarms)}</div>
        <SimNote />
      </section>
    );
  }

  if (subview === "drift") {
    const weeks = driftWeeks.map((w) => w.week);
    return (
      <section className="panel">
        <PanelHeader eyebrow="Monitoring" title="Weekly drift" badge="Simulated" badgeTone="warning" />
        <div className="ec-grid">
          <ChartCard title="Weekly AUC" takeaway="A small dip after W10 is flagged for review." legend={<LegendItem color={chartColor.amber} label="Flag point" dashed />}>
            <LineChart label="Weekly AUC over 12 weeks" xLabels={weeks} xEvery={2} lo={0.9} hi={0.97} yTicks={[0.9, 0.93, 0.96]} fmt={(v) => v.toFixed(2)} marker={{ index: 9, label: "Review" }}
              series={[{ name: "auc", values: driftWeeks.map((w) => w.auc), color: chartColor.teal, area: true }]} />
          </ChartCard>
          <ChartCard title="Mean score" takeaway="Population drifts slightly upward in the last weeks.">
            <LineChart label="Mean score over 12 weeks" xLabels={weeks} xEvery={2} lo={0.36} hi={0.46} yTicks={[0.38, 0.41, 0.44]} fmt={(v) => v.toFixed(2)}
              series={[{ name: "score", values: driftWeeks.map((w) => w.meanScore), color: chartColor.deep, area: true }]} />
          </ChartCard>
        </div>
        <SimNote />
      </section>
    );
  }

  if (subview === "version-history") {
    return (
      <section className="panel">
        <PanelHeader eyebrow="Releases" title="Model versions" badge="Simulated" badgeTone="warning" />
        <div className="ec-grid">
          <ChartCard wide title="AUC by release" takeaway="Each release improves on the last.">
            <LineChart wide label="AUC by model release" xLabels={[...modelVersions].reverse().map((m) => m.version.split(" ")[0])} lo={0.8} hi={1} yTicks={[0.8, 0.9, 1]} fmt={(v) => v.toFixed(2)}
              series={[{ name: "auc", values: [...modelVersions].reverse().map((m) => m.auc), color: chartColor.deep, area: true }]} />
          </ChartCard>
        </div>
        <div className="demo-table-wrap">
          <table className="case-table"><thead><tr className="case-row table-head"><th scope="col">Version</th><th scope="col">Date</th><th scope="col">AUC</th><th scope="col">Change</th><th scope="col">State</th></tr></thead>
            <tbody>{modelVersions.map((m) => <tr className="case-row" key={m.version}><td><strong>{m.version}</strong></td><td>{m.date}</td><td>{m.auc.toFixed(2)}</td><td>{m.note}</td><td><span className={`status-pill ${m.current ? "" : "pending"}`}>{m.current ? "Current" : "Retired"}</span></td></tr>)}</tbody>
          </table>
        </div>
        <SimNote />
      </section>
    );
  }

  return (
    <>
      <div className="metrics-grid">
        <Metric label="Disease AUC" value={stats.auc.toFixed(2)} note="Simulated, n=300" tone="green" />
        <Metric label="Sensitivity" value={pct(stats.sensitivity)} note="Of MCI/AD cases caught" />
        <Metric label="Specificity" value={pct(stats.specificity)} note="Of controls cleared" tone="purple" />
        <Metric label="Model version" value="v0.4.0" note={`Best epoch ${bestEpoch.epoch} · ${demoGovernance.split[0][1]} train cases`} tone="orange" />
      </div>
      <DemoTrainingPanel />
      <SimNote />
    </>
  );
}

export function DemoGovernance({ subview }: { subview: string }) {
  const g = demoGovernance;
  const totalConsent = g.consent.granted + g.consent.pending + g.consent.withdrawn;
  const rows: Record<string, ReactNode> = {
    "data-overview": (
      <div className="ec-grid">
        <ChartCard title="Patient-level split" takeaway="The test set is locked and never used to tune."><HBars rows={g.split} label="Dataset split" /></ChartCard>
        <ChartCard title="Cases per group" takeaway="Controls outnumber MCI and AD, as in a screening population."><HBars rows={(["Control", "MCI", "AD"] as const).map((x) => [x, demoCases.filter((c) => c.group === x).length] as const)} label="Cases per group" /></ChartCard>
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
      <div className="ec-grid"><ChartCard title="De-identification checks" takeaway={`${Math.round((g.deid.verified / 300) * 100)}% verified clean.`}><HBars rows={[["Verified", g.deid.verified], ["Flagged", g.deid.flagged]] as const} max={300} label="De-identification" /></ChartCard></div>
    ),
    consent: (
      <div className="ec-grid"><ChartCard title="Consent status" takeaway={`${Math.round((g.consent.granted / totalConsent) * 100)}% granted.`}><HBars rows={[["Granted", g.consent.granted], ["Pending", g.consent.pending], ["Withdrawn", g.consent.withdrawn]] as const} max={totalConsent} label="Consent status" /></ChartCard></div>
    ),
    "usage-log": (
      <div className="ec-grid"><ChartCard title="Data accesses by purpose" takeaway="Last 30 days."><HBars rows={g.usage} label="Data usage by purpose" /></ChartCard></div>
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
        <SimNote>Simulated numbers for layout preview only. No dataset registry or consent system is connected.</SimNote>
      </section>
    </>
  );
}

export type { CSSProperties };
