import { useEffect, useRef } from "react";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { Tldraw } from "tldraw";

import "tldraw/tldraw.css";

type TldrawBoardProps = {
  notes?: any[];
  selectedNoteId?: string | null;
  onSelectNote?: (id: string | null) => void;
  onMoveNote?: (id: string, x: number, y: number) => void;
  onPointerMove?: (p: { x: number; y: number } | null) => void;
  onCreateStarterNote?: () => void;
  others?: any[];
  onDeleteNote?: (id: string) => void;
};

export function TldrawBoard({
  notes,
  selectedNoteId,
  onSelectNote,
  onMoveNote,
  onPointerMove,
  onCreateStarterNote,
  others,
  onDeleteNote,
}: TldrawBoardProps) {
  const editorRef = useRef<any>(null);
  const lastSavedDocRef = useRef<string>("");
  const hasLoadedDocRef = useRef(false);

  // Liveblocks storage for tldraw serialized project
  const storedDocValue = useStorage((root) => root.tldrawDoc);
  const storedDoc = typeof storedDocValue === "string" ? storedDocValue : "";
  const saveDoc = useMutation(({ storage }, doc: string) => {
    storage.set("tldrawDoc", doc);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!storedDoc) {
      hasLoadedDocRef.current = true;
      saveCurrentSnapshot(editor);
      return;
    }

    if (storedDoc === lastSavedDocRef.current) {
      hasLoadedDocRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(storedDoc);
      editor.loadSnapshot(parsed, {
        forceOverwriteSessionState: true,
      });
      lastSavedDocRef.current = storedDoc;
    } catch (err) {
      console.warn("Could not load stored tldraw doc", err);
    } finally {
      hasLoadedDocRef.current = true;
    }
  }, [saveDoc, storedDoc]);

  function saveCurrentSnapshot(editor: any) {
    if (!hasLoadedDocRef.current) {
      return;
    }

    try {
      const snapshot = editor.getSnapshot();
      const serialized = JSON.stringify(snapshot);

      if (serialized === lastSavedDocRef.current) {
        return;
      }

      lastSavedDocRef.current = serialized;
      void saveDoc(serialized);
    } catch (err) {
      console.warn("Failed to save tldraw doc", err);
    }
  }

  function attachEditorHooks(editor: any) {
    if (!editor) return;
    editorRef.current = editor;

    const unsubscribe = editor.store?.listen?.(() => {
      saveCurrentSnapshot(editor);
    });

    saveCurrentSnapshot(editor);

    return () => {
      unsubscribe?.();
    };
  }

  return (
    <section className="board-frame">
      <div className="board-canvas-shell">
        <div className="board-grid" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
          onPointerMove={(event) => {
            onPointerMove?.({
              x: Math.round(event.clientX),
              y: Math.round(event.clientY),
            });
          }}
          onPointerLeave={() => onPointerMove?.(null)}
        >
          <Tldraw onMount={(editor: any) => attachEditorHooks(editor)} />
        </div>
      </div>

      <div className="board-hint-row">
        <button className="ghost-button" type="button" onClick={onCreateStarterNote}>
          Add note
        </button>
        <button
          className="ghost-button danger"
          type="button"
          onClick={() => onDeleteNote?.(selectedNoteId ?? "")}
          disabled={!selectedNoteId}
        >
          Remove selected
        </button>
      </div>
    </section>
  );
}
