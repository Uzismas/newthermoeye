/**
 * Measured results of the live model on the 9 held-out ROSE-O test images (2026-11-15), not simulated.
 * Sources: scripts/evaluate_repeat.py (45 runs through /api/analyze, docs/evidence/ai-eval/repeat_5x.json)
 * and a pixel-probability pass of the same ONNX model for AUC/ROC. Update these numbers if the model changes.
 */
export const MODEL_EVAL = {
  modelSha: "195ff40370049e3be850b88ed8bed68f05abd006565afd1fbe01de6982777c87",
  trainImages: 30,
  testImages: 9,
  runs: 45,
  vessel: { auc: 0.908, accuracy: 0.878, dice: 0.701, sensitivity: 0.769, specificity: 0.904, precision: 0.648 },
  // Pixel counts pooled over the 9 test images at threshold 0.5.
  pixels: { tp: 116695, fn: 36947, fp: 64823, tn: 613279 },
  faz: { dice: 0.87, maeMm2: 0.037, r: 0.918, bandAgree: 6 },
  // Pixel ROC (false-positive rate, true-positive rate) over probability thresholds 1.0 -> 0.0.
  roc: [[0, 0], [0, 0.0532], [0.0006, 0.2547], [0.0023, 0.3693], [0.0092, 0.5112], [0.0225, 0.6122], [0.0459, 0.6904], [0.1002, 0.7792], [0.2039, 0.8557], [0.2808, 0.8887], [0.4085, 0.9277], [0.504, 0.9456], [0.6676, 0.9644], [0.769, 0.9755], [0.8684, 0.9858], [0.9396, 0.9938], [0.9778, 0.998], [0.9931, 0.9995], [0.9981, 0.9999], [1, 1]] as const,
  rocAtThreshold: { fpr: 0.0956, tpr: 0.7595 },
  // image, pixel accuracy %, vessel Dice, sensitivity %, specificity %, FAZ Dice, AI FAZ mm2, expert FAZ mm2, AI band, band from expert FAZ
  perImage: [
    ["01", 93.7, 0.79, 83.6, 95.4, 0.892, 0.325, 0.299, "moderate", "moderate"],
    ["02", 90.8, 0.712, 75.5, 93.5, 0.777, 0.193, 0.277, "moderate", "moderate"],
    ["03", 88.3, 0.711, 83.8, 89.2, 0.906, 0.424, 0.408, "high", "moderate"],
    ["04", 86.9, 0.713, 86.0, 87.2, 0.9, 0.367, 0.413, "moderate", "moderate"],
    ["05", 91.0, 0.71, 83.0, 92.2, 0.854, 0.14, 0.154, "low", "low"],
    ["06", 82.8, 0.642, 65.6, 88.1, 0.874, 0.203, 0.171, "moderate", "low"],
    ["07", 85.3, 0.671, 69.6, 89.6, 0.823, 0.237, 0.18, "moderate", "low"],
    ["08", 85.4, 0.685, 74.8, 88.3, 0.919, 0.422, 0.452, "high", "high"],
    ["09", 85.7, 0.677, 70.5, 89.8, 0.888, 0.297, 0.329, "moderate", "moderate"],
  ] as const,
};
