import { LiveObject } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useMutation,
  useMyPresence,
  useOthers,
  useStatus,
  useStorage,
} from "@liveblocks/react/suspense";
import { useEffect, useMemo, useState } from "react";
import { toRichText } from "@tldraw/editor";

import { agentRequest } from "../api/agent-request";
import { InspectorPanel } from "../components/InspectorPanel";
import { SessionPanel } from "../components/SessionPanel";
import { TldrawBoard } from "../components/TldrawBoard";
import {
  buildBoardSnapshot,
  createBlankNote,
  createInitialPresence,
  createInitialStorage,
} from "../liveblocks";
import type { AgentAction, BoardShape, ChatMessage, Note, Presence } from "../types";

const defaultRoomId = import.meta.env.VITE_ROOM_ID ?? "hacknu-demo";
const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;
const oracleName = import.meta.env.VITE_AGENT_NAME ?? "Canvas Oracle";

type HumanIdentity = {
  name: string;
  color: string;
};

export default function WhiteboardPage() {
  const [identity] = useState<HumanIdentity>(() => ({
    name: makeHumanName(),
    color: pickColor(),
  }));
  const [roomInput, setRoomInput] = useState(defaultRoomId);
  const [roomId, setRoomId] = useState(defaultRoomId);

  if (!publicApiKey) {
    return <MissingConfig />;
  }

  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <main className="app-shell">
        <header className="hero-bar">
          <div>
            <div className="eyebrow">Whiteboard</div>
            <h1>AI Brainstorm Canvas</h1>
            <p>
              Collaborate in real time, prompt the agent, and let it reshape the
              canvas with spatial actions instead of chat-only replies.
            </p>
          </div>

          <div className="hero-meta">
            <div className="hero-stats">
              <div>
                <strong>{roomId}</strong>
                <span>active room</span>
              </div>
              <div>
                <strong>{identity.name}</strong>
                <span>you</span>
              </div>
            </div>
          </div>
        </header>

        <RoomProvider
          key={roomId}
          id={roomId}
          initialPresence={createInitialPresence(identity.name, identity.color)}
          initialStorage={() => createInitialStorage(roomId)}
        >
          <ClientSideSuspense fallback={<WhiteboardLoading />}>
            <WhiteboardWorkspace roomId={roomId} identity={identity} />
          </ClientSideSuspense>
        </RoomProvider>
      </main>
    </LiveblocksProvider>
  );
}

