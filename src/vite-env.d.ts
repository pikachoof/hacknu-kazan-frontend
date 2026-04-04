/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEBLOCKS_PUBLIC_KEY?: string;
  readonly VITE_ROOM_ID?: string;
  readonly VITE_USER_NAME?: string;
  readonly VITE_AGENT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
