"use client";

import { useEffect, useState } from "react";

// Stage hints follow typical timing on a laptop CPU; the overlay closes as soon as the real result arrives.
const STAGES = [
  { at: 0, label: "Checking image quality", detail: "Contrast, sharpness and OCTA texture gate" },
  { at: 2, label: "Segmenting vessels", detail: "ONNX U-Net, pixel by pixel" },
  { at: 5, label: "Measuring the FAZ", detail: "Foveal avascular zone area in mm²" },
  { at: 8, label: "Estimating Alzheimer risk", detail: "Age baseline × FAZ likelihood ratio" },
] as const;
const SLOW_AFTER = 15; // seconds; a sleeping cloud server takes about a minute to wake

// Branching vessel paths in a 200×200 retina, drawn in one after another.
const VESSELS = [
  "M100 100 C 80 78, 62 60, 30 46", "M100 100 C 122 76, 140 58, 172 40", "M100 100 C 78 122, 58 142, 26 160",
  "M100 100 C 124 124, 146 140, 176 162", "M100 100 C 98 70, 104 44, 96 14", "M100 100 C 102 132, 94 158, 104 188",
  "M58 64 C 50 84, 40 96, 20 104", "M142 62 C 152 84, 164 94, 184 100", "M60 138 C 72 156, 74 172, 66 190", "M146 142 C 134 160, 132 176, 140 192",
];

export function AnalysisLoading({ current, total }: { current: number; total: number }) {
  const [seconds, setSeconds] = useState(0);
  // Parent remounts this per scan (key), so the timer restarts at 0 without resetting state here.
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, []);
  const stage = STAGES.reduce((active, s, i) => (seconds >= s.at ? i : active), 0);

  return (
    <div className="al-backdrop" role="dialog" aria-modal="true" aria-labelledby="al-title" aria-describedby="al-status">
      <div className="al-card">
        <div className="al-visual" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="al-retina">
            <defs>
              <radialGradient id="al-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" /><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" /></radialGradient>
              <clipPath id="al-clip"><circle cx="100" cy="100" r="92" /></clipPath>
              <linearGradient id="al-beam" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0" /><stop offset="85%" stopColor="#06b6d4" stopOpacity="0.45" /><stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.95" /></linearGradient>
            </defs>
            <circle cx="100" cy="100" r="92" className="al-disc" />
            <circle cx="100" cy="100" r="92" fill="url(#al-glow)" />
            <g clipPath="url(#al-clip)">
              {VESSELS.map((d, i) => <path key={d} d={d} className="al-vessel" style={{ animationDelay: `${i * 0.18}s` }} />)}
              <rect x="0" y="-60" width="200" height="60" fill="url(#al-beam)" className="al-beam" />
            </g>
            <circle cx="100" cy="100" r="15" className="al-faz" />
            <circle cx="100" cy="100" r="15" className="al-faz-ring" />
            <circle cx="100" cy="100" r="92" className="al-rim" />
          </svg>
        </div>

        <p className="al-eyebrow">Eyezheimer AI</p>
        <h2 id="al-title">Analysing OCTA scan</h2>
        {total > 1 ? (
          <div className="al-batch">
            <span>Scan {current} of {total}</span>
            <i><b style={{ width: `${((current - 1) / total) * 100}%` }} /></i>
          </div>
        ) : null}

        <ol className="al-stages">
          {STAGES.map((s, i) => (
            <li key={s.label} className={i < stage ? "done" : i === stage ? "active" : ""}>
              <span className="al-dot">{i < stage ? "✓" : ""}</span>
              <div><strong>{s.label}</strong><small>{s.detail}</small></div>
            </li>
          ))}
        </ol>

        <p id="al-status" className="al-status" role="status" aria-live="polite">
          {seconds >= SLOW_AFTER ? "Still working. A cloud server that was idle needs up to a minute to wake up; later scans are faster." : "This usually takes a few seconds. Please keep this page open."}
        </p>
        <p className="al-timer" aria-hidden="true">{seconds}s</p>
      </div>
    </div>
  );
}