function WhiteboardWorkspace({
  roomId,
  identity,
}: {
  roomId: string;
  identity: HumanIdentity;
}) {
  const [myPresence, updateMyPresence] = useMyPresence() as [
    Presence,
    (patch: Partial<Presence>) => void,
  ];
  const notes = (useStorage((root) => root.notes) ?? []) as Note[];
  const others = useOthers();
  const status = useStatus();
  const [editor, setEditor] = useState<any>(null);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      author: "System",
      role: "system",
      text: `Joined room "${roomId}". Ask the agent to reorganize notes or synthesize next steps.`,
      createdAt: Date.now(),
    },
  ]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const othersForBoard = useMemo(
    () =>
      others.map((other) => ({
        connectionId: other.connectionId,
        presence: other.presence as Presence | undefined,
      })),
    [others],
  );

  useEffect(() => {
    if (selectedNoteId && !notes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(null);
    }
  }, [notes, selectedNoteId]);

  const createNote = useMutation(({ storage }, overrides: Partial<Note> = {}) => {
    const list = storage.get("notes") as any;
    const note = createBlankNote(list.length, overrides);
    list.push(new LiveObject(note));
    return note.id;
  }, []);

  const moveNote = useMutation(({ storage }, noteId: string, x: number, y: number) => {
    const list = storage.get("notes") as any;
    const target = list.find((item: any) => item.get("id") === noteId);
    if (!target) return;
    target.set("x", Math.round(x));
    target.set("y", Math.round(y));
  }, []);

  const patchNote = useMutation(
    (
      { storage },
      noteId: string,
      patch: Partial<Omit<Note, "id" | "createdBy">>,
    ) => {
      const list = storage.get("notes") as any;
      const target = list.find((item: any) => item.get("id") === noteId);
      if (!target) return;
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined) return;
        target.set(key as keyof Omit<Note, "id" | "createdBy">, value);
      });
    },
    [],
  );

  const deleteNote = useMutation(({ storage }, noteId: string) => {
    if (!noteId) return;
    const list = storage.get("notes") as any;
    const index = list.findIndex((item: any) => item.get("id") === noteId);
    if (index >= 0) list.delete(index);
  }, []);

  const applyAgentActions = useMutation(({ storage }, actions: AgentAction[]) => {
    const list = storage.get("notes") as any;
    if (!list) return;
    const findNote = (id: string) => list.find((item: any) => item.get("id") === id);

    for (const action of actions) {
      if (action.type === "create_note") {
        const exists = list.some((item: any) => item.get("id") === action.note.id);
        list.push(
          new LiveObject({
            ...action.note,
            id: exists ? crypto.randomUUID() : action.note.id,
            createdBy: "agent",
          }),
        );
        continue;
      }

      if (action.type === "move_note") {
        const target = findNote(action.id);
        if (target) {
          target.set("x", Math.round(action.x));
          target.set("y", Math.round(action.y));
        }
        continue;
      }

      if (action.type === "update_note") {
        const target = findNote(action.id);
        if (target) {
          Object.entries(action.patch).forEach(([key, value]) => {
            if (value === undefined) return;
            target.set(key as keyof Omit<Note, "id" | "createdBy">, value);
          });
        }
        continue;
      }

      if (action.type === "cluster_notes") {
        action.ids.forEach((noteId, index) => {
          const target = findNote(noteId);
          if (!target) return;
          target.set("x", action.x + (index % 2) * 290);
          target.set("y", action.y + Math.floor(index / 2) * 210);
          target.set("color", action.color);
        });

        list.push(
          new LiveObject(
            createBlankNote(list.length, {
              title: action.label,
              body: "Cluster created by the agent.",
              x: action.x - 28,
              y: action.y - 70,
              width: 300,
              height: 120,
              color: action.color,
              kind: "insight",
              createdBy: "agent",
              pinned: true,
            }),
          ),
        );
      }
    }
  }, []);

  function pushMessage(
    role: ChatMessage["role"],
    author: string,
    text: string,
  ) {
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role,
        author,
        text,
        createdAt: Date.now(),
      },
    ]);
  }

  async function handlePromptSubmit(prompt: string) {
    if (pending) {
      return;
    }

    pushMessage("human", identity.name, prompt);
    setPending(true);

    try {
      // Collect current shapes from the tldraw canvas
      const boardShapes: BoardShape[] = editor
        ? editor.getCurrentPageShapes().map((s: any) => ({
            id: s.id,
            type: s.type,
            x: Math.round(s.x),
            y: Math.round(s.y),
            text: s.props?.text ?? "",
            color: s.props?.color ?? "",
          }))
        : [];

      const board = buildBoardSnapshot(notes, boardShapes, prompt, roomId, myPresence.mode);
      const reply = await agentRequest(prompt, board);

      // Apply note-based actions to Liveblocks storage
      applyAgentActions(reply.actions);

      // Apply tldraw shape actions directly on the canvas
      if (editor) {
        for (const action of reply.actions) {
          if (action.type === "create_shape") {
            try {
              const shapePartial: any = {
                type: action.shapeType,
                x: action.x,
                y: action.y,
                props: {},
              };

              if (action.shapeType === "text") {
                // tldraw v4: text shape uses richText, not text
                shapePartial.props.richText = toRichText(action.text ?? "");
                if (action.color) shapePartial.props.color = action.color;
              } else if (action.shapeType === "note") {
                // tldraw v4: note shape also uses richText
                shapePartial.props.richText = toRichText(action.text ?? "");
                if (action.color) shapePartial.props.color = action.color;
              } else if (action.shapeType === "geo") {
                // geo uses plain text prop + dimensions
                shapePartial.props.w = 240;
                shapePartial.props.h = 140;
                if (action.text) shapePartial.props.text = action.text;
                if (action.color) shapePartial.props.color = action.color;
              }

              editor.createShapes([shapePartial]);
            } catch (err) {
              console.warn("create_shape failed", err);
            }
          }

          if (action.type === "update_shape") {
            try {
              const existing = editor.getShape(action.id);
              if (existing) {
                const patch: any = { id: action.id, type: existing.type };
                if (action.x !== undefined) patch.x = action.x;
                if (action.y !== undefined) patch.y = action.y;
                if (action.text !== undefined || action.color !== undefined) {
                  patch.props = { ...(existing.props || {}) };
                  if (action.text !== undefined) patch.props.text = action.text;
                  if (action.color !== undefined) patch.props.color = action.color;
                }
                editor.updateShapes([patch]);
              }
            } catch (err) {
              console.warn("update_shape failed", err);
            }
          }

          if (action.type === "delete_shape") {
            try {
              editor.deleteShapes([action.id]);
            } catch (err) {
              console.warn("delete_shape failed", err);
            }
          }
        }
      }

      pushMessage("agent", oracleName, reply.reply);

      const shapeCount = reply.actions.filter(a =>
        a.type === "create_shape" || a.type === "update_shape" || a.type === "delete_shape"
      ).length;
      const noteCount = reply.actions.filter(a =>
        a.type === "create_note" || a.type === "move_note" || a.type === "update_note" || a.type === "cluster_notes"
      ).length;
      const total = reply.actions.length;

      if (total > 0) {
        const parts = [];
        if (shapeCount > 0) parts.push(`${shapeCount} canvas action${shapeCount > 1 ? "s" : ""}`);
        if (noteCount > 0) parts.push(`${noteCount} note action${noteCount > 1 ? "s" : ""}`);
        pushMessage("system", "System", `${oracleName} applied: ${parts.join(", ")}.`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown backend failure";
      pushMessage("system", "System", `Agent request failed: ${message}`);
    } finally {
      setPending(false);
    }
  }

  function handleCreateStarterNote() {
    const noteId = createNote({
      title: "Fresh note",
      body: "Capture a new thought here.",
      color: "sky",
      kind: "idea",
    });
    setSelectedNoteId(noteId);
  }

  function handleDeleteNote(noteId: string) {
    deleteNote(noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  }

  return (
    <section className="workspace-grid">
      <SessionPanel
        messages={messages}
        othersCount={others.length}
        connectionStatus={formatConnectionStatus(status)}
        onPromptSubmit={handlePromptSubmit}
        pending={pending}
      />

      <div className="board-wrap">
        <TldrawBoard
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onMoveNote={moveNote}
          onPointerMove={(cursor) => updateMyPresence({ cursor })}
          onCreateStarterNote={handleCreateStarterNote}
          others={othersForBoard}
          onDeleteNote={handleDeleteNote}
          onEditorReady={setEditor}
        />
      </div>

      <div className="sidebar-stack">
        <aside className="panel control-panel">
          <div className="panel-kicker">Human controls</div>
          <h2>Agent mode</h2>
          <p>
            Choose how assertive the agent should be during this session, then
            steer it with prompts.
          </p>

          <div className="mode-toggles">
            {(["assist", "lead", "listen"] as Presence["mode"][]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`toggle ${myPresence.mode === mode ? "active" : ""}`}
                onClick={() => updateMyPresence({ mode })}
              >
                {mode}
              </button>
            ))}
          </div>

          <h3>Collaborators</h3>
          <div className="collaborator-list">
            <div className="collaborator-row">
              <span
                className="collaborator-dot"
                style={{ background: identity.color }}
              />
              <div>
                <strong>{identity.name} (you)</strong>
                <span>{formatConnectionStatus(status)}</span>
              </div>
            </div>

            {others.map((other) => {
              const otherPresence = other.presence as Presence | undefined;
              return (
                <div className="collaborator-row" key={other.connectionId}>
                  <span
                    className="collaborator-dot"
                    style={{ background: otherPresence?.color ?? "#9b9b9b" }}
                  />
                  <div>
                    <strong>
                      {otherPresence?.name ?? `Guest ${other.connectionId}`}
                    </strong>
                    <span>{otherPresence?.mode ?? "assist"} mode</span>
                  </div>
                </div>
              );
            })}
          </div>

          <h3>Notes data</h3>
          <div className="row-grid">
            <button
              className="ghost-button"
              type="button"
              onClick={handleCreateStarterNote}
            >
              Add note
            </button>
            <button
              className="ghost-button danger"
              type="button"
              disabled={!selectedNoteId}
              onClick={() => handleDeleteNote(selectedNoteId ?? "")}
            >
              Delete
            </button>
          </div>

          <div className="collaborator-list">
            {notes.length === 0 ? (
              <p className="empty-state">
                There are no notes in storage yet. Add one to seed the agent.
              </p>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="ghost-button"
                  style={{
                    textAlign: "left",
                    borderColor:
                      selectedNoteId === note.id
                        ? "rgba(143, 79, 42, 0.45)"
                        : undefined,
                    background:
                      selectedNoteId === note.id
                        ? "rgba(143, 79, 42, 0.14)"
                        : undefined,
                  }}
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  {note.title}
                </button>
              ))
            )}
          </div>
        </aside>

        <InspectorPanel note={selectedNote} onChange={patchNote} />
      </div>
    </section>
  );
}

