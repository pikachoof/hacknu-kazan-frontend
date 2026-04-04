# AI Brainstorm Canvas

A collaborative brainstorming canvas built with React, Liveblocks, Konva, and a Claude-powered spatial agent.

## What it does

- Multiple people can join the same room and place notes on a shared board
- Users can drag notes, edit them in the inspector, and watch live collaborator cursors
- A Claude-backed agent reads the current board and returns canvas actions, not just chat text
- The agent can create, move, update, or cluster notes so it visibly participates in the session

## Setup

1. Copy `.env.example` to `.env`
2. Fill in the required keys:
   - `VITE_LIVEBLOCKS_PUBLIC_KEY`
   - `ANTHROPIC_API_KEY`
3. Run `npm install`
4. Start the app with `npm run dev`

The Vite app runs on `http://localhost:5173` and the agent API runs on `http://localhost:8787`.

## Demo flow

1. Open the same room in two browser windows
2. Add a few notes on the board
3. Use the agent prompt to ask for clustering, synthesis, or next steps
4. Watch the agent create or reorganize notes directly on the canvas

## Notes

- If `ANTHROPIC_API_KEY` is missing, the backend falls back to a deterministic demo response so the board still behaves.
- The default room id is `hacknu-demo`.
