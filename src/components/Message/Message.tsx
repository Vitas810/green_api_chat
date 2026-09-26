import Button from "@/components/ui/Button/Button.tsx";
type MessageStatus = "pending" | "sent" | "delivered" | "read" | "error";

function Message({ message, messages, onReply }) {
  const status: MessageStatus = message.direction === "outgoing" ? message.status : null;
  const quoted = message.quotedId ? messages.find((item) => item.id === message.quotedId) : null;
  const statusIcons: Record<MessageStatus, string> = {
    pending: "◷",
    sent: "✓",
    delivered: "✓✓",
    read: "✓✓",
    error: "!",
  };

  return (
    <li className={`message message--${message.direction}`}>
      <div className="message__bubble">
        {message.quotedId && (
          <div className="message__quote">
            <span className="message__quote-author">{quoted?.direction === "outgoing" ? "Вы" : "Собеседник"}</span>
            <span className="message__quote-text">{quoted?.text || message.quotedText || "Сообщение"}</span>
          </div>
        )}
        <p className="message__text">{message.text}</p>
        <span className="message__meta">
          <time className="message__time">{message.time}</time>
          {status && (
            <span className={`message__status message__status--${status}`} role="img">
              {statusIcons[status]}
            </span>
          )}
        </span>
      </div>
      <Button
        className="message__reply"
        type="button"
        onClick={() => onReply(message)}
        aria-label={`Ответить на сообщение: ${message.text.slice(0, 80)}`}
        title="Ответить"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 8 5 12l4 4M5 12h9a5 5 0 0 1 5 5" />
        </svg>
      </Button>
    </li>
  );
}

export default Message;
