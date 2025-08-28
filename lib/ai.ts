type Provider = "openai" | "anthropic";

export async function callAI(prompt: string, provider: Provider, model: string, signal?: AbortSignal): Promise<string> {
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a strict vehicle diagnostics expert. Always return JSON only."},
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
      signal,
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${t}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model || "claude-3-5-sonnet-20240620",
        max_tokens: 2000,
        system: "You are a strict vehicle diagnostics expert. Always return JSON only.",
        messages: [{ role: "user", content: prompt }]
      }),
      signal,
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Anthropic error: ${resp.status} ${t}`);
    }
    const data = await resp.json();
    const content = data.content?.[0]?.text ?? "";
    return content;
  }
  throw new Error("Unsupported provider");
}

/** Attempt to coerce any text into JSON object */
export function coerceToJSONObject(text: string): any {
  const raw = text.trim();
  try { return JSON.parse(raw); } catch {}

  const m = raw.match(/([\[{][\s\S]*[\]}])/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }
  return { message: raw };
}

/** Normalize any object into the expected schema */
export function normalizeToSchema(obj: any): any {
  return {
    summary: typeof obj?.summary === "string" ? obj.summary : (obj?.message || ""),
    trouble_code: typeof obj?.trouble_code === "string" ? obj.trouble_code : "",
    probable_causes: Array.isArray(obj?.probable_causes)
      ? obj.probable_causes.map(String)
      : [],
    tests: Array.isArray(obj?.tests)
      ? obj.tests.map((t: any) => ({
          name: typeof t?.name === "string" ? t.name : "",
          steps: Array.isArray(t?.steps) ? t.steps.map(String) : []
        }))
      : [],
    recommended_parts: Array.isArray(obj?.recommended_parts)
      ? obj.recommended_parts.map(String)
      : [],
    estimated_difficulty: ["easy","moderate","hard"].includes(obj?.estimated_difficulty)
      ? obj.estimated_difficulty
      : "moderate",
    next_actions: Array.isArray(obj?.next_actions)
      ? obj.next_actions.map(String)
      : []
  };
}
