import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { aiConfigFromEnv, deltaText, explainUserMessage, MemoryAiUsageStore, parseExplainRequest, streamExplanation, type AiConfig } from "./ai.js";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { MemoryLeaderboardStore } from "./leaderboard.js";
import { MemoryProgressStore } from "./progressStore.js";

const ORIGIN = "http://localhost:5173";
const config: AiConfig = { baseUrl: "https://gateway.test/v1", apiKey: "key", model: "test-model", dailyLimit: 2 };
const question = { subject: "Anatomy", question: "Which bone is a sesamoid bone?", options: ["Patella", "Femur"], answer: "Patella", chosen: "Femur", notes: [{ title: "Bones by shape", text: "Sesamoid bones sit inside tendons; the patella is the largest." }] };

/** An OpenAI-style event stream, cut at awkward places like a real network would. */
function sse(...parts: string[]): Response {
  const events = parts.map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`).join("") + "data: [DONE]\n\n";
  const chunks = [events.slice(0, 17), events.slice(17, 60), events.slice(60)];
  return new Response(
    new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
        c.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

describe("AI settings and requests", () => {
  it("needs the address, key and model, and defaults the daily limit", () => {
    expect(aiConfigFromEnv({ AI_BASE_URL: "https://x/v1/", AI_API_KEY: "k" })).toBeNull();
    expect(aiConfigFromEnv({ AI_BASE_URL: "https://x/v1/", AI_API_KEY: "k", AI_MODEL: "m" })).toEqual({ baseUrl: "https://x/v1", apiKey: "k", model: "m", dailyLimit: 30 });
    expect(aiConfigFromEnv({ AI_BASE_URL: "https://x", AI_API_KEY: "k", AI_MODEL: "m", AI_DAILY_LIMIT: "5" })?.dailyLimit).toBe(5);
  });

  it("rejects requests without a question or answer and trims what it keeps", () => {
    expect(parseExplainRequest({ question: "Q" })).toBeNull();
    expect(parseExplainRequest("nope")).toBeNull();
    const parsed = parseExplainRequest({ ...question, question: "x".repeat(5000), notes: Array(9).fill(question.notes[0]) })!;
    expect(parsed.question.length).toBe(1200);
    expect(parsed.notes).toHaveLength(4);
    expect(explainUserMessage(parsed)).toContain("The student chose: Femur");
  });

  it("reads the text out of event-stream lines", () => {
    expect(deltaText('data: {"choices":[{"delta":{"content":"Hi"}}]}')).toBe("Hi");
    expect(deltaText("data: [DONE]")).toBe("");
    expect(deltaText(": keep-alive")).toBe("");
    expect(deltaText("data: {broken")).toBe("");
  });
});

describe("streamExplanation", () => {
  it("sends the model, key and notes, and streams back plain text", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const fake = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return sse("The patella ", "sits in the ", "quadriceps tendon.");
    }) as unknown as typeof fetch;
    const res = await streamExplanation(config, parseExplainRequest(question)!, fake);
    expect(await res.text()).toBe("The patella sits in the quadriceps tendon.");
    expect(sent!.url).toBe("https://gateway.test/v1/chat/completions");
    expect(new Headers(sent!.init.headers).get("authorization")).toBe("Bearer key");
    const body = JSON.parse(String(sent!.init.body));
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(true);
    expect(body.messages[1].content).toContain("Sesamoid bones sit inside tendons");
  });

  it("turns a gateway rate limit into a clear message", async () => {
    const fake = (async () => new Response("slow down", { status: 429 })) as unknown as typeof fetch;
    const res = await streamExplanation(config, parseExplainRequest(question)!, fake);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/allowance/);
  });
});

describe("/api/ai/explain", () => {
  function setup(withAi: boolean) {
    const auth = createAuth({
      database: memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] }),
      secret: "test-secret-test-secret-test-secret-1234",
      baseURL: ORIGIN,
      trustedOrigins: [ORIGIN],
      onDeleteUser: async () => {},
      rateLimit: false,
    });
    const fake = (async () => sse("Because ", "it is.")) as unknown as typeof fetch;
    const app = createApp({
      auth,
      store: new MemoryProgressStore(),
      leaderboard: new MemoryLeaderboardStore(),
      googleEnabled: false,
      ai: withAi ? { config, usage: new MemoryAiUsageStore(), fetch: fake } : undefined,
    });
    const req = (path: string, body?: unknown, cookie?: string) => {
      const headers = new Headers({ origin: ORIGIN, "content-type": "application/json" });
      if (cookie) headers.set("cookie", cookie);
      return app(new Request(ORIGIN + path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    };
    const signUp = async () => {
      const res = await req("/api/auth/sign-up/email", { email: "s@example.com", password: "correct-horse-1", name: "S" });
      return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    };
    return { req, signUp };
  }

  it("says whether AI is on", async () => {
    expect((await (await setup(true).req("/api/config")).json()).ai).toBe(true);
    expect((await (await setup(false).req("/api/config")).json()).ai).toBe(false);
  });

  it("needs a session, explains, counts down and stops at the daily limit", async () => {
    const { req, signUp } = setup(true);
    expect((await req("/api/ai/explain", question)).status).toBe(401);
    const cookie = await signUp();
    const first = await req("/api/ai/explain", question, cookie);
    expect(first.status).toBe(200);
    expect(first.headers.get("x-ai-remaining")).toBe("1");
    expect(await first.text()).toBe("Because it is.");
    expect((await req("/api/ai/explain", question, cookie)).status).toBe(200);
    const third = await req("/api/ai/explain", question, cookie);
    expect(third.status).toBe(429);
    expect((await third.json()).error).toMatch(/today's 2 AI explanations/);
  });

  it("answers 503 when AI isn't configured and 400 for a bad request", async () => {
    const off = setup(false);
    expect((await off.req("/api/ai/explain", question, await off.signUp())).status).toBe(503);
    const on = setup(true);
    expect((await on.req("/api/ai/explain", { question: "only" }, await on.signUp())).status).toBe(400);
  });
});
