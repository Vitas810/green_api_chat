import Button from "@/components/ui/Button/Button.tsx";
import avatar from "@/assets/images/avatar.svg";
import type { Chat } from "@/shared/types";
import "./ChatItem.scss";

function ChatItem({ chat, active, onSelect }: { chat: Chat; active: boolean; onSelect: (id: string) => void }) {
  const lastMessage = chat.messages.at(-1);
  const latest =
    lastMessage && (!chat.preview || lastMessage.timestamp >= chat.preview.timestamp) ? lastMessage : chat.preview;
  return (
    <li className="chat-list__item">
      <Button
        className={`chat-item${active ? " chat-item--active" : ""}`}
        type="button"
        onClick={() => onSelect(chat.id)}
        aria-current={active ? "true" : undefined}
      >
        <img className="chat-item__avatar" src={chat.avatar || avatar} alt="" />
        <span className="chat-item__content">
          <span className="chat-item__heading">
            <span className="chat-item__name">{chat.name}</span>
            {latest && <time className="chat-item__time">{latest.time}</time>}
          </span>
          <span className="chat-item__bottom">
            <span className="chat-item__preview">
              {latest ? latest.text : chat.previewLoaded ? "Сообщений пока нет" : "\u00a0"}
            </span>
            {chat.unreadCount > 0 && (
              <span className="chat-item__unread" aria-label={`Непрочитанных сообщений: ${chat.unreadCount}`}>
                {chat.unreadCount}
              </span>
            )}
          </span>
        </span>
      </Button>
    </li>
  );
}

export default ChatItem;
