import "./ChatPanel.scss";
import Button from "@/components/ui/Button/Button.tsx";
import avatar from "@/assets/images/avatar.svg";
import Message from "@/components/Message/Message.tsx";
import Input from "@/components/ui/Input/Input.tsx";
import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Chat, ChatMessage } from "@/shared/types";

type ChatPanelProps = {
  activeChatId: string | null;
  isChatOpen: boolean;
  activeChat?: Chat;
  historyError: string;
  onSendMessage: (chatId: string, text: string, quotedMessageId?: string) => Promise<void>;
  onCloseChat: () => void;
  onCreateChat: () => void;
};

function ChatPanel({ activeChatId, isChatOpen, activeChat, historyError, onSendMessage, onCloseChat, onCreateChat }: ChatPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastMessageId = activeChat?.messages.at(-1)?.id;

  useLayoutEffect(() => {
    if (isChatOpen && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [isChatOpen, activeChatId, lastMessageId]);

  const [replyingTo, setReplyingTo] = useState<(ChatMessage & { chatId: string }) | null>(null);
  const activeReply = replyingTo?.chatId === activeChatId ? replyingTo : null;
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<{ chatId: string; message: string } | null>(null);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!activeChat?.chatId || !text || isSending) return;

    setIsSending(true);
    setSendError(null);
    try {
      await onSendMessage(activeChat.chatId, text, activeReply?.id);
      setDraft("");
      setReplyingTo(null);
    } catch (error) {
      setSendError({
        chatId: activeChat.chatId,
        message: error instanceof Error ? error.message : "Не удалось отправить сообщение.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="chat-panel" aria-label="Чаты">
      {activeChatId && activeChat && (
        <>
          <div className="chat-panel__header">
            <Button
              className="chat-panel__back"
              type="button"
              aria-label="Вернуться к списку чатов"
              onClick={onCloseChat}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <img className="chat-panel__avatar" src={activeChat.avatar || avatar} alt="" />
            <div className="chat-panel__contact">
              <h2 className="chat-panel__name">{activeChat.name}</h2>
            </div>
          </div>

          <div className="chat-panel__body" ref={bodyRef}>
            {historyError && (
              <p className="chat-panel__error" role="alert">
                {historyError}
              </p>
            )}
            {activeChat.messages.length ? (
              <ul className="chat-panel__messages">
                {activeChat.messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    messages={activeChat.messages}
                    onReply={(item) => setReplyingTo({ ...item, chatId: activeChatId })}
                  />
                ))}
              </ul>
            ) : (
              !historyError && (
                <div className="chat-panel__empty">
                  <span className="chat-panel__empty-icon" aria-hidden="true">
                    ✦
                  </span>
                  <p className="chat-panel__empty-title">Начните переписку</p>
                  <p className="chat-panel__empty-text">Напишите первое сообщение получателю.</p>
                </div>
              )
            )}
          </div>

          <form className="message-composer" onSubmit={sendMessage}>
            {sendError?.chatId === activeChat.chatId && (
              <p className="message-composer__error" role="alert">{sendError?.message}</p>
            )}
            {activeReply && (
              <div className="message-composer__reply">
                <div className="message-composer__reply-content">
                  <strong>{activeReply.direction === "outgoing" ? "Вы" : activeChat.name}</strong>
                  <span>{activeReply.text}</span>
                </div>
                <Button
                  className="message-composer__reply-cancel"
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Отменить ответ"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                </Button>
              </div>
            )}
            <label className="message-composer__label" htmlFor="message-text">
              Сообщение
            </label>
            <Input
              className="message-composer__input"
              id="message-text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Напишите сообщение..."
              maxLength={20000}
              disabled={isSending}
            />
            <Button
              className="message-composer__send"
              type="submit"
              disabled={isSending || !draft.trim()}
              aria-label="Отправить сообщение"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 14-7-4 14-3-6-7-1Zm7 1 7-8" />
              </svg>
            </Button>
          </form>
        </>
      )}

      {!activeChatId && (
        <div className="chat-panel__placeholder">
          <span className="chat-panel__placeholder-icon" aria-hidden="true">
            ✦
          </span>
          <h2 className="chat-panel__placeholder-title">Ваши сообщения</h2>
          <p className="chat-panel__placeholder-text">Создайте чат или выберите переписку из списка.</p>
          <Button type="button" onClick={onCreateChat}>
            Создать чат
          </Button>
        </div>
      )}
    </section>
  );
}

export default ChatPanel;
