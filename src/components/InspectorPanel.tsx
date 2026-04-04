import { useMemo } from "react";

import { noteKindLabels, notePalette } from "../liveblocks";
import type { Note } from "../types";

type InspectorPanelProps = {
  note: Note | null;
  onChange: (
    noteId: string,
    patch: Partial<Omit<Note, "id" | "createdBy">>,
  ) => void;
};

export function InspectorPanel({ note, onChange }: InspectorPanelProps) {
  const palette = useMemo(() => {
    if (!note) {
      return notePalette.sky;
    }
    return notePalette[note.color];
  }, [note]);

  if (!note) {
    return (
      <aside className="panel inspector-panel">
        <div className="panel-kicker">Inspector</div>
        <h2>Pick a note</h2>
        <p>
          Select a card to edit its title, body, color, and coordinates. The
          agent will also use this panel's board state as context.
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel inspector-panel">
      <div className="panel-kicker">Inspector</div>
      <div className="inspector-header">
        <span
          className="inspector-swatch"
          style={{ background: palette.fill, borderColor: palette.stroke }}
        />
        <div>
          <h2>{note.title}</h2>
          <p>
            {noteKindLabels[note.kind]} · {note.createdBy}
          </p>
        </div>
      </div>

      <label className="field">
        <span>Title</span>
        <input
          value={note.title}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
        />
      </label>

      <label className="field">
        <span>Body</span>
        <textarea
          rows={6}
          value={note.body}
          onChange={(event) => onChange(note.id, { body: event.target.value })}
        />
      </label>

      <div className="row-grid">
        <label className="field">
          <span>X</span>
          <input
            type="number"
            value={Math.round(note.x)}
            onChange={(event) =>
              onChange(note.id, { x: Number(event.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>Y</span>
          <input
            type="number"
            value={Math.round(note.y)}
            onChange={(event) =>
              onChange(note.id, { y: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <div className="row-grid">
        <label className="field">
          <span>Color</span>
          <select
            value={note.color}
            onChange={(event) =>
              onChange(note.id, { color: event.target.value as Note["color"] })
            }
          >
            <option value="amber">Amber</option>
            <option value="teal">Teal</option>
            <option value="coral">Coral</option>
            <option value="sky">Sky</option>
            <option value="sage">Sage</option>
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select
            value={note.kind}
            onChange={(event) =>
              onChange(note.id, { kind: event.target.value as Note["kind"] })
            }
          >
            <option value="idea">Idea</option>
            <option value="question">Question</option>
            <option value="action">Action</option>
            <option value="insight">Insight</option>
          </select>
        </label>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={note.pinned}
          onChange={(event) =>
            onChange(note.id, { pinned: event.target.checked })
          }
        />
        <span>Pin this note to keep it prominent during the demo.</span>
      </label>
    </aside>
  );
}
