import "./Aside.scss";
import Button from "@/components/ui/Button/Button.tsx";
import Input from "@/components/ui/Input/Input.tsx";
import { useState } from "react";
import ChatItem from "@/components/ChatItem/ChatItem.tsx";
import type { FormEvent } from "react";
import type { Chat } from "@/shared/types";
import { formatPhone, getChatNumber } from "@/shared/phone";

type AsideProps = {
  activeChatId: string | null;
  chats: Chat[];
  isCreatingChat: boolean;
  isLoadingChats: boolean;
  chatListError: string;
  onCreateChat: () => void;
  onSubmitNewChat: (number: string) => void;
  onCloseCreateChat: () => void;
  onSelectChat: (id: string) => void;
  onSignOut: () => void;
};

function Aside({
  activeChatId,
  chats,
  isCreatingChat,
  isLoadingChats,
  chatListError,
  onCreateChat,
  onSubmitNewChat,
  onCloseCreateChat,
  onSelectChat,
  onSignOut,
}: AsideProps) {
  const [formError, setFormError] = useState("");
  const [phone, setPhone] = useState("");

  const createChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const number = getChatNumber(phone);
    if (!number) {
      setFormError("Введите номер с кодом страны: от 11 до 16 цифр.");
      return;
    }
    setFormError("");
    setPhone("");
    onSubmitNewChat(number);
  };

  return (
    <aside className="chat-list" aria-label="Список чатов">
      <div className="chat-list__header">
        <h1 className="chat-list__header-title">Чаты</h1>
        <Button
          className="chat-list__header-button"
          onClick={() => {
            onCreateChat();
            setFormError("");
          }}
          aria-label="Создать чат"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Button>
      </div>

      {isCreatingChat && (
        <form className="new-chat-form" onSubmit={createChat}>
          <div className="new-chat-form__heading">
            <div className="new-chat-form__title">Новый чат</div>
            <Button
              className="new-chat-form__close"
              onClick={() => {
                onCloseCreateChat();
                setFormError("");
              }}
              aria-label="Закрыть"
            >
              ×
            </Button>
          </div>

          <label htmlFor="phoneInput" className="new-chat-form__label">
            Номер получателя
          </label>
          <Input
            className="new-chat-form__input"
            id="phoneInput"
            type="tel"
            inputMode="tel"
            placeholder="+7 999 999-99-99"
            value={phone}
            onChange={(event) => setPhone(formatPhone(event.target.value))}
          />

          {formError && (
            <div className="new-chat-form__error" role="alert">
              {formError}
            </div>
          )}

          <Button type="submit" className="new-chat-form__submit">
            Создать чат
          </Button>
        </form>
      )}

      {chats?.length > 0 && (
        <ul className="chat-list__items">
          {chats.map((chat) => (
            <ChatItem key={chat.id} chat={chat} active={chat.id === activeChatId} onSelect={onSelectChat} />
          ))}
        </ul>
      )}

      {!chats?.length && !isLoadingChats && !chatListError && (
        <div className="chat-list__empty">
          <span className="chat-list__empty-icon" aria-hidden="true">
            ✦
          </span>
          <p className="chat-list__empty-title">Пока нет чатов</p>
          <p className="chat-list__empty-text">Нажмите «+» и введите номер получателя.</p>
        </div>
      )}

      {chatListError && (
        <p className="chat-list__error" role="alert">
          {chatListError}
        </p>
      )}

      <div className="chat-list__footer">
        <span className="chat-list__account">Интерфейс чата</span>
        <Button className="chat-list__exit" type="button" onClick={onSignOut}>
          Выйти
        </Button>
      </div>
    </aside>
  );
}

export default Aside;
