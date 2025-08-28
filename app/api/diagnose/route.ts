import { NextRequest, NextResponse } from "next/server";
import { callAI, coerceToJSONObject, normalizeToSchema } from "@/lib/ai";
import { scrapeOreilly, scrapeYoutube } from "@/lib/scraper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, make, model, part, code, notes, provider, modelName } = body;

    const prompt = [
      "Generate a structured automotive diagnostic and repair guide as JSON.",
      "Always return VALID JSON. No prose. Use these keys:",
      "{",
      "  \"overview\": string,",
      "  \"diagnostic_steps\": string[],",
      "  \"repair_steps\": string[],",
      "  \"tools_needed\": string[],",
      "  \"time_estimate\": string,",
      "  \"cost_estimate\": string,",
      "  \"parts\": string[],",
      "  \"videos\": string[]",
      "}",
      "Write as if explaining to someone with NO prior car repair experience. Be very clear and step-by-step.",
      "",
      "Vehicle: " + [year, make, model].filter(Boolean).join(" "),
      part ? `Part: ${part}` : "",
      code ? `OBD-II Code: ${code}` : "",
      notes ? `Notes: ${notes}` : ""
    ].filter(Boolean).join("\n");

    const aiText = await callAI(
      prompt,
      provider ?? (process.env.DEFAULT_PROVIDER as any) ?? "openai",
      modelName ?? process.env.DEFAULT_MODEL ?? ""
    );

    const parsed = coerceToJSONObject(aiText);
    const normalized = normalizeToSchema(parsed);

    return NextResponse.json({ ok: true, data: normalized, raw: aiText }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
