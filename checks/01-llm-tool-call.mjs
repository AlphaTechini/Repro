// Capability check 1: can the chosen model provider drive tool calls, and what does it cost?
//
// Repro's agent works by calling tools (read the Clip, ask a follow-up, file the issue).
// This script sends the same kind of request a few times and prints whether the model
// called the tool and how many tokens it used.
//
// Run:  node --env-file=.env checks/01-llm-tool-call.mjs
//
// Uses the same .env values the app uses: AGENT_ENGINE, AGENT_MODEL and the
// matching key (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY).
// Optional: CHECK_RUNS = how many requests to send (default 5).
//
// OpenAI free-token note: OpenAI's data-sharing offer lists "tool use" as excluded.
// After running this with OpenAI, open
//   https://platform.openai.com/usage/chat-completions
// group by "service tier", and compare against Costs. If these requests show as
// "data sharing incentive tier" with no cost, tool calls are free for you.

const engine = (process.env.AGENT_ENGINE || "").trim();
const provider = {
  "ai-sdk:openai": "openai",
  anthropic: "anthropic",
  "ai-sdk:anthropic": "anthropic",
  "ai-sdk:google": "google",
}[engine];
const model = (process.env.AGENT_MODEL || "").trim();
const runs = Number(process.env.CHECK_RUNS || 5);

const SYSTEM =
  "You turn bug recordings into GitHub issues. When the report is complete, call file_issue. Never answer in prose.";
const USER = `Transcript of a bug recording:
[00:03] "I click Save on the profile page and nothing happens."
[00:09] "I tried twice, the button just spins."
Console: TypeError: Cannot read properties of undefined (reading 'id') at saveProfile (profile.js:88)
Network: POST /api/profile -> 500 (1.2s)
Reporter answered follow-ups: expected the profile to save and show a toast; happens every time; account role is editor.
File the issue now.`;

const TOOL = {
  name: "file_issue",
  description: "File a fix-ready GitHub issue for the bug.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      steps_to_reproduce: { type: "array", items: { type: "string" } },
      expected: { type: "string" },
      actual: { type: "string" },
      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    },
    required: ["title", "steps_to_reproduce", "expected", "actual", "severity"],
  },
};

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!["openai", "anthropic", "google"].includes(provider)) {
  fail(`AGENT_ENGINE must be ai-sdk:openai, anthropic or ai-sdk:google (got "${engine}").`);
}

async function listGoogleModels(key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
  );
  const body = await res.json();
  return (body.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""));
}

async function callOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) fail("OPENAI_API_KEY is not set.");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER },
      ],
      tools: [{ type: "function", function: TOOL }],
      tool_choice: "auto",
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error || body)}`);
  const msg = body.choices?.[0]?.message;
  const call = msg?.tool_calls?.[0];
  return {
    toolCalled: call?.function?.name === TOOL.name,
    args: call?.function?.arguments,
    usage: body.usage,
    serviceTier: body.service_tier,
  };
}

async function callAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) fail("ANTHROPIC_API_KEY is not set.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: USER }],
      tools: [{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.parameters }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error || body)}`);
  const call = (body.content || []).find((c) => c.type === "tool_use");
  return {
    toolCalled: call?.name === TOOL.name,
    args: call ? JSON.stringify(call.input) : undefined,
    usage: body.usage,
  };
}

async function callGoogle() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) fail("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: USER }] }],
        tools: [{ functionDeclarations: [TOOL] }],
      }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error || body)}`);
  const parts = body.candidates?.[0]?.content?.parts || [];
  const call = parts.find((p) => p.functionCall)?.functionCall;
  return {
    toolCalled: call?.name === TOOL.name,
    args: call ? JSON.stringify(call.args) : undefined,
    usage: body.usageMetadata,
  };
}

if (!model) {
  if (provider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const names = await listGoogleModels(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("AGENT_MODEL is empty. Models your Google key can use:\n  " + names.join("\n  "));
    process.exit(1);
  }
  fail("Set AGENT_MODEL.");
}

const call = { openai: callOpenAI, anthropic: callAnthropic, google: callGoogle }[provider];
let ok = 0;
for (let i = 1; i <= runs; i++) {
  const started = Date.now();
  try {
    const r = await call();
    const ms = Date.now() - started;
    console.log(
      `run ${i}: tool_called=${r.toolCalled} ${ms}ms usage=${JSON.stringify(r.usage)}${r.serviceTier ? ` service_tier=${r.serviceTier}` : ""}`,
    );
    if (i === 1 && r.args) console.log(`  first tool arguments: ${r.args}`);
    if (r.toolCalled) ok++;
  } catch (err) {
    console.log(`run ${i}: ERROR ${err.message}`);
  }
}

console.log(`\n${ok}/${runs} runs called file_issue with ${provider}:${model}.`);
if (provider === "openai") {
  console.log(
    "Now check https://platform.openai.com/usage/chat-completions grouped by service tier, and the Costs tab, to see whether these were free.",
  );
}
process.exit(ok === runs ? 0 : 1);
