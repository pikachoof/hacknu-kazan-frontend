import "dotenv/config";

import cors from "cors";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

import type {
  AgentAction,
  AgentReply,
  BoardSnapshot,
  Note,
} from "../src/types";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
const groqKey = process.env.GROQ_API_KEY ?? "";
const anthropicModel =
  process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
const groqModel = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const agentName = process.env.VITE_AGENT_NAME ?? "Canvas Oracle";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  const provider = anthropicKey ? "anthropic" : groqKey ? "groq" : "fallback";
  res.json({ ok: true, agentName, provider });
});

app.post("/api/agent", async (req, res) => {
  const { prompt, board } = req.body as {
    prompt?: string;
    board?: BoardSnapshot;
  };

  if (!prompt?.trim() || !board) {
    res.status(400).json({ error: "prompt and board are required" });
    return;
  }

  try {
    if (anthropicKey) {
      const result = await callClaude(prompt.trim(), board);
      res.json(result);
    } else if (groqKey) {
      console.log("ℹ️  Using Groq (free tier) instead of Claude");
      const result = await callGroq(prompt.trim(), board);
      res.json(result);
    } else {
      console.warn("⚠️  No AI API key set — using fallback");
      res.json(generateFallback(prompt.trim(), board));
    }
  } catch (err: any) {
    const status = err?.status ?? 0;
    const message: string = err?.error?.error?.message ?? String(err);

    if (status === 400 || status === 429) {
      console.warn(`⚠️  API error (${status}): ${message.slice(0, 120)}`);

      // If Anthropic has no credits, try Groq as fallback
      if (groqKey && message.includes("credit")) {
        console.log("↩️  Falling back to Groq...");
        try {
          const result = await callGroq(prompt!.trim(), board!);
          res.json(result);
          return;
        } catch (groqErr) {
          console.error("Groq also failed:", groqErr);
        }
      }

      res.json({
        reply: message.includes("credit")
          ? "Anthropic has no credits. Set GROQ_API_KEY in .env for free usage."
          : "Rate limited — try again in a moment.",
        actions: generateFallback(prompt!.trim(), board!).actions,
      });
      return;
    }

    console.error("Agent error:", err);
    res.status(500).json({
      reply: "Unexpected server error.",
      actions: generateFallback(prompt!.trim(), board!).actions,
    });
  }
});

app.listen(port, () =>
  console.log(`Agent API → http://localhost:${port}`),
);

// ─── Shared system prompt ─────────────────────────────────────────────────────

function buildSystemPrompt(board: BoardSnapshot): string {
  return `You are ${agentName}, an AI spatial collaborator embedded in a shared tldraw whiteboard.

You can see the canvas and must act on it spatially — not just reply in chat.

## Available actions (return as JSON array in "actions"):

1. CREATE a sticky note on the canvas (preferred for ideas):
{ "type": "create_shape", "shapeType": "note", "x": <number>, "y": <number>, "text": "<content>", "color": "<tldraw color>" }

2. CREATE plain text on the canvas:
{ "type": "create_shape", "shapeType": "text", "x": <number>, "y": <number>, "text": "<content>", "color": "<tldraw color>" }

3. CREATE a rectangle/frame with a label:
{ "type": "create_shape", "shapeType": "geo", "x": <number>, "y": <number>, "text": "<label>", "color": "<tldraw color>" }

4. MOVE or EDIT an existing canvas shape (use exact ID from the shapes list):
{ "type": "update_shape", "id": "<exact-shape-id>", "x": <number>, "y": <number>, "text": "<new text>", "color": "<color>" }

5. DELETE an existing canvas shape:
{ "type": "delete_shape", "id": "<exact-shape-id>" }

6. ADD a sidebar note card (optional complement to canvas shapes):
{ "type": "create_note", "note": { "title": "<title>", "body": "<body>", "x": <num>, "y": <num>, "width": 250, "height": 170, "color": "amber"|"teal"|"coral"|"sky"|"sage", "kind": "idea"|"question"|"action"|"insight", "createdBy": "agent", "pinned": false } }

## Valid tldraw colors: "black" | "blue" | "green" | "grey" | "light-blue" | "light-green" | "light-red" | "light-violet" | "orange" | "red" | "violet" | "white" | "yellow"

## Rules:
- ALWAYS use create_shape as your primary action — this places content DIRECTLY on the shared canvas
- Prefer "note" for ideas, "geo" for grouping/framing
- Spread shapes out: at least 250px apart; use a 1200x800 virtual canvas
- For update_shape / delete_shape: copy the shape ID VERBATIM from the shapes list
- Return at most 4 actions total
- "reply" must be 1-2 sentences max, conversational tone

Session mode: ${board.mode} | Room: ${board.roomId}

Return ONLY valid JSON (no markdown, no code blocks):
{ "reply": "...", "actions": [...] }`;
}

// ─── Claude ──────────────────────────────────────────────────────────────────

