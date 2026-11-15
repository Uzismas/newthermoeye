import { MODEL_EVAL as E } from "../model-evaluation";
import { ChartCard, ConfusionMatrix, HBars, RocChart } from "./demo-charts";
import { PanelHeader, SectionHeading } from "./shared";

const PERF_TABS = [
  { id: "overview", label: "Overview" }, { id: "metrics", label: "Per-image Results" },
  { id: "calibration", label: "FAZ Agreement" }, { id: "error-analysis", label: "Error Analysis" },
  { id: "drift", label: "Repeatability" }, { id: "version-history", label: "Version History" },
];
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const BAND = { low: "Low", moderate: "Moderate", high: "High" } as const;

function Metric({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

const Measured = () => <p className="panel-footnote">Measured on the 9 held-out ROSE-O test images (never used in training), through the same /api/analyze path as an upload. Expert labels: ROSE-O vessel and FAZ annotations.</p>;

function Body({ subview }: { subview: string }) {
  const v = E.vessel, f = E.faz, px = E.pixels;
  if (subview === "metrics") {
    return <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="Measured" title="Every test image vs the expert labels" badge="Real data" />
      <div className="demo-table-wrap"><table className="case-table">
        <thead><tr className="case-row table-head">{["Image", "Pixel accuracy", "Vessel Dice", "Sensitivity", "Specificity", "FAZ Dice", "FAZ AI / expert (mm²)"].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{E.perImage.map(([id, acc, dice, sens, spec, fazDice, faz, expert]) => <tr className="case-row" key={id}>
          <td><strong>test_{id}</strong></td><td>{acc}%</td><td>{dice.toFixed(3)}</td><td>{sens}%</td><td>{spec}%</td><td>{fazDice.toFixed(3)}</td><td>{faz.toFixed(3)} / {expert.toFixed(3)}</td>
        </tr>)}</tbody>
      </table></div>
      <Measured />
    </section>;
  }
  if (subview === "calibration") {
    return <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="FAZ measurement" title="AI FAZ area vs expert-drawn FAZ" badge="Real data" />
      <div className="metrics-grid">
        <Metric label="FAZ Dice" value={f.dice.toFixed(2)} note="Overlap with expert FAZ" tone="green" />
        <Metric label="Mean area error" value={`${f.maeMm2} mm²`} note="|AI − expert|" />
        <Metric label="Correlation r" value={f.r.toFixed(2)} note="AI vs expert area" tone="purple" />
        <Metric label="Index band agrees" value={`${f.bandAgree} / ${E.testImages}`} note="AI FAZ vs expert FAZ band" tone="orange" />
      </div>
      <div className="ec-grid">
        <ChartCard title="FAZ area per image (mm²)" takeaway="AI and expert values sit close together on every image.">
          <HBars max={0.5} label="AI and expert FAZ area per image" rows={E.perImage.flatMap(([id, , , , , , faz, expert]) => [[`${id} AI`, faz] as const, [`${id} expert`, expert, "mute"] as const])} />
        </ChartCard>
      </div>
      <p className="panel-footnote">The Alzheimer risk percentage itself is not calibrated: that needs scans from people with a known Alzheimer or control diagnosis (requested from the ROSE authors).</p>
    </section>;
  }
  if (subview === "error-analysis") {
    const mismatch = E.perImage.filter((r) => r[8] !== r[9]);
    return <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="Error analysis" title="Where the model is wrong" badge="Real data" />
      <div className="ec-grid">
        <ChartCard title="Vessel pixels, threshold 0.5" takeaway={`${pct(px.fn / (px.tp + px.fn))} of vessel pixels missed; ${pct(px.fp / (px.fp + px.tn))} of background marked as vessel.`}>
          <ConfusionMatrix tp={px.tp} fn={px.fn} fp={px.fp} tn={px.tn} labels={["Vessel", "Background"]} />
        </ChartCard>
        <ChartCard title="Vessel Dice per image" takeaway="Images 06 and 07 are weakest: faint capillaries are missed.">
          <HBars max={1} label="Vessel Dice per image" rows={E.perImage.map(([id, , dice]) => [id, dice, dice < 0.675 ? "warn" : undefined] as const)} />
        </ChartCard>
      </div>
      <div className="demo-table-wrap"><h3 className="demo-subhead">Alzheimer index band differs from the band of the expert FAZ</h3>
        <table className="case-table"><thead><tr className="case-row table-head"><th scope="col">Image</th><th scope="col">AI FAZ</th><th scope="col">Expert FAZ</th><th scope="col">AI band</th><th scope="col">Expert band</th></tr></thead>
          <tbody>{mismatch.map(([id, , , , , , faz, expert, ai, ex]) => <tr className="case-row" key={id}><td><strong>test_{id}</strong></td><td>{faz.toFixed(3)} mm²</td><td>{expert.toFixed(3)} mm²</td><td>{BAND[ai]}</td><td>{BAND[ex]}</td></tr>)}</tbody>
        </table></div>
      <p className="panel-footnote">All three mismatches sit next to a band cut-off (0.35 or 0.65); the FAZ areas differ by 0.02–0.06 mm².</p>
    </section>;
  }
  if (subview === "drift") {
    return <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="Stability" title="Same image, same answer" badge="Real data" />
      <div className="metrics-grid">
        <Metric label="Runs" value={String(E.runs)} note={`${E.testImages} images × 5 uploads`} />
        <Metric label="Identical vessel masks" value={`${E.runs} / ${E.runs}`} note="Pixel-for-pixel" tone="green" />
        <Metric label="Variation between runs" value="0" note="SD of every metric" tone="purple" />
      </div>
      <p className="panel-footnote">Each test image was uploaded 5 times through the website; vessel mask, FAZ area, index and perfusion were identical on every run. Production drift needs a monitored patient cohort, which does not exist yet.</p>
    </section>;
  }
  if (subview === "version-history") {
    return <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="Provenance" title="What is running" badge="Recorded" />
      <dl className="prov-list">
        <div><dt>Vessel model</dt><dd>ONNX U-Net, sha256 {E.modelSha.slice(0, 12)}…</dd></div>
        <div><dt>Training data</dt><dd>{E.trainImages} ROSE-O training images (superficial OCTA, 3×3 mm) with expert vessel labels</dd></div>
        <div><dt>Test data</dt><dd>{E.testImages} ROSE-O test images, held out from training</dd></div>
        <div><dt>FAZ method</dt><dd>Dark-region growth from the fovea, tuned on the training images (v1)</dd></div>
        <div><dt>Alzheimer risk</dt><dd>Age baseline (Alzheimer&apos;s Association 2024) × FAZ likelihood ratio (meta-analysis SMD 0.54); not trained on patients</dd></div>
      </dl>
    </section>;
  }
  return <>
    <section className="panel" role="tabpanel">
      <PanelHeader eyebrow="Vessel segmentation" title="AI vs expert vessel labels" badge="Real data" />
      <div className="metrics-grid six">
        <Metric label="Pixel AUC" value={v.auc.toFixed(3)} note="Vessel vs background" tone="green" />
        <Metric label="Accuracy" value={pct(v.accuracy)} note="Pixels correct" />
        <Metric label="Dice" value={v.dice.toFixed(3)} note="Overlap with expert" tone="purple" />
        <Metric label="Sensitivity" value={pct(v.sensitivity)} note="Vessel pixels found" tone="orange" />
        <Metric label="Specificity" value={pct(v.specificity)} note="Background kept clear" />
        <Metric label="Precision" value={pct(v.precision)} note="Marked pixels that are vessel" tone="green" />
      </div>
      <div className="ec-grid">
        <ChartCard title="ROC curve (vessel pixels)" takeaway="Dot = threshold 0.5 used by the app."><RocChart points={E.roc.map(([fpr, tpr]) => ({ fpr, tpr }))} auc={v.auc} op={E.rocAtThreshold} /></ChartCard>
        <ChartCard title="FAZ measurement" takeaway={`FAZ Dice ${f.dice.toFixed(2)}, mean error ${f.maeMm2} mm², r ${f.r.toFixed(2)} against expert FAZ.`}>
          <HBars max={100} unit="%" label="FAZ agreement" rows={[["FAZ Dice", Math.round(f.dice * 100)], ["Band agreement", Math.round((f.bandAgree / E.testImages) * 100)], ["Area correlation", Math.round(f.r * 100)]]} />
        </ChartCard>
      </div>
      <Measured />
    </section>
  </>;
}

export function PerformanceView({ subview = "overview", onSubviewChange }: { subview?: string; onSubviewChange?: (sub: string) => void; demo?: boolean }) {
  return <section className="view active" aria-labelledby="performance-title">
    <SectionHeading eyebrow="Measured results" title="Model Performance" note={`Live model on ${E.testImages} held-out real OCTA images · ${E.runs} test runs`} />
    <div className="tab-strip" role="tablist" aria-label="Performance sections">{PERF_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={subview === tab.id} className={subview === tab.id ? "active" : ""} onClick={() => onSubviewChange?.(tab.id)}>{tab.label}</button>)}</div>
    <Body subview={subview} />
    <section className="panel"><PanelHeader eyebrow="Scope" title="What these numbers mean" badge="Research only" /><p>These are segmentation and measurement results against expert labels: how well the AI finds vessels and the FAZ. They are not Alzheimer diagnosis accuracy; that needs scans from people with a known diagnosis.</p></section>
  </section>;
}
