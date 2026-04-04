import type { AgentReply, BoardSnapshot } from "../types";

export async function agentRequest(
  prompt: string,
  board: BoardSnapshot,
): Promise<AgentReply> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, board }),
  });

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.status}`);
  }

  const body = (await response.json()) as AgentReply;
  return body;
}

export default agentRequest;
