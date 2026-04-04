import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Rect, Stage, Text } from "react-konva";

import { noteKindHints, noteKindLabels, notePalette } from "../liveblocks";
import type { CursorPoint, Note, Presence } from "../types";

type BrainstormBoardProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  onMoveNote: (noteId: string, x: number, y: number) => void;
  onPointerMove: (cursor: CursorPoint | null) => void;
  onCreateStarterNote: () => void;
  others: Array<{
    connectionId: number;
    presence?: Presence;
  }>;
  onDeleteNote: (noteId: string) => void;
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;
    const observer = new ResizeObserver(() => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });

    observer.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export function BrainstormBoard({
  notes,
  selectedNoteId,
  onSelectNote,
  onMoveNote,
  onPointerMove,
  onCreateStarterNote,
  others,
  onDeleteNote,
}: BrainstormBoardProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const stages = useMemo(
    () => [
      {
        x: 24,
        y: 36,
        text: "Move the notes, then ask the agent to reorganize them spatially.",
      },
      {
        x: 24,
        y: 60,
        text: "This is a live canvas, not a chat pane with decorations.",
      },
    ],
    [],
  );

  return (
    <section className="board-frame">
      <div className="board-canvas-shell" ref={ref}>
        <div className="board-grid" />
        <Stage
          width={Math.max(size.width, 1)}
          height={Math.max(size.height, 1)}
          onMouseMove={(event) => {
            const stage = event.target.getStage();
            const pointer = stage?.getPointerPosition();
            onPointerMove(pointer ? { x: pointer.x, y: pointer.y } : null);
          }}
          onMouseLeave={() => onPointerMove(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onSelectNote(null);
            }
          }}
        >
          <Layer>
            {stages.map((stage) => (
              <Text
                key={stage.text}
                x={stage.x}
                y={stage.y}
                text={stage.text}
                fontSize={14}
                fontFamily="Trebuchet MS"
                fill="#5d655c"
                opacity={0.8}
              />
            ))}

            {notes.map((note) => {
              const palette = notePalette[note.color];
              const selected = note.id === selectedNoteId;

              return (
                <Group
                  key={note.id}
                  x={note.x}
                  y={note.y}
                  draggable
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelectNote(note.id);
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true;
                    onSelectNote(note.id);
                  }}
                  onDragEnd={(event) => {
                    const target = event.target;
                    onMoveNote(note.id, target.x(), target.y());
                  }}
                >
                  <Rect
                    width={note.width}
                    height={note.height}
                    cornerRadius={22}
                    fill={palette.fill}
                    stroke={selected ? "#22324f" : palette.stroke}
                    strokeWidth={selected ? 4 : 2}
                    shadowColor={palette.glow}
                    shadowBlur={selected ? 28 : 18}
                    shadowOpacity={0.8}
                    shadowOffset={{ x: 0, y: 10 }}
                  />
                  <Rect
                    x={18}
                    y={18}
                    width={78}
                    height={28}
                    cornerRadius={14}
                    fill="#ffffff"
                    opacity={0.7}
                  />
                  <Text
                    x={18}
                    y={24}
                    width={82}
                    text={noteKindLabels[note.kind]}
                    fontSize={11}
                    fontFamily="Trebuchet MS"
                    fontStyle="bold"
                    fill="#22324f"
                    letterSpacing={0.6}
                    align="center"
                  />
                  <Text
                    x={18}
                    y={60}
                    width={note.width - 36}
                    text={note.title}
                    fontSize={20}
                    fontFamily="Georgia"
                    fontStyle="bold"
                    fill="#15202a"
                    wrap="word"
                    lineHeight={1.08}
                  />
                  <Text
                    x={18}
                    y={108}
                    width={note.width - 36}
                    height={note.height - 132}
                    text={note.body}
                    fontSize={14}
                    fontFamily="Trebuchet MS"
                    fill="#28333f"
                    wrap="word"
                    lineHeight={1.35}
                  />
                  {note.pinned && (
                    <Circle
                      x={note.width - 28}
                      y={26}
                      radius={6}
                      fill="#22324f"
                      opacity={0.8}
                    />
                  )}
                  <Text
                    x={18}
                    y={note.height - 28}
                    width={note.width - 70}
                    text={noteKindHints[note.kind]}
                    fontSize={10}
                    fontFamily="Trebuchet MS"
                    fill="#4f5b66"
                    opacity={0.8}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      <div className="board-overlays">
        {others
          .filter((other) => other.presence?.cursor)
          .map((other) => {
            const presence = other.presence;
            if (!presence?.cursor) {
              return null;
            }

            return (
              <div
                key={other.connectionId}
                className="cursor-chip"
                style={{
                  transform: `translate(${presence.cursor.x}px, ${presence.cursor.y}px)`,
                  borderColor: presence.color,
                  boxShadow: `0 0 0 1px ${presence.color}33, 0 12px 30px rgba(0, 0, 0, 0.14)`,
                }}
              >
                <span
                  className="cursor-dot"
                  style={{ background: presence.color }}
                />
                <span>{presence.name}</span>
              </div>
            );
          })}
      </div>

      <div className="board-hint-row">
        <button
          className="ghost-button"
          type="button"
          onClick={onCreateStarterNote}
        >
          Add note
        </button>
        <button
          className="ghost-button danger"
          type="button"
          onClick={() => onDeleteNote(selectedNoteId ?? "")}
          disabled={!selectedNoteId}
        >
          Remove selected
        </button>
      </div>
    </section>
  );
}
