import { LiveObject } from "@liveblocks/client";
import type {
  AgentReply,
  AgentAction,
  AgentActionExtended,
  Note,
  BoardSnapshot,
} from "../types";
import { runFunctionCalls } from "./executor";

export function processAgentReply(list: any, reply: AgentReply) {
  if (!list || !reply) return;

  for (const action of reply.actions as AgentActionExtended[]) {
    // handle generic function_calls first
    if ((action as any).type === "function_calls") {
      try {
        runFunctionCalls(list, (action as any).calls ?? []);
      } catch (err) {
        console.error("Failed to run function_calls", err);
      }
      continue;
    }

    const a = action as AgentAction;

    if (a.type === "create_note") {
      list.push(new LiveObject(a.note));
      continue;
    }

    if (a.type === "move_note") {
      const target = list.find((item: any) => item.get("id") === a.id);
      if (target) {
        target.set("x", a.x);
        target.set("y", a.y);
      }
      continue;
    }

    if (a.type === "update_note") {
      const target = list.find((item: any) => item.get("id") === a.id);
      if (target) {
        Object.entries(a.patch).forEach(([key, value]) =>
          target.set(key as keyof Omit<Note, "id" | "createdBy">, value as any),
        );
      }
      continue;
    }

    if (a.type === "cluster_notes") {
      a.ids.forEach((noteId, index) => {
        const target = list.find((item: any) => item.get("id") === noteId);
        if (target) {
          target.set("x", a.x + (index % 2) * 190);
          target.set("y", a.y + Math.floor(index / 2) * 150);
          target.set("color", a.color);
        }
      });

      list.push(
        new LiveObject({
          id: crypto.randomUUID(),
          title: a.label,
          body: "Cluster created by the agent.",
          x: a.x - 22,
          y: a.y - 54,
          width: 260,
          height: 112,
          color: a.color,
          kind: "insight",
          createdBy: "agent",
          pinned: true,
        }),
      );
      continue;
    }
  }
}

export default processAgentReply;
