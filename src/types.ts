export type CursorPoint = {
  x: number;
  y: number;
};

export type NoteKind = "idea" | "question" | "action" | "insight";
export type NoteColor = "amber" | "teal" | "coral" | "sky" | "sage";

export type Presence = {
  name: string;
  color: string;
  cursor: CursorPoint | null;
  mode: "assist" | "lead" | "listen";
};

export type Note = {
  id: string;
  title: string;
  body: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: NoteColor;
  kind: NoteKind;
  createdBy: "human" | "agent";
  pinned: boolean;
};

export type ChatMessage = {
  id: string;
  author: string;
  role: "human" | "agent" | "system";
  text: string;
  createdAt: number;
};

export type AgentAction =
  | {
      type: "create_note";
      note: Note;
    }
  | {
      type: "move_note";
      id: string;
      x: number;
      y: number;
    }
  | {
      type: "update_note";
      id: string;
      patch: Partial<Omit<Note, "id" | "createdBy">>;
    }
  | {
      type: "cluster_notes";
      label: string;
      ids: string[];
      x: number;
      y: number;
      color: NoteColor;
    };

export type BoardSnapshot = {
  notes: Array<
    Pick<
      Note,
      | "id"
      | "title"
      | "body"
      | "x"
      | "y"
      | "width"
      | "height"
      | "color"
      | "kind"
      | "createdBy"
      | "pinned"
    >
  >;
  prompt: string;
  roomId: string;
  mode: Presence["mode"];
};

export type AgentReply = {
  reply: string;
  actions: AgentAction[];
};

export type FunctionCall = {
  name: string;
  args?: Record<string, unknown>;
};

export type AgentActionExtended = AgentAction | { type: "function_calls"; calls: FunctionCall[] };
