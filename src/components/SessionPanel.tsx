import type { ChatMessage } from "../types";

type SessionPanelProps = {
  messages: ChatMessage[];
  othersCount: number;
  connectionStatus: string;
  onPromptSubmit: (prompt: string) => void;
  pending: boolean;
};

export function SessionPanel({
  messages,
  othersCount,
  connectionStatus,
  onPromptSubmit,
  pending,
}: SessionPanelProps) {
  return (
    <aside className="panel session-panel">
      <div className="panel-kicker">Session control</div>
      <div className="status-strip">
        <span>{connectionStatus}</span>
        <span>{othersCount} collaborators online</span>
      </div>

      <form
        className="prompt-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const prompt = String(data.get("prompt") ?? "").trim();
          if (!prompt) {
            return;
          }
          onPromptSubmit(prompt);
          form.reset();
        }}
      >
        <label className="field">
          <span>Ask the agent</span>
          <textarea
            name="prompt"
            rows={4}
            placeholder="For example: cluster the strongest ideas, create one synthesis card, and move the action items to the right."
          />
        </label>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Thinking..." : "Send to Claude"}
        </button>
      </form>

      <div className="message-feed">
        <div className="message-feed-header">
          <h2>Live feed</h2>
          <span>{messages.length} events</span>
        </div>
        <div className="message-stack">
          {messages.length === 0 ? (
            <p className="empty-state">
              Messages and agent responses will appear here as the session
              unfolds.
            </p>
          ) : (
            messages.slice(-8).map((message) => (
              <article
                key={message.id}
                className={`message-card ${message.role}`}
              >
                <div className="message-meta">
                  <strong>{message.author}</strong>
                  <span>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p>{message.text}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
