import { LiveList, LiveObject } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import {
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useOthers,
  useStatus,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Suspense, useEffect, useMemo, useState } from "react";

import { BrainstormBoard } from "../components/BrainstormBoard";
import { InspectorPanel } from "../components/InspectorPanel";
import { SessionPanel } from "../components/SessionPanel";
import {
  buildBoardSnapshot,
  createBlankNote,
  createInitialPresence,
  createInitialStorage,
} from "../liveblocks";
import type { AgentReply, ChatMessage, Note, Presence } from "../types";

const defaultRoomId = import.meta.env.VITE_ROOM_ID ?? "hacknu-demo";
const humanName = makeHumanName();
const humanColor = pickColor();
const agentName = import.meta.env.VITE_AGENT_NAME ?? "Canvas Oracle";

export function Whiteboard() {
  const publicKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

  if (!publicKey) {
    return (
      <main className="app-shell">
        <section className="panel error-panel">
          <div className="panel-kicker">Missing config</div>
          <h1>Set VITE_LIVEBLOCKS_PUBLIC_KEY first</h1>
          <p>
            The canvas needs a Liveblocks public key to join a shared room. Copy{" "}
            <code>.env.example</code> to <code>.env</code>, fill the key, and
            restart the dev server.
          </p>
        </section>
      </main>
    );
  }

  return (
    <LiveblocksProvider publicApiKey={publicKey}>
      <RoomShell />
    </LiveblocksProvider>
  );
}

function RoomShell() {
  const [roomId, setRoomId] = useState(defaultRoomId);

  return (
    <RoomProvider
      key={roomId}
      id={roomId}
      initialPresence={createInitialPresence(humanName, humanColor)}
      initialStorage={() => createInitialStorage(roomId)}
    >
      <Suspense
        fallback={
          <main className="app-shell loading-shell">
            <section className="panel loading-card">
              <div className="panel-kicker">Loading room</div>
              <h1>Bringing the canvas online</h1>
              <p>
                Waiting for the Liveblocks room and the initial board state to
                hydrate.
              </p>
            </section>
          </main>
        }
      >
        <div>text</div>
        <Workspace roomId={roomId} onRoomIdChange={setRoomId} />
      </Suspense>
    </RoomProvider>
  );
}