function WhiteboardLoading() {
  return (
    <section className="panel loading-card">
      <div className="panel-kicker">Loading board</div>
      <h2>Connecting to room</h2>
      <p>Hydrating the shared storage and presence state for this workspace.</p>
    </section>
  );
}

function MissingConfig() {
  return (
    <main className="app-shell">
      <section className="panel error-panel">
        <div className="panel-kicker">Missing config</div>
        <h1>Set VITE_LIVEBLOCKS_PUBLIC_KEY first</h1>
        <p>
          The whiteboard needs a Liveblocks public key to join a shared room.
          Copy <code>.env.example</code> to <code>.env</code>, fill the key,
          and restart the dev server.
        </p>
      </section>
    </main>
  );
}

function formatConnectionStatus(status: string): string {
  if (status === "connected") return "Connected";
  if (status === "connecting" || status === "initial") return "Connecting";
  if (status === "reconnecting") return "Reconnecting";
  return "Offline";
}

function makeHumanName() {
  const animals = [
    "Олень", "Барсук", "Енот", "Лис",
    "Пингвин", "Осьминог", "Ежик", "Лемур",
    "Жираф", "Альпака", "Хомяк", "Сурикат"
  ];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomId = Math.floor(1000 + Math.random() * 9000);
  return `Неопознанный ${randomAnimal}-${randomId}`;
}

function pickColor() {
  const colors = ["#9d5d2f", "#2d8a7e", "#c95c4b", "#4c72b8", "#708f59"];
  return colors[Math.floor(Math.random() * colors.length)];
}
