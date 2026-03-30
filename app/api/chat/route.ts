import { buildSystemPrompt } from "@/lib/prompt";
import type { ChatRequestBody } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response("Missing OPENROUTER_API_KEY", { status: 500 });
  }

  const body = (await request.json()) as ChatRequestBody;
  const model = process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct:free";

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://the-content-lab.internal",
      "X-Title": "The Content Lab AI"
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...body.messages
      ]
    })
  });

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text();
    return new Response(errorText || "OpenRouter request failed", { status: upstream.status || 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.replace("data:", "").trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = json.choices?.[0]?.delta?.content;

              if (token) {
                controller.enqueue(encoder.encode(token));
              }
            } catch {
              // Skip malformed line chunks.
            }
          }
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
