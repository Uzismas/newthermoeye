"use client";

import type { CSSProperties, ReactNode } from "react";
import { demoCases, demoGovernance, demoOps, rocAndMatrix, trainingCurve } from "../demo-data";
import { ChartCard, ConfusionMatrix, HBars, LegendItem, LineChart, RocChart, chartColor } from "./demo-charts";
import { PanelHeader } from "./shared";

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
