import { useRef, useState } from "react";

import "./App.scss";
import Auth from "@/pages/Auth/Auth.tsx";
import Aside from "@/components/Aside/Aside.tsx";
import ChatPanel from "@/components/ChatPanel/ChatPanel.tsx";
import type { ApiAccount, ConnectionId, Credentials } from "@/shared/types";
import { useChats } from "@/modules/chats/useChats";
import { resolveChatId } from "@/api/service";
import { connections } from "@/api/connections";

function App() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [formError, setFormError] = useState("");
  const [credentials, setCredentials] = useState<Credentials>({ idInstance: "", apiTokenInstance: "" });
  const [connectionId, setConnectionId] = useState<ConnectionId>("max");
  const [apiAccount, setApiAccount] = useState<ApiAccount | null>(null);
  const newChatController = useRef<AbortController | null>(null);
  const { chats, isLoadingChats, chatListError, notificationError, historyError, addChat, sendMessage, clearChats } =
    useChats(apiAccount, isChatOpen ? activeChatId : null);
  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const signIn = (verifiedAccount: ApiAccount) => {
    setApiAccount(verifiedAccount);
  };

  const signOut = () => {
    newChatController.current?.abort();
    newChatController.current = null;
    sessionStorage.removeItem("greenApiCredentials");
    setCredentials({ idInstance: "", apiTokenInstance: "" });
    setApiAccount(null);
    setFormError("");
    setActiveChatId(null);
    setIsChatOpen(false);
    setIsCreatingChat(false);
    clearChats();
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setIsChatOpen(true);
  };

  const createChat = async (number: string) => {
    if (!apiAccount) return;
    const controller = new AbortController();
    newChatController.current = controller;
    let chatId: string;

    try {
      chatId = await resolveChatId(apiAccount, number, controller.signal);
    } finally {
      if (newChatController.current === controller) newChatController.current = null;
    }

    if (controller.signal.aborted) return;

    const existing = chats.find((chat) => chat.chatId === chatId || chat.aliasChatId === chatId);
    if (!existing) addChat(chatId, number);
    selectChat(existing?.id ?? chatId);
    setIsCreatingChat(false);
  };

  const closeCreateChat = () => {
    newChatController.current?.abort();
    newChatController.current = null;
    setIsCreatingChat(false);
  };

  if (!apiAccount) {
    return (
      <Auth
        onSignIn={signIn}
        credentials={credentials}
        connectionId={connectionId}
        setConnectionId={setConnectionId}
        formError={formError}
        setCredentials={setCredentials}
        setFormError={setFormError}
      />
    );
  }

  return (
    <main className={`chat-layout${isChatOpen ? " chat-layout--chat-open" : ""}`}>
      <Aside
        activeChatId={activeChatId}
        chats={chats}
        isCreatingChat={isCreatingChat}
        isLoadingChats={isLoadingChats}
        chatListError={chatListError}
        notificationError={notificationError}
        onCreateChat={() => setIsCreatingChat(true)}
        onSubmitNewChat={createChat}
        onCloseCreateChat={closeCreateChat}
        onSelectChat={selectChat}
        onSignOut={signOut}
      />
      <ChatPanel
        activeChatId={activeChatId}
        isChatOpen={isChatOpen}
        activeChat={activeChat}
        historyError={historyError}
        onSendMessage={sendMessage}
        maxTextLength={connections[apiAccount.connectionId].maxTextLength}
        onCloseChat={() => setIsChatOpen(false)}
        onCreateChat={() => setIsCreatingChat(true)}
      />
    </main>
  );
}

export default App;
