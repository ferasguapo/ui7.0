import { NextRequest, NextResponse } from "next/server";
import { scrapeOreilly, scrapeYoutube } from "@/lib/scraper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, make, model, part, code, notes } = body;

    const vehicleInfo = [year, make, model].filter(Boolean).join(" ");

    const prompt = `
You are an expert automotive repair assistant.
Explain as if teaching someone with NO prior car repair experience.
Be extremely step-by-step, clear, and beginner friendly.

Format your response in sections with emoji headings like this:

📝 Overview
...

🔍 Diagnostic Steps
...

🛠 Repair Steps
...

🔧 Tools Needed
...

⏱ Estimated Time
...

💰 Estimated Cost
...

🔩 Parts
...

🎥 Related Videos
...

Vehicle: ${vehicleInfo || "Unknown"}
${part ? `Part: ${part}` : ""}
${code ? `OBD-II Code: ${code}` : ""}
${notes ? `Notes: ${notes}` : ""}
`;

    // Call Hugging Face Inference API
    const res = await fetch(
      "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 800, temperature: 0.7 },
        }),
      }
    );

    const data = await res.json();

    // Hugging Face returns an array like: [{ generated_text: "..." }]
    const aiText =
      Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : JSON.stringify(data);

    // Scrape extra resources
    const oreillyLinks = await scrapeOreilly(`${vehicleInfo} ${part ?? ""}`);
    const youtubeLinks = await scrapeYoutube(`${vehicleInfo} ${part ?? ""} repair`);

    // Append scraped resources to the AI response
    const finalText = `${aiText}

🔩 Related Parts (O’Reilly Auto Parts)
${oreillyLinks.map((l) => `- ${l}`).join("\n")}

🎥 Related Tutorials (YouTube)
${youtubeLinks.map((l) => `- ${l}`).join("\n")}
`;

    return NextResponse.json(
      { ok: true, data: finalText },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

