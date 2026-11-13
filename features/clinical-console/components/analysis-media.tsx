"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, PlugZap } from "lucide-react";

/**
 * Demo-only stand-in for a missing AI mask: bright pixels above their local mean, computed in the browser.
 * It is NOT the model output and is labelled as such; it exists so the layout can be shown without the AI service.
 */
export function DemoVesselPreview({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvas.current; if (!c) return;
      const n = 256; c.width = n; c.height = n;
      const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      ctx.drawImage(img, 0, 0, n, n);
      const px = ctx.getImageData(0, 0, n, n);
      const g = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) g[i] = (0.299 * px.data[i * 4] + 0.587 * px.data[i * 4 + 1] + 0.114 * px.data[i * 4 + 2]) / 255;
      // Integral image -> local mean over a 15x15 window.
      const sat = new Float64Array((n + 1) * (n + 1));
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) sat[(y + 1) * (n + 1) + x + 1] = g[y * n + x] + sat[y * (n + 1) + x + 1] + sat[(y + 1) * (n + 1) + x] - sat[y * (n + 1) + x];
      const r = 7;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(n, x + r + 1), y1 = Math.min(n, y + r + 1);
        const mean = (sat[y1 * (n + 1) + x1] - sat[y0 * (n + 1) + x1] - sat[y1 * (n + 1) + x0] + sat[y0 * (n + 1) + x0]) / ((x1 - x0) * (y1 - y0));
        const v = g[y * n + x] > mean + 0.07 && g[y * n + x] > 0.22 ? 255 : 0;
        px.data[(y * n + x) * 4] = v; px.data[(y * n + x) * 4 + 1] = v; px.data[(y * n + x) * 4 + 2] = v; px.data[(y * n + x) * 4 + 3] = 255;
      }
      ctx.putImageData(px, 0, 0);
    };
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);
  if (failed) return <MaskEmpty title="No vessel map yet" reason="The source image could not be read for a preview." />;
  return (
    <div className="demo-mask">
      <canvas ref={canvas} role="img" aria-label="Demo vessel preview made with a simple brightness filter, not the AI model" />
      <span className="demo-mask-tag">Demo preview · not AI output</span>
    </div>
  );
}

/** Plain-language empty state for the mask frame: what happened and what to do next. */
export function MaskEmpty({ title, reason, notConnected = false }: { title: string; reason: string; notConnected?: boolean }) {
  const Icon = notConnected ? PlugZap : ImageOff;
  return (
    <div className="mask-empty">
      <Icon size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{reason}</span>
      {notConnected ? <small>Connect the AI service (docs/HOSTING_AI_BACKEND_TH.md) or run the local demo, then upload the image again.</small> : null}
    </div>
  );
}
