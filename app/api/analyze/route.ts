import { NextRequest, NextResponse } from "next/server";

const ANALYSIS_PROMPT = `You are a retinal imaging analysis assistant for a clinical decision-support demo.

Analyze this OCTA/OCT retinal image and return ONLY a JSON object (no markdown, no explanation):

{
  "primaryDisease": "normal" or "alzheimer_risk" or "diabetic_retinopathy" or "glaucoma" or "amd" or "hypertensive_retinopathy" or "pathologic_myopia" or "quality_blocked",
  "riskLevel": "low" or "moderate" or "high" or "blocked",
  "riskScore": integer 0-100,
  "confidence": integer 0-100,
  "label": "short label",
  "finding": "1-2 sentence clinical finding",
  "recommendation": "1 sentence recommendation",
  "evidence": ["finding 1", "finding 2", "finding 3"],
  "vesselDensity": integer 0-100,
  "fazRisk": integer 0-100,
  "perfusion": integer 0-100,
  "qualityScore": integer 0-100,
  "differentials": [{"kind": "disease_kind", "label": "label", "score": integer, "evidence": ["e1","e2"]}]
}

Base ALL findings on what you actually see. Return quality_blocked if image is not a retinal scan. Return ONLY the JSON.`;

function parseResult(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  if (!cleaned.startsWith("{")) return null;
  return JSON.parse(cleaned);
}

async function analyzeWithAnthropic(base64: string, mediaType: string) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const models = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"];
  for (const model of models) {
    try {
      const msg = await client.messages.create({
        model, max_tokens: 1024,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png", data: base64 } },
          { type: "text", text: ANALYSIS_PROMPT },
        ]}],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      return parseResult(text);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) continue;
      throw e;
    }
  }
  return null;
}

async function analyzeWithGemini(base64: string, mimeType: string) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    ANALYSIS_PROMPT,
  ]);
  return parseResult(result.response.text());
}

const BLOCKED: object = {
  primaryDisease: "quality_blocked", riskLevel: "blocked", riskScore: 0,
  confidence: 0, label: "No AI provider configured",
  finding: "Configure ANTHROPIC_API_KEY or GOOGLE_API_KEY in .env.local to enable AI analysis.",
  recommendation: "Add API key to enable Vision analysis.", evidence: [],
  vesselDensity: 0, fazRisk: 0, perfusion: 0, qualityScore: 0, differentials: [],
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    let result = null;

    if (process.env.ANTHROPIC_API_KEY) {
      result = await analyzeWithAnthropic(base64, mimeType).catch(() => null);
    }

    if (!result && process.env.GOOGLE_API_KEY) {
      result = await analyzeWithGemini(base64, mimeType).catch(() => null);
    }

    return NextResponse.json({ ok: true, analysis: result ?? BLOCKED });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
