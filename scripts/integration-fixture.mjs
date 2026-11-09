import { createServer } from "node:http";

// A deterministic local transport fixture, not a model evaluation or real scan.
export const fixturePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=", "base64");

export async function startInferenceFixture() {
  const service = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("latin1");
    const blocked = body.includes("blocked-octa.png");
    const unavailable = body.includes("unavailable-octa.png");
    const second = body.includes("second-octa.png");
    const result = {
      analysis_status: blocked ? "quality_blocked" : unavailable ? "unavailable" : "available",
      engine: unavailable ? "none" : "heuristic_research_baseline", metric_unit: "percent_0_100",
      trained_model_connected: false, model_version: "integration-fixture-only", model_task: "vessel_segmentation",
      preprocessing_version: "fixture-v1", threshold: 0.5,
      input: { original_mode: "L", width: 320, height: 320, mime_type: "image/png", decoded_format: "PNG", grayscale_conversion: "none" },
      quality: { status: blocked ? "blocked" : "passed", quality_score: blocked ? 4 : 80, brightness: 50, contrast: 45, sharpness: 66, artifact_score: 8 },
      modality_gate: { status: "passed", reason: "Deterministic integration transport fixture" },
      measurements: { vessel_density: blocked || unavailable ? null : second ? 42 : 16, faz_risk_proxy: blocked || unavailable ? null : second ? 11 : 38, perfusion_density: blocked || unavailable ? null : second ? 29 : 42, mask_data_url: blocked || unavailable ? null : `data:image/png;base64,${fixturePng.toString("base64")}` },
      failure_reason: blocked ? "Fixture quality rejected" : unavailable ? "Fixture engine unavailable" : null,
      provenance: { timestamp: "2026-09-19T00:00:00.000Z" },
      preview_data_url: `data:image/png;base64,${fixturePng.toString("base64")}`,
    };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  });
  await new Promise((resolve, reject) => { service.once("error", reject); service.listen(0, "127.0.0.1", resolve); });
  return {
    env: { ...process.env, THERMOEYE_LOCAL_INFERENCE_URL: `http://127.0.0.1:${service.address().port}`, THERMOEYE_ALLOW_EXTERNAL_VISION: "false", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "", THERMOEYE_DEMO_EMAIL: "doctor@thermoeye.demo", THERMOEYE_DEMO_PASSWORD: "pilot-access" },
    close: () => new Promise((resolve) => service.close(resolve)),
  };
}

export function caseFromFixtureAnalysis(id, analysis) {
  return {
    id, age: 68, sex: "F", scanType: "OCTA macula", eye: "OD", riskLevel: "indeterminate", riskScore: null,
    analysisReceipt: analysis.receiptForTest,
    qualityLabel: "Research quality", status: "Research measurements", context: "Integration fixture", confidence: null, density: "N/A", heatmap: "N/A", note: "Research only",
    uploadedFileName: "PRIVATE-IDENTIFIER.png", uploadedImageUrl: "data:image/png;base64,aGVsbG8=",
    analysisMetrics: {
      brightness: analysis.brightness ?? null, contrast: analysis.contrast ?? null, sharpness: analysis.sharpness ?? null,
      vesselDensity: analysis.vesselDensity, qualityScore: analysis.qualityScore, confidenceScore: null, fazRiskProxy: analysis.fazRisk,
      artifactScore: analysis.artifactScore ?? null, imageWidth: analysis.imageWidth ?? null, imageHeight: analysis.imageHeight ?? null,
      perfusionDensityProxy: analysis.perfusion, demoEngineVersion: "octa-analysis-v2", visionResult: analysis,
    },
  };
}
