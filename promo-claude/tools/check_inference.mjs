// Verify the local backend is serving real ONNX vessel segmentation.
import { readFile } from "node:fs/promises";

const BASE = "http://127.0.0.1:8000";

const health = await (await fetch(`${BASE}/health`)).json().catch((e) => ({ error: String(e) }));
console.log("HEALTH:", JSON.stringify(health));

const readiness = await (await fetch(`${BASE}/readiness`)).json().catch((e) => ({ error: String(e) }));
console.log("READINESS:", JSON.stringify(readiness));

// Run the real OCTA image through the local pipeline.
const imgPath = "D:/Themoeye/project/teng1/public/research/pipeline/real-octa-original.jpg";
const bytes = await readFile(imgPath);
const form = new FormData();
form.append("image", new Blob([bytes], { type: "image/jpeg" }), "real-octa-original.jpg");
const t0 = Date.now();
const res = await fetch(`${BASE}/octa/analyze`, { method: "POST", body: form });
const json = await res.json();
console.log("ANALYZE status:", res.status, "in", Date.now() - t0, "ms");
console.log("ANALYSIS:", JSON.stringify({
  analysis_status: json.analysis_status,
  engine: json.engine,
  model_version: json.model_version,
  preprocessing_version: json.preprocessing_version,
  threshold: json.threshold,
  metric_unit: json.metric_unit,
  trained_model_connected: json.trained_model_connected,
  input: json.input,
  quality: json.quality,
  modality_gate: json.modality_gate,
  measurements: {
    vessel_density: json.measurements?.vessel_density,
    faz_risk_proxy: json.measurements?.faz_risk_proxy,
    perfusion_density: json.measurements?.perfusion_density,
    has_mask: Boolean(json.measurements?.mask_data_url),
    mask_bytes: json.measurements?.mask_data_url?.length ?? 0,
  },
  provenance: json.provenance,
}, null, 2));