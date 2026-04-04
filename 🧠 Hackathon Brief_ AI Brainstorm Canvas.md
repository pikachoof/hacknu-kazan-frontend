# 🧠 Hackathon Brief: AI Brainstorm Canvas

## The Problem

Teams brainstorm in tools like Miro or FigJam while talking on Zoom. AI lives in a separate tab. To use it, you switch windows, explain the context, copy the answer back. So AI gets used rarely — and it never sees the full picture: not the canvas, not the conversation, not the flow of the session.

What if the AI wasn't a tool you consult, but a teammate that's already in the room?

## The Challenge

You're building an AI brainstorming agent. It needs a canvas to live in.

The agent is the product. It exists on the canvas the same way a human collaborator does — it sees the workspace, understands what's happening, and contributes spatially. It's not a chatbot in a sidebar. It's a participant that places, organizes, and reacts to things on the canvas alongside people.

The canvas is the environment. A real collaborative workspace where a team can brainstorm, organize ideas, and generate media (images, video) together in real time. It needs to be usable — but it's not the point. Use an existing canvas library; don't spend your hackathon building one from scratch. Your time is better spent on the agent interaction.

How you design the communication layer and the agent's behavior is up to you.

> ⚠️ A canvas without a working agent will not be evaluated. The agent acting on the canvas is the core deliverable.

## Scope Anchor

- Target a working demo of a single brainstorming session with 2+ people and the AI agent
- Aim for something demoable in a live walkthrough — not production-ready
- A session should last ~10 minutes and feel like the agent is genuinely participating

---

## Success Criteria

At demo time, we want to see:

1. A collaborative canvas that people would actually use — multiple users can work together in real time: place and organize elements, generate images and video, structure ideas
2. An AI agent acting as a spatial participant — it creates, positions, or modifies things on the canvas (not just responding in a chat panel)
3. A communication channel between humans and the agent — text, voice, or both
4. User control — people can direct the agent's behavior (when it speaks, what it does, how much it contributes)

## What We're NOT Looking For

- A chatbot with a canvas background
- An AI that only responds in a sidebar
- A polished product — rough edges are fine, the interaction model matters more

## Bonus Directions

These are optional paths that raise the bar. Pick any, combine, or invent your own:

- Voice input → the agent "hears" the conversation and reacts
- The agent proactively contributes without being asked
- Tentative suggestions — the agent proposes something that humans can approve or dismiss before it lands on the canvas
- Multiple agent personas with different roles
- Session export or replay

## Judging Criteria

| Criteria | Weight | What We Look For |
| --- | --- | --- |
| AI as a canvas participant | 35% | The agent acts inside the canvas — creates, organizes, responds spatially. Not a chatbot on the side. This is the core deliverable. |
| Usefulness | 25% | A session with the agent feels noticeably more productive than without it. |
| Collaboration | 15% | Real-time sync works, users see each other and the agent, no visible desync. |
| UX | 15% | The canvas is usable, the agent doesn't overwhelm, controls feel intuitive. |
| Ambition | 10% | Bonus features that expand what's possible. |

---

## One Constraint

Use the Claude API (Anthropic) as the AI backbone.

Everything else — canvas library, sync layer, voice stack, UI framework — is your choice.