async function callClaude(
  prompt: string,
  board: BoardSnapshot,
): Promise<AgentReply> {
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const shapeSummary =
    (board.shapes ?? []).length > 0
      ? board.shapes
          .map((s) => `  • [${s.id}] ${s.type} @ (${s.x},${s.y})${s.text ? ` | text: "${s.text.slice(0, 60)}"` : ""}`)
          .join("\n")
      : "  (canvas is empty)";

  const noteSummary =
    (board.notes ?? []).length > 0
      ? board.notes.map((n) => `  • [${n.id}] "${n.title}": ${n.body.slice(0, 80)}`).join("\n")
      : "  (no sidebar notes)";

  const userMsg = [
    `Prompt: ${prompt}`,
    "",
    "=== Current canvas shapes ===",
    shapeSummary,
    "",
    "=== Sidebar notes ===",
    noteSummary,
  ].join("\n");

  const result = await anthropic.messages.create({
    model: anthropicModel,
    max_tokens: 1200,
    temperature: 0.55,
    system: buildSystemPrompt(board),
    messages: [{ role: "user", content: userMsg }],
  });

  const raw = result.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();

  console.log("🤖 Claude raw response:", raw.slice(0, 300));
  return normalizeReply(parseJSON(raw), board, prompt);
}

// ─── Groq (free tier, OpenAI-compatible) ─────────────────────────────────────

async function callGroq(
  prompt: string,
  board: BoardSnapshot,
): Promise<AgentReply> {
  const shapeSummary =
    (board.shapes ?? []).length > 0
      ? board.shapes.map((s) => `  • [${s.id}] ${s.type} @ (${s.x},${s.y})${s.text ? ` | "${s.text.slice(0, 60)}"` : ""}`).join("\n")
      : "  (canvas is empty)";

  const systemPrompt = buildSystemPrompt(board);
  const userMsg = [`Prompt: ${prompt}`, "", "=== Current canvas shapes ===", shapeSummary].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.55,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  console.log("🟢 Groq raw response:", raw.slice(0, 300));
  return normalizeReply(parseJSON(raw), board, prompt);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {/* */}
    }
    return null;
  }
}

function normalizeReply(
  raw: unknown,
  board: BoardSnapshot,
  prompt: string,
): AgentReply {
  if (!raw || typeof raw !== "object") {
    return generateFallback(prompt, board);
  }
  const obj = raw as Record<string, unknown>;
  const reply =
    typeof obj.reply === "string" && obj.reply.trim()
      ? obj.reply.trim()
      : "I've added some ideas to the canvas.";

  const actions = Array.isArray(obj.actions)
    ? obj.actions.flatMap(normalizeAction).slice(0, 4)
    : [];

  return { reply, actions };
}

function normalizeAction(raw: unknown): AgentAction[] {
  if (!raw || typeof raw !== "object") return [];
  const a = raw as Record<string, unknown>;

  if (a.type === "create_shape") {
    const validTypes = ["note", "text", "geo"];
    const shapeType = validTypes.includes(a.shapeType as string)
      ? (a.shapeType as "note" | "text" | "geo")
      : "note";
    return [{
      type: "create_shape",
      shapeType,
      x: num(a.x, 200),
      y: num(a.y, 200),
      text: str(a.text, ""),
      color: str(a.color, "yellow"),
    }];
  }

  if (a.type === "update_shape" && typeof a.id === "string") {
    const action: AgentAction = { type: "update_shape", id: a.id };
    if (typeof a.x === "number") action.x = a.x;
    if (typeof a.y === "number") action.y = a.y;
    if (typeof a.text === "string") action.text = a.text;
    if (typeof a.color === "string") action.color = a.color;
    return [action];
  }

  if (a.type === "delete_shape" && typeof a.id === "string") {
    return [{ type: "delete_shape", id: a.id }];
  }

  if (a.type === "create_note" && a.note && typeof a.note === "object") {
    const n = a.note as Partial<Note>;
    if (typeof n.title === "string" && typeof n.body === "string") {
      return [{
        type: "create_note",
        note: {
          id: typeof n.id === "string" && n.id ? n.id : crypto.randomUUID(),
          title: n.title,
          body: n.body,
          x: num(n.x, 120),
          y: num(n.y, 120),
          width: num(n.width, 250),
          height: num(n.height, 170),
          color: isNoteColor(n.color) ? n.color : "sky",
          kind: isNoteKind(n.kind) ? n.kind : "idea",
          createdBy: "agent",
          pinned: Boolean(n.pinned),
        },
      }];
    }
  }

  if (a.type === "move_note" && typeof a.id === "string") {
    return [{ type: "move_note", id: a.id, x: num(a.x, 100), y: num(a.y, 100) }];
  }

  return [];
}

function generateFallback(prompt: string, board: BoardSnapshot): AgentReply {
  const cx = 300;
  const cy = 200;
  const short = prompt.length > 44 ? `${prompt.slice(0, 41)}...` : prompt;
  const hasShapes = (board.shapes ?? []).length > 0;

  return {
    reply: `I've added "${short}" to the canvas and marked a next step.`,
    actions: [
      {
        type: "create_shape",
        shapeType: "note",
        x: cx,
        y: cy,
        text: prompt,
        color: "yellow",
      },
      {
        type: "create_shape",
        shapeType: "note",
        x: cx + 320,
        y: cy + 20,
        text: hasShapes
          ? "Review the existing ideas and refine the strongest one."
          : "Start by placing 2-3 seed ideas on the canvas.",
        color: "light-blue",
      },
    ],
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function isNoteColor(v: unknown): v is Note["color"] {
  return ["amber", "teal", "coral", "sky", "sage"].includes(v as string);
}
function isNoteKind(v: unknown): v is Note["kind"] {
  return ["idea", "question", "action", "insight"].includes(v as string);
}
