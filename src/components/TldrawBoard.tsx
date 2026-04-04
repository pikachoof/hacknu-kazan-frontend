import React, { Suspense, useMemo, useRef, useEffect } from "react";
import { useStorage, useMutation } from "@liveblocks/react/suspense";

const RemoteTldraw = React.lazy(async () => {
  try {
    const mod = await import("@tldraw/tldraw");
    // try common exports
    return { default: (mod as any).Tldraw || (mod as any).default || mod };
  } catch (err) {
    // rethrow to allow Suspense fallback + error boundary upstream
    throw err;
  }
});

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
  const hint = useMemo(
    () =>
      "tldraw will be loaded here — run `npm install` to fetch @tldraw/tldraw and restart the dev server.",
    [],
  );

  const editorRef = useRef<any>(null);

  // Liveblocks storage for tldraw serialized project
  const storedDoc = useStorage((root) => root.get("tldrawDoc"));
  const saveDoc = useMutation(({ storage }, doc: string) => {
    storage.set("tldrawDoc", doc);
  }, []);

  useEffect(() => {
    // when tldraw mounts later and storedDoc exists, try to load it
    const editor = editorRef.current;
    if (!editor || !storedDoc) return;

    try {
      const parsed = JSON.parse(storedDoc);
      if (typeof editor.loadProject === "function") {
        editor.loadProject(parsed);
      } else if (typeof editor.loadDocument === "function") {
        editor.loadDocument(parsed);
      } else if (typeof editor.load === "function") {
        editor.load(parsed);
      } else if (typeof editor.loadFile === "function") {
        editor.loadFile(parsed);
      }
    } catch (err) {
      console.warn("Could not load stored tldraw doc", err);
    }
  }, [storedDoc]);

  function attachEditorHooks(editor: any) {
    if (!editor) return;
    editorRef.current = editor;

    const save = async () => {
      try {
        let json: any = null;
        if (typeof editor.toJSON === "function") json = editor.toJSON();
        else if (typeof editor.export === "function") json = editor.export();
        else if (editor.document) json = editor.document;
        else if (editor.project) json = editor.project;

        if (json) {
          await saveDoc(JSON.stringify(json));
        }
      } catch (err) {
        console.warn("Failed to save tldraw doc", err);
      }
    };

    // subscribe to change events using common names
    if (typeof editor.on === "function") {
      try {
        editor.on("change", save);
      } catch {}
    }
    if (typeof editor.subscribe === "function") {
      try {
        editor.subscribe(save);
      } catch {}
    }
    if (typeof editor.onChange === "function") {
      try {
        editor.onChange(save);
      } catch {}
    }
  }

  return (
    <section className="board-frame">
      <div className="board-canvas-shell">
        <div className="board-grid" />
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <Suspense
            fallback={
              <div className="panel loading-card" style={{ padding: 24 }}>
                <h3>Loading tldraw…</h3>
                <p>{hint}</p>
                <div>
                  <button
                    className="ghost-button"
                    onClick={onCreateStarterNote}
                  >
                    Add note (fallback)
                  </button>
                </div>
              </div>
            }
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
              }}
            >
              <RemoteTldraw
                // try to attach editor hooks when RemoteTldraw exposes instance via props
                onMount={(editor: any) => attachEditorHooks(editor)}
                onEditor={(editor: any) => attachEditorHooks(editor)}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </section>
  );
}
