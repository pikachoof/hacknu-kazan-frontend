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
const anthropicModel =
  process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
const agentName = process.env.VITE_AGENT_NAME ?? "Canvas Oracle";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, agentName, model: anthropicModel });
});

app.post("/api/agent", async (request, response) => {
  const payload = request.body as { prompt?: string; board?: BoardSnapshot };
  const prompt = payload.prompt?.trim();
  const board = payload.board;

  if (!prompt || !board) {
    response.status(400).json({ error: "prompt and board are required" });
    return;
  }

  try {
    const result = anthropicKey
      ? await callClaude(prompt, board)
      : generateFallback(prompt, board);
    response.json(result);
  } catch (error) {
    console.error("Agent request failed:", error);
    response.status(500).json({
      reply:
        "I hit a backend error, so I drafted a safe fallback move instead.",
      actions: generateFallback(prompt, board).actions,
    });
  }
});

app.listen(port, () => {
  console.log(`Agent API listening on http://localhost:${port}`);
});

async function callClaude(
  prompt: string,
  board: BoardSnapshot,
): Promise<AgentReply> {
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const system = [
    "You are a spatial brainstorming agent embedded in a collaborative canvas.",
    "Your job is to improve the board, not to write a long essay.",
    "Return JSON only with this schema: { reply: string, actions: AgentAction[] }.",
    "Available actions: create_note, move_note, update_note, cluster_notes.",
    "Keep the reply concise and actionable.",
    "If you create notes, place them so the layout feels intentional and readable.",
    "If you cluster notes, choose only notes that actually belong together.",
    "Do not invent IDs for move_note or update_note; use existing board note IDs.",
    "Prefer at most 3 actions.",
    `Session mode: ${board.mode}`,
    `Room: ${board.roomId}`,
  ].join(" ");

  const userMessage = [
    `Prompt: ${prompt}`,
    `Board snapshot: ${JSON.stringify(board)}`,
    "Return a response that advances the session and visibly touches the canvas.",
  ].join("\n\n");

  const result = await anthropic.messages.create({
    model: anthropicModel,
    max_tokens: 900,
    temperature: 0.45,
    system,
    messages: [
      { role: "user", content: [{ type: "text", text: userMessage }] },
    ],
  });

  const text = result.content
    .map((item) => (item.type === "text" ? item.text : ""))
    .join("\n")
    .trim();

  const parsed = parseJsonReply(text);
  return normalizeAgentReply(parsed, board);
}

function parseJsonReply(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeAgentReply(
  candidate: unknown,
  board: BoardSnapshot,
): AgentReply {
  if (!candidate || typeof candidate !== "object") {
    return generateFallback(board.prompt, board);
  }

  const raw = candidate as { reply?: unknown; actions?: unknown };
  const reply =
    typeof raw.reply === "string" && raw.reply.trim().length > 0
      ? raw.reply.trim()
      : "I organized the board and added the next step.";

  const actions = Array.isArray(raw.actions)
    ? raw.actions.flatMap((action) => normalizeAction(action, board))
    : [];

  return {
    reply,
    actions: actions.slice(0, 3),
  };
}

function normalizeAction(action: unknown, board: BoardSnapshot): AgentAction[] {
  if (!action || typeof action !== "object") {
    return [];
  }

  const raw = action as Record<string, unknown>;

  if (raw.type === "create_note" && raw.note && typeof raw.note === "object") {
    const note = raw.note as Partial<Note>;
    if (typeof note.title === "string" && typeof note.body === "string") {
      return [
        {
          type: "create_note",
          note: {
            id:
              typeof note.id === "string" && note.id
                ? note.id
                : crypto.randomUUID(),
            title: note.title,
            body: note.body,
            x: typeof note.x === "number" ? note.x : 120,
            y: typeof note.y === "number" ? note.y : 120,
            width: typeof note.width === "number" ? note.width : 250,
            height: typeof note.height === "number" ? note.height : 170,
            color: isNoteColor(note.color) ? note.color : "sky",
            kind: isNoteKind(note.kind) ? note.kind : "idea",
            createdBy: "agent",
            pinned: Boolean(note.pinned),
          },
        },
      ];
    }
  }

  if (raw.type === "move_note" && typeof raw.id === "string") {
    return [
      {
        type: "move_note",
        id: raw.id,
        x: typeof raw.x === "number" ? raw.x : 100,
        y: typeof raw.y === "number" ? raw.y : 100,
      },
    ];
  }

  if (
    raw.type === "update_note" &&
    typeof raw.id === "string" &&
    raw.patch &&
    typeof raw.patch === "object"
  ) {
    return [
      {
        type: "update_note",
        id: raw.id,
        patch: sanitizePatch(raw.patch as Record<string, unknown>),
      },
    ];
  }

  if (
    raw.type === "cluster_notes" &&
    Array.isArray(raw.ids) &&
    typeof raw.label === "string"
  ) {
    return [
      {
        type: "cluster_notes",
        label: raw.label,
        ids: raw.ids.filter((id): id is string => typeof id === "string"),
        x: typeof raw.x === "number" ? raw.x : 240,
        y: typeof raw.y === "number" ? raw.y : 120,
        color: isNoteColor(raw.color) ? raw.color : "amber",
      },
    ];
  }

  return [];
}

function sanitizePatch(patch: Record<string, unknown>): Partial<Note> {
  const result: Partial<Note> = {};

  if (typeof patch.title === "string") {
    result.title = patch.title;
  }
  if (typeof patch.body === "string") {
    result.body = patch.body;
  }
  if (typeof patch.x === "number") {
    result.x = patch.x;
  }
  if (typeof patch.y === "number") {
    result.y = patch.y;
  }
  if (typeof patch.width === "number") {
    result.width = patch.width;
  }
  if (typeof patch.height === "number") {
    result.height = patch.height;
  }
  if (isNoteColor(patch.color)) {
    result.color = patch.color;
  }
  if (isNoteKind(patch.kind)) {
    result.kind = patch.kind;
  }
  if (typeof patch.pinned === "boolean") {
    result.pinned = patch.pinned;
  }

  return result;
}

function generateFallback(prompt: string, board: BoardSnapshot): AgentReply {
  const centerX = 320;
  const centerY = 180;
  const noteTitle =
    prompt.length > 44 ? `${prompt.slice(0, 41).trimEnd()}...` : prompt;

  return {
    reply: `I turned "${noteTitle}" into a concrete next move and parked it on the board.`,
    actions: [
      {
        type: "create_note",
        note: {
          id: crypto.randomUUID(),
          title: "Agent readout",
          body: prompt,
          x: centerX,
          y: centerY,
          width: 280,
          height: 180,
          color: "teal",
          kind: "insight",
          createdBy: "agent",
          pinned: false,
        },
      },
      {
        type: "create_note",
        note: {
          id: crypto.randomUUID(),
          title: "Next move",
          body:
            board.notes.length > 0
              ? "Cluster the strongest ideas and prune the rest."
              : "Add a few starting points so the agent has something to rearrange.",
          x: centerX + 320,
          y: centerY + 20,
          width: 250,
          height: 170,
          color: "amber",
          kind: "action",
          createdBy: "agent",
          pinned: false,
        },
      },
    ],
  };
}

function isNoteColor(value: unknown): value is Note["color"] {
  return (
    value === "amber" ||
    value === "teal" ||
    value === "coral" ||
    value === "sky" ||
    value === "sage"
  );
}

function isNoteKind(value: unknown): value is Note["kind"] {
  return (
    value === "idea" ||
    value === "question" ||
    value === "action" ||
    value === "insight"
  );
}
