"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

// One palette for every chart: blues carry the data, amber marks errors / attention. No red-green pairs (colour-blind safe).
export const chartColor = { deep: "#0b5d8f", sky: "#38bdf8", teal: "#0d9488", amber: "#d97706", grid: "#dfe8f1", ink: "#5a6a82" };

const H = 240, PL = 40, PR = 14, PT = 16, PB = 36;

export function ChartCard({ title, takeaway, legend, children, wide = false }: { title: string; takeaway?: string; legend?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <figure className={`ec-card ${wide ? "wide" : ""}`}>
      <figcaption className="ec-head"><strong>{title}</strong>{takeaway ? <span>{takeaway}</span> : null}</figcaption>
      {children}
      {legend ? <div className="ec-legend">{legend}</div> : null}
    </figure>
  );
}

export const LegendItem = ({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) => (
  <span><i style={{ background: dashed ? "transparent" : color, borderTop: dashed ? `2px dashed ${color}` : undefined }} />{label}</span>
);

type Series = { name: string; values: number[]; color: string; area?: boolean };

function LineInner({ cls = "", wide, series, xLabels, lo, hi, yTicks, fmt = (v) => String(v), xEvery = 1, marker, xTitle, yTitle, label }: {
  series: Series[]; xLabels: string[]; lo: number; hi: number; yTicks: number[]; fmt?: (v: number) => string; xEvery?: number;
  marker?: { index: number; label: string }; xTitle?: string; yTitle?: string; label: string; wide?: boolean; cls?: string;
}) {
  const W = wide ? 720 : 360;
  const id = useId().replace(/:/g, "");
  const n = xLabels.length;
  const x = (i: number) => PL + (i / (n - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={`ec-svg ${cls}`}>
      <defs>{series.filter((s) => s.area).map((s) => (
        <linearGradient id={`${id}-${s.name}`} key={s.name} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity="0.28" /><stop offset="100%" stopColor={s.color} stopOpacity="0" /></linearGradient>
      ))}</defs>
      {yTicks.map((t) => (
        <g key={t}><line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke={chartColor.grid} /><text x={PL - 6} y={y(t) + 4} textAnchor="end" className="ec-tick">{fmt(t)}</text></g>
      ))}
      {xLabels.map((l, i) => (i % xEvery === 0 || i === n - 1 ? <text key={l + i} x={x(i)} y={H - PB + 16} textAnchor="middle" className="ec-tick">{l}</text> : null))}
      {xTitle ? <text x={(PL + W - PR) / 2} y={H - 4} textAnchor="middle" className="ec-axis">{xTitle}</text> : null}
      {yTitle ? <text transform={`translate(10 ${(PT + H - PB) / 2}) rotate(-90)`} textAnchor="middle" className="ec-axis">{yTitle}</text> : null}
      {marker ? (
        <g><line x1={x(marker.index)} x2={x(marker.index)} y1={PT} y2={H - PB} stroke={chartColor.amber} strokeDasharray="4 3" /><text x={x(marker.index)} y={PT - 4} textAnchor="middle" className="ec-note">{marker.label}</text></g>
      ) : null}
      {series.map((s) => (
        <g key={s.name}>
          {s.area ? <path d={`${path(s.values)} L${x(n - 1)},${H - PB} L${x(0)},${H - PB} Z`} fill={`url(#${id}-${s.name})`} /> : null}
          <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(n - 1)} cy={y(s.values[n - 1])} r="3.6" fill={s.color} stroke="#fff" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

type LineProps = Parameters<typeof LineInner>[0];
// A 720-wide viewBox keeps text readable in a wide card; below that breakpoint the 360 version is shown instead.
export function LineChart(props: LineProps) {
  if (!props.wide) return <LineInner {...props} />;
  return <><LineInner {...props} wide={false} cls="ec-only-narrow" /><LineInner {...props} cls="ec-only-wide" /></>;
}

const AX = { l: 50, t: 12, s: 190 }; // square plot for ROC / calibration

function SquareFrame({ id, children, xTitle, yTitle, label }: { id: string; children: ReactNode; xTitle: string; yTitle: string; label: string }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const px = (v: number) => AX.l + v * AX.s, py = (v: number) => AX.t + (1 - v) * AX.s;
  return (
    <svg viewBox="0 0 260 246" role="img" aria-label={label} className="ec-svg" id={id}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={AX.l} x2={AX.l + AX.s} y1={py(t)} y2={py(t)} stroke={chartColor.grid} />
          <line x1={px(t)} x2={px(t)} y1={AX.t} y2={AX.t + AX.s} stroke={chartColor.grid} />
          <text x={AX.l - 6} y={py(t) + 4} textAnchor="end" className="ec-tick">{t === 0 ? "0" : t === 1 ? "1" : t.toFixed(2).replace(/0$/, "")}</text>
          <text x={px(t)} y={AX.t + AX.s + 15} textAnchor="middle" className="ec-tick">{t === 0 ? "0" : t === 1 ? "1" : t.toFixed(2).replace(/0$/, "")}</text>
        </g>
      ))}
      <path d={`M${px(0)},${py(0)} L${px(1)},${py(1)}`} stroke="#9fb0c3" strokeDasharray="4 4" fill="none" />
      <text x={AX.l + AX.s / 2} y={242} textAnchor="middle" className="ec-axis">{xTitle}</text>
      <text transform={`translate(11 ${AX.t + AX.s / 2}) rotate(-90)`} textAnchor="middle" className="ec-axis">{yTitle}</text>
      {children}
    </svg>
  );
}
export { SquareFrame, AX };

export function RocChart({ points, auc, op }: { points: { fpr: number; tpr: number }[]; auc: number; op: { fpr: number; tpr: number } }) {
  const id = useId().replace(/:/g, "");
  const px = (v: number) => AX.l + v * AX.s, py = (v: number) => AX.t + (1 - v) * AX.s;
  const d = points.map((p, i) => `${i ? "L" : "M"}${px(p.fpr).toFixed(1)},${py(p.tpr).toFixed(1)}`).join(" ");
  return (
    <SquareFrame id={`roc-${id}`} xTitle="False positive rate" yTitle="True positive rate" label={`ROC curve, AUC ${auc.toFixed(2)}`}>
      <defs><linearGradient id={`${id}-f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={chartColor.deep} stopOpacity="0.22" /><stop offset="100%" stopColor={chartColor.deep} stopOpacity="0.02" /></linearGradient></defs>
      <path d={`${d} L${px(1)},${py(0)} L${px(0)},${py(0)} Z`} fill={`url(#${id}-f)`} />
      <path d={d} fill="none" stroke={chartColor.deep} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx={px(op.fpr)} cy={py(op.tpr)} r="5" fill={chartColor.amber} stroke="#fff" strokeWidth="2" />
      <text x={px(op.fpr) + 9} y={py(op.tpr) + 16} className="ec-note">threshold 0.50</text>
      <text x={px(1) - 6} y={py(0) - 10} textAnchor="end" className="ec-big">AUC {auc.toFixed(2)}</text>
    </SquareFrame>
  );
}

export function CalibrationChart({ bins }: { bins: { predicted: number; observed: number | null; n: number }[] }) {
  const px = (v: number) => AX.l + v * AX.s, py = (v: number) => AX.t + (1 - v) * AX.s;
  const pts = bins.filter((b) => b.observed != null);
  const maxN = Math.max(...bins.map((b) => b.n), 1);
  return (
    <SquareFrame id="cal" xTitle="Predicted score" yTitle="Observed MCI/AD fraction" label="Calibration curve">
      <path d={pts.map((b, i) => `${i ? "L" : "M"}${px(b.predicted).toFixed(1)},${py(b.observed as number).toFixed(1)}`).join(" ")} fill="none" stroke={chartColor.deep} strokeWidth="2.2" />
      {pts.map((b) => <circle key={b.predicted} cx={px(b.predicted)} cy={py(b.observed as number)} r={3 + (b.n / maxN) * 5} fill={chartColor.sky} stroke={chartColor.deep} strokeWidth="1.5" fillOpacity="0.85" />)}
    </SquareFrame>
  );
}

export function ConfusionMatrix({ tp, fn, fp, tn }: { tp: number; fn: number; fp: number; tn: number }) {
  const rowPos = tp + fn, rowNeg = fp + tn;
  const cell = (n: number, rowTotal: number, good: boolean) => {
    const share = n / rowTotal;
    const style = (good ? { background: `rgba(11, 93, 143, ${0.12 + share * 0.78})`, color: share > 0.45 ? "#fff" : "#0b3c5d" } : { background: `rgba(217, 119, 6, ${0.1 + share * 0.5})`, color: "#6b3a00" }) as CSSProperties;
    return <div className="cm-cell" style={style}><strong>{n}</strong><span>{Math.round(share * 100)}% of row</span></div>;
  };
  return (
    <div className="cm" role="img" aria-label={`Confusion matrix: ${tp} true positive, ${fn} missed, ${fp} false alarms, ${tn} true negative`}>
      <span className="cm-axis cm-top">Predicted</span>
      <span /><b>MCI / AD</b><b>Control</b>
      <b className="cm-side">Actual<br />MCI / AD</b>{cell(tp, rowPos, true)}{cell(fn, rowPos, false)}
      <b className="cm-side">Actual<br />Control</b>{cell(fp, rowNeg, false)}{cell(tn, rowNeg, true)}
    </div>
  );
}

export function HBars({ rows, max, unit = "", label }: { rows: readonly (readonly [string, number])[]; max?: number; unit?: string; label: string }) {
  const top = max ?? Math.max(...rows.map((r) => r[1]), 1);
  return (
    <div className="hbars" role="img" aria-label={label}>
      {rows.map(([name, v]) => (
        <div key={name}><span>{name}</span><i><b style={{ width: `${Math.max(2, (v / top) * 100)}%` }} /></i><em>{v}{unit}</em></div>
      ))}
    </div>
  );
}
