import { LiveList, LiveObject } from "@liveblocks/client";

import type { BoardShape, BoardSnapshot, Note, NoteColor, Presence } from "./types";

export const notePalette: Record<
  NoteColor,
  { fill: string; stroke: string; glow: string }
> = {
  amber: {
    fill: "#f7dd9f",
    stroke: "#8e6b12",
    glow: "rgba(247, 221, 159, 0.35)",
  },
  teal: {
    fill: "#c9efe8",
    stroke: "#167163",
    glow: "rgba(201, 239, 232, 0.35)",
  },
  coral: {
    fill: "#ffd1c7",
    stroke: "#b44e3c",
    glow: "rgba(255, 209, 199, 0.35)",
  },
  sky: {
    fill: "#d6e7ff",
    stroke: "#3f68a8",
    glow: "rgba(214, 231, 255, 0.35)",
  },
  sage: {
    fill: "#dbe9d2",
    stroke: "#5a7a4a",
    glow: "rgba(219, 233, 210, 0.35)",
  },
};

export const noteKindLabels: Record<Note["kind"], string> = {
  idea: "Idea",
  question: "Question",
  action: "Action",
  insight: "Insight",
};

export const noteKindHints: Record<Note["kind"], string> = {
  idea: "unfiltered thought",
  question: "thing to investigate",
  action: "next move",
  insight: "pattern worth keeping",
};

export const createInitialPresence = (
  name: string,
  color: string,
): Presence => ({
  name,
  color,
  cursor: null,
  mode: "assist",
});

export const createStarterNotes = (roomId: string): Note[] => {
  const roomSeed = roomId.length % 4;

  return [
    {
      id: "north-star",
      title: "North star",
      body: "What would make this session feel obviously useful in 10 minutes?",
      x: 72 + roomSeed * 8,
      y: 64,
      width: 260,
      height: 170,
      color: "amber",
      kind: "insight",
      createdBy: "human",
      pinned: true,
    },
    {
      id: "wild-shot",
      title: "Wild shot",
      body: "The agent should place something spatial, not just answer in text.",
      x: 380,
      y: 112,
      width: 260,
      height: 170,
      color: "teal",
      kind: "idea",
      createdBy: "human",
      pinned: true,
    },
    {
      id: "demo-lane",
      title: "Demo lane",
      body: "Show 2+ people collaborating, the agent reacting, and a visible control loop.",
      x: 220,
      y: 320,
      width: 290,
      height: 180,
      color: "coral",
      kind: "action",
      createdBy: "agent",
      pinned: true,
    },
  ];
};

export const createInitialStorage = (roomId: string) => ({
  notes: new LiveList(
    createStarterNotes(roomId).map((note) => new LiveObject(note)),
  ),
  tldrawDoc: "",
});

export const createBlankNote = (
  index: number,
  overrides: Partial<Note> = {},
): Note => ({
  id: crypto.randomUUID(),
  title: overrides.title ?? `Note ${index + 1}`,
  body: overrides.body ?? "",
  x: overrides.x ?? 96 + (index % 4) * 28,
  y: overrides.y ?? 96 + Math.floor(index / 4) * 28,
  width: overrides.width ?? 250,
  height: overrides.height ?? 170,
  color: overrides.color ?? "sky",
  kind: overrides.kind ?? "idea",
  createdBy: overrides.createdBy ?? "human",
  pinned: overrides.pinned ?? false,
});

export const buildBoardSnapshot = (
  notes: Note[],
  shapes: BoardShape[],
  prompt: string,
  roomId: string,
  mode: Presence["mode"],
): BoardSnapshot => ({
  notes: notes.map(
    ({
      id,
      title,
      body,
      x,
      y,
      width,
      height,
      color,
      kind,
      createdBy,
      pinned,
    }) => ({
      id,
      title,
      body,
      x,
      y,
      width,
      height,
      color,
      kind,
      createdBy,
      pinned,
    }),
  ),
  shapes,
  prompt,
  roomId,
  mode,
});
