// SIMULATED data for the "Demo Preview" page only. Nothing here comes from a model, a patient or a study.
// Deterministic (seeded) so every viewer sees the same numbers.

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export type DemoGroup = "Control" | "MCI" | "AD";
export type DemoCase = { id: string; age: number; sex: "F" | "M"; eye: "OD" | "OS" | "OU"; group: DemoGroup; score: number; confidence: number; vesselDensity: number; faz: number; status: string };

const groupParams: Record<DemoGroup, { score: number; vd: number; faz: number }> = {
  Control: { score: 0.24, vd: 21.5, faz: 0.27 },
  MCI: { score: 0.52, vd: 18.8, faz: 0.34 },
  AD: { score: 0.74, vd: 16.4, faz: 0.41 },
};

const groups: DemoGroup[] = [...Array(150).fill("Control"), ...Array(90).fill("MCI"), ...Array(60).fill("AD")];

export const demoCases: DemoCase[] = groups.map((group, i) => {
  const p = groupParams[group];
  const score = clamp(p.score + gauss() * 0.17, 0.02, 0.98);
  return {
    id: `DEMO-${String(i + 1).padStart(3, "0")}`,
    age: Math.round(clamp(58 + (group === "Control" ? 0 : group === "MCI" ? 6 : 10) + gauss() * 6, 50, 90)),
    sex: rand() < 0.56 ? "F" : "M",
    eye: ((r) => (r < 0.46 ? "OD" : r < 0.92 ? "OS" : "OU"))(rand()),
    group,
    score: Math.round(score * 100) / 100,
    confidence: Math.round(clamp(0.62 + Math.abs(score - 0.5) * 0.7 + gauss() * 0.04, 0.55, 0.97) * 100) / 100,
    vesselDensity: Math.round((p.vd + gauss() * 1.9) * 10) / 10,
    faz: Math.round(clamp(p.faz + gauss() * 0.05, 0.12, 0.6) * 100) / 100,
    status: ["Report ready", "Review pending", "Report ready", "AI completed"][Math.floor(rand() * 4)],
  };
});

export const riskLevel = (s: number) => (s < 0.35 ? "Low" : s < 0.65 ? "Moderate" : "High");

/** Binary task for the ROC: AD or MCI (positive) vs Control, computed from the simulated cases above. */
export function rocAndMatrix(threshold = 0.5) {
  const pos = demoCases.filter((c) => c.group !== "Control");
  const neg = demoCases.filter((c) => c.group === "Control");
  const points = [] as { fpr: number; tpr: number }[];
  for (let t = 1; t >= 0; t -= 0.02) {
    points.push({ fpr: neg.filter((c) => c.score >= t).length / neg.length, tpr: pos.filter((c) => c.score >= t).length / pos.length });
  }
  points.push({ fpr: 1, tpr: 1 });
  let auc = 0;
  for (let i = 1; i < points.length; i++) auc += ((points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr)) / 2;
  const tp = pos.filter((c) => c.score >= threshold).length;
  const fn = pos.length - tp;
  const fp = neg.filter((c) => c.score >= threshold).length;
  const tn = neg.length - fp;
  return { points, auc, tp, fn, fp, tn, sensitivity: tp / (tp + fn), specificity: tn / (tn + fp), ppv: tp / (tp + fp), n: demoCases.length };
}

export const trainingCurve = Array.from({ length: 40 }, (_, i) => {
  const e = i + 1;
  const train = 0.95 * Math.exp(-e / 11) + 0.18 + gauss() * 0.008;
  const val = 0.97 * Math.exp(-e / 12) + 0.27 + gauss() * 0.015 + Math.max(0, e - 28) * 0.0016;
  return { epoch: e, train: Math.round(train * 1000) / 1000, val: Math.round(val * 1000) / 1000, auc: Math.round(clamp(0.5 + 0.44 * (1 - Math.exp(-e / 9)) + gauss() * 0.008, 0, 0.96) * 1000) / 1000 };
});

export const weeklyScans = [
  ["Mon", 41, 33], ["Tue", 52, 44], ["Wed", 47, 39], ["Thu", 58, 51], ["Fri", 44, 40], ["Sat", 18, 15], ["Sun", 9, 8],
] as const;

