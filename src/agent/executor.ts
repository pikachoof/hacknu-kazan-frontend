import { LiveObject } from "@liveblocks/client";
import type { FunctionCall } from "../types";

type Handler = (list: any, args: Record<string, unknown> | undefined) => void;

function findTarget(list: any, id: unknown) {
  if (!list || typeof id !== "string") return null;
  return list.find((item: any) => item.get("id") === id) ?? null;
}

const functionMap: Record<string, Handler> = {
  createObject(list, args = {}) {
    const obj = { ...(args as any) };
    if (!obj.id) obj.id = crypto.randomUUID();
    const liveObj = new LiveObject(obj);
    list.push(liveObj);
  },

  moveObject(list, args = {}) {
    const { id, x, y } = args as any;
    const target = findTarget(list, id);
    if (!target) return;
    if (typeof x === "number") target.set("x", x);
    if (typeof y === "number") target.set("y", y);
  },

  deleteObject(list, args = {}) {
    const { id } = args as any;
    const index = list.findIndex((item: any) => item.get("id") === id);
    if (index >= 0) list.delete(index);
  },

  resizeObject(list, args = {}) {
    const { id, width, height } = args as any;
    const target = findTarget(list, id);
    if (!target) return;
    if (typeof width === "number") target.set("width", width);
    if (typeof height === "number") target.set("height", height);
  },

  setColorOf(list, args = {}) {
    const { id, color } = args as any;
    const target = findTarget(list, id);
    if (!target) return;
    if (typeof color === "string") target.set("color", color);
  },

  rotateObject(list, args = {}) {
    const { id, angle } = args as any;
    const target = findTarget(list, id);
    if (!target) return;
    if (typeof angle === "number") target.set("rotation", angle);
  },
};

export function runFunctionCalls(list: any, calls: FunctionCall[]) {
  if (!list || !Array.isArray(calls)) return;

  for (const call of calls) {
    const name = call.name;
    const args = call.args;

    const handler = functionMap[name];
    if (!handler) {
      console.warn("Unknown function call from agent:", name, args);
      continue;
    }

    try {
      handler(list, args);
    } catch (err) {
      console.error("Error executing function call", call, err);
    }
  }
}

export { functionMap };