function Workspace({
  roomId,
  onRoomIdChange,
}: {
  roomId: string;
  onRoomIdChange: (roomId: string) => void;
}) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [feed, setFeed] = useState<ChatMessage[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState(false);
  const [composerMode, setComposerMode] = useState<Presence["mode"]>("assist");
  const notesLive = useStorage((root) => root.notes);
  const others = useOthers();
  const connectionStatus = useStatus();
  const updatePresence = useUpdateMyPresence();
  const broadcast = useBroadcastEvent();
  const ensureNotesList = useMutation(
    ({ storage }) => {
      const existing = storage.get("notes");

      if (existing) {
        return existing;
      }

      const seededNotes = new LiveList(
        createStarterNotes(roomId).map((note) => new LiveObject(note)),
      );
      storage.set("notes", seededNotes);
      return seededNotes;
    },
    [roomId],
  );

  const notes = useMemo(
    () => (notesLive ? notesLive.map((note) => note) : []),
    [notesLive],
  );
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  useEffect(() => {
    if (!notesLive) {
      ensureNotesList();
    }
  }, [ensureNotesList, notesLive]);

  useEffect(() => {
    updatePresence({ mode: composerMode });
  }, [composerMode, updatePresence]);

  const createNote = useMutation(({ storage }) => {
    const list = storage.get("notes") ?? ensureNotesList();
    const note = createBlankNote(list.length, {
      title: "Fresh idea",
      body: "Capture one thought, then let the agent reshape it.",
      color: "sky",
      kind: "idea",
      createdBy: "human",
    });
    list.push(new LiveObject(note));
  }, []);

  const updateNote = useMutation(
    (
      { storage },
      noteId: string,
      patch: Partial<Omit<Note, "id" | "createdBy">>,
    ) => {
      const list = storage.get("notes") ?? ensureNotesList();
      const target = list.find((item) => item.get("id") === noteId);
      if (!target) {
        return;
      }

      Object.entries(patch).forEach(([key, value]) => {
        target.set(key as keyof Omit<Note, "id" | "createdBy">, value as never);
      });
    },
    [],
  );

  const moveNote = useMutation(
    ({ storage }, noteId: string, x: number, y: number) => {
      const list = storage.get("notes") ?? ensureNotesList();
      const target = list.find((item) => item.get("id") === noteId);
      if (!target) {
        return;
      }
      target.set("x", x);
      target.set("y", y);
    },
    [],
  );

  const deleteNote = useMutation(({ storage }, noteId: string) => {
    if (!noteId) {
      return;
    }
    const list = storage.get("notes") ?? ensureNotesList();
    const index = list.findIndex((item) => item.get("id") === noteId);
    if (index >= 0) {
      list.delete(index);
      setSelectedNoteId((current) => (current === noteId ? null : current));
    }
  }, []);

  const applyAgentReply = useMutation(({ storage }, reply: AgentReply) => {
    const list = storage.get("notes") ?? ensureNotesList();

    for (const action of reply.actions) {
      if (action.type === "create_note") {
        list.push(new LiveObject(action.note));
        continue;
      }

      if (action.type === "move_note") {
        const target = list.find((item) => item.get("id") === action.id);
        if (target) {
          target.set("x", action.x);
          target.set("y", action.y);
        }
        continue;
      }

      if (action.type === "update_note") {
        const target = list.find((item) => item.get("id") === action.id);
        if (target) {
          Object.entries(action.patch).forEach(([key, value]) =>
            target.set(
              key as keyof Omit<Note, "id" | "createdBy">,
              value as never,
            ),
          );
        }
        continue;
      }

      if (action.type === "cluster_notes") {
        action.ids.forEach((noteId, index) => {
          const target = list.find((item) => item.get("id") === noteId);
          if (target) {
            target.set("x", action.x + (index % 2) * 190);
            target.set("y", action.y + Math.floor(index / 2) * 150);
            target.set("color", action.color);
          }
        });

        list.push(
          new LiveObject({
            id: crypto.randomUUID(),
            title: action.label,
            body: "Cluster created by the agent.",
            x: action.x - 22,
            y: action.y - 54,
            width: 260,
            height: 112,
            color: action.color,
            kind: "insight",
            createdBy: "agent",
            pinned: true,
          }),
        );
      }
    }
  }, []);

  useEventListener(({ event }) => {
    if (event.type === "chat-message") {
      setFeed((current) => [...current, event.message]);
    }

    if (event.type === "agent-result") {
      setFeed((current) => [
        ...current,
        {
          id: event.id,
          author: agentName,
          role: "agent",
          text: event.reply,
          createdAt: event.createdAt,
        },
      ]);
      applyAgentReply({ reply: event.reply, actions: event.actions });
    }
  });

  const promptAgent = async (prompt: string) => {
    const snapshot = buildBoardSnapshot(notes, prompt, roomId, composerMode);

    const humanMessage: ChatMessage = {
      id: crypto.randomUUID(),
      author: humanName,
      role: "human",
      text: prompt,
      createdAt: Date.now(),
    };

    broadcast({ type: "chat-message", message: humanMessage });
    setPendingPrompt(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          board: snapshot,
        }),
      });

      const body = (await response.json()) as AgentReply;
      broadcast({
        type: "agent-result",
        id: crypto.randomUUID(),
        reply: body.reply,
        actions: body.actions,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
      broadcast({
        type: "agent-result",
        id: crypto.randomUUID(),
        reply:
          "I could not reach the agent backend, so I kept the board as-is.",
        actions: [],
      });
    } finally {
      setPendingPrompt(false);
    }
  };

  const peerCount = others.length;

  return (
    <main className="app-shell">
      <header className="hero-bar">
        <div>
          <div className="eyebrow">AI Brainstorm Canvas</div>
          <h1>Make the agent act like a teammate on the board.</h1>
          <p>
            Humans and Claude share one room. Notes live on the canvas, and the
            agent can add, move, or cluster them in response to the session.
          </p>
        </div>

        <div className="hero-meta">
          <label className="field compact">
            <span>Room</span>
            <input
              value={roomId}
              onChange={(event) =>
                onRoomIdChange(event.target.value || defaultRoomId)
              }
            />
          </label>
          <label className="field compact">
            <span>Agent mode</span>
            <select
              value={composerMode}
              onChange={(event) =>
                setComposerMode(event.target.value as Presence["mode"])
              }
            >
              <option value="assist">Assist</option>
              <option value="lead">Lead</option>
              <option value="listen">Listen</option>
            </select>
          </label>
          <div className="hero-stats">
            <div>
              <strong>{connectionStatus}</strong>
              <span>Liveblocks status</span>
            </div>
            <div>
              <strong>{peerCount + 1}</strong>
              <span>people in room</span>
            </div>
          </div>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="panel control-panel">
          <div className="panel-kicker">Human controls</div>
          <h2>Steer the session</h2>
          <p>
            Seed the room with a note, then use the agent prompt to make it
            reorganize the board.
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={() => createNote()}
          >
            Add note
          </button>

          <div className="mode-toggles">
            <button
              className={composerMode === "assist" ? "toggle active" : "toggle"}
              type="button"
              onClick={() => setComposerMode("assist")}
            >
              Assist
            </button>
            <button
              className={composerMode === "lead" ? "toggle active" : "toggle"}
              type="button"
              onClick={() => setComposerMode("lead")}
            >
              Lead
            </button>
            <button
              className={composerMode === "listen" ? "toggle active" : "toggle"}
              type="button"
              onClick={() => setComposerMode("listen")}
            >
              Listen
            </button>
          </div>

          <div className="collaborator-list">
            <h3>Live peers</h3>
            {others.length === 0 ? (
              <p className="empty-state">
                You are the first person in the room.
              </p>
            ) : (
              others.map((other) => {
                const presence = other.presence;
                return (
                  <div key={other.connectionId} className="collaborator-row">
                    <span
                      className="collaborator-dot"
                      style={{ background: presence?.color ?? "#7b8a99" }}
                    />
                    <div>
                      <strong>
                        {presence?.name ?? `Guest ${other.connectionId}`}
                      </strong>
                      <span>{presence?.mode ?? "assist"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="board-wrap">
          <BrainstormBoard
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onMoveNote={moveNote}
            onPointerMove={(cursor) => updatePresence({ cursor })}
            onCreateStarterNote={() => createNote()}
            others={others}
            onDeleteNote={deleteNote}
          />
        </div>

        <div className="sidebar-stack">
          <InspectorPanel note={selectedNote} onChange={updateNote} />
          <SessionPanel
            messages={feed}
            othersCount={peerCount}
            connectionStatus={connectionStatus}
            onPromptSubmit={promptAgent}
            pending={pendingPrompt}
          />
        </div>
      </div>
    </main>
  );
}

function makeHumanName() {
  const names = ["Maya", "Jun", "Rafi", "Nina", "Sol", "Ada"];
  return (
    import.meta.env.VITE_USER_NAME ??
    names[Math.floor(Math.random() * names.length)]
  );
}

function pickColor() {
  const colors = ["#9d5d2f", "#2d8a7e", "#c95c4b", "#4c72b8", "#708f59"];
  return colors[Math.floor(Math.random() * colors.length)];
}
