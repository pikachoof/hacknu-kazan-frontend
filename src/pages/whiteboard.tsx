import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Room } from "./Room";

export default function Whiteboard() {
  const roomId = "hacknu-demo";
  const publicApiKey =
    "pk_dev_TcKl_dxQYo-56p6Bh-8fKLLYL0Ln9ueiv14KcD3GqiQNNYqWDfWFPEuODabkgjfr";

  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <RoomProvider id={roomId}>
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          <Room />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
