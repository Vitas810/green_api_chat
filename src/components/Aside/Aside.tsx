import Button from "@/components/ui/Button/Button.tsx";
import Input from "@/components/ui/Input/Input.tsx";
import { useState } from "react";
import ChatItem from "@/components/ChatItem/ChatItem.tsx";
import "./Aside.scss";

const normilizePhone = (phone: string) => phone.replace(/\D/g, "");
const isValidePhone = (phone: string) => {
  const length = normilizePhone(phone)?.length;

  return phone?.length >= 11 && length <= 16;
};

function Aside({ activeChatId, chats, isCreatingChat, setIsCreatingChat, setActiveChatId, setIsChatOpen }) {
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatListError, setChatListError] = useState("");

  const [formError, setFormError] = useState("");

  const createChat = () => {
    setIsCreatingChat(true);
  };

  const signOut = () => {
    setIsCreatingChat(false);
  };

  return (
    <aside className="chat-list" aria-label="Список чатов">
      <div className="chat-list__header">
        <h1 className="chat-list__header-title">Чаты</h1>
        <Button
          className="chat-list__header-button"
          onClick={() => {
            setIsCreatingChat(true);
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
        <form className="new-chat-from" onSubmit={createChat}>
          <div className="new-chat-form__heading">
            <div className="new-chat-from__title">Новый чат</div>
            <Button
              className="new-chat-form__close"
              onClick={() => {
                setIsCreatingChat(false);
                setFormError("");
              }}
              disabled={isValidePhone}
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
            placeholder="7 xxx xxx-xx-xx"
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
            <ChatItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onSelect={(id) => {
                setActiveChatId(id);
                setIsChatOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      {!isLoadingChats && !chatListError && (
        <div className="chat-list__empty">
          <span className="chat-list__empty-icon" aria-hidden="true">
            ✦
          </span>
          <p className="chat-list__empty-title">Пока нет чатов</p>
          <p className="chat-list__empty-text">Нажмите «+» и введите номер получателя.</p>
        </div>
      )}

      <div className="chat-list__footer">
        <span className="chat-list__account">Интерфейс чата</span>
        <Button className="chat-list__exit" type="button" onClick={signOut}>
          Выйти
        </Button>
      </div>
    </aside>
  );
}

export default Aside;