// ---- aggregates used by Dashboard / Model Performance / Data Management in demo mode ----
const BLOCKED = 24, NOT_EVALUATED = 12, RESCANS = 14;
const share = (n: number, total: number, k: number) => Math.round((n / total) * k);
export const demoOps = (() => {
  const total = demoCases.length;
  const measured = total - BLOCKED - NOT_EVALUATED;
  const approved = demoCases.filter((c) => c.status === "Report ready").length;
  const waitingReview = Math.min(measured - approved, demoCases.filter((c) => c.status !== "Report ready").length);
  // Uneven on purpose (OU scans block more often) so the per-eye chart is not three identical bars.
  const w = { OD: 0.7, OS: 0.9, OU: 2.6 } as const;
  const counts = (["OD", "OS", "OU"] as const).map((eye) => ({ eye, n: demoCases.filter((c) => c.eye === eye).length }));
  const wSum = counts.reduce((a, c) => a + c.n * w[c.eye], 0);
  let blockedLeft = BLOCKED, notEvalLeft = NOT_EVALUATED;
  const eyes = counts.map((c, i) => {
    const last = i === counts.length - 1;
    const blocked = last ? blockedLeft : Math.round((BLOCKED * c.n * w[c.eye]) / wSum);
    const notEvaluated = last ? notEvalLeft : Math.round((NOT_EVALUATED * c.n) / total);
    blockedLeft -= blocked; notEvalLeft -= notEvaluated;
    return { eye: c.eye, n: c.n, blocked, notEvaluated, measured: c.n - blocked - notEvaluated };
  });
  return { total, measured, blocked: BLOCKED, notEvaluated: NOT_EVALUATED, approved, waitingReview, rescans: RESCANS, eyes, meanDensity: demoCases.reduce((a, c) => a + c.vesselDensity, 0) / total };
})();

export function calibrationBins() {
  return Array.from({ length: 10 }, (_, i) => {
    const inBin = demoCases.filter((c) => c.score >= i / 10 && c.score < (i + 1) / 10 + (i === 9 ? 0.01 : 0));
    const pos = inBin.filter((c) => c.group !== "Control").length;
    return { predicted: (i + 0.5) / 10, observed: inBin.length ? pos / inBin.length : null, n: inBin.length };
  });
}

export const errorCases = {
  missed: demoCases.filter((c) => c.group !== "Control" && c.score < 0.5).sort((a, b) => a.score - b.score).slice(0, 5),
  falseAlarms: demoCases.filter((c) => c.group === "Control" && c.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 5),
};

export const driftWeeks = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  meanScore: Math.round((0.41 + gauss() * 0.012 + (i > 8 ? 0.02 : 0)) * 1000) / 1000,
  auc: Math.round((0.94 + gauss() * 0.01 - (i > 8 ? 0.012 : 0)) * 1000) / 1000,
}));

export const modelVersions = [
  { version: "v0.4.0 (demo)", date: "2026-11-10", auc: 0.94, note: "Wider training set, class-balanced loss", current: true },
  { version: "v0.3.2 (demo)", date: "2026-10-21", auc: 0.92, note: "Augmentation added, threshold re-tuned", current: false },
  { version: "v0.3.0 (demo)", date: "2026-10-02", auc: 0.9, note: "First multi-site training run", current: false },
  { version: "v0.2.0 (demo)", date: "2026-09-14", auc: 0.85, note: "Baseline U-Net features", current: false },
];

export const demoGovernance = {
  split: [["Train", 210], ["Validation", 45], ["Test (locked)", 45]] as const,
  sources: [
    { name: "Hospital A (simulated)", n: 128, kind: "OCTA 3x3 mm", status: "Active" },
    { name: "Hospital B (simulated)", n: 96, kind: "OCTA 6x6 mm", status: "Active" },
    { name: "Clinic C (simulated)", n: 52, kind: "OCTA 3x3 mm", status: "Pending QA" },
    { name: "Public set (simulated)", n: 24, kind: "Segmentation only", status: "Archived" },
  ],
  consent: { granted: 281, pending: 11, withdrawn: 8 },
  deid: { verified: 294, flagged: 6 },
  usage: [["Screening review", 312], ["Model training", 176], ["Research export", 41], ["Quality audit", 58]] as const,
};
