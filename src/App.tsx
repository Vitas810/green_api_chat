import { useState } from "react";

import "./App.scss";
import Auth from "@/pages/Auth/Auth.tsx";
import Aside from "@/components/Aside/Aside.tsx";
import ChatPanel from "@/components/ChatPanel/ChatPanel.tsx";
import type { Credentials, InstanceSettings } from "@/shared/types";
import { useChats } from "@/modules/chats/useChats";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [instanceSettings, setInstanceSettings] = useState<InstanceSettings | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [formError, setFormError] = useState("");
  const [credentials, setCredentials] = useState<Credentials>({ idInstance: "", apiTokenInstance: "" });
  const { chats, isLoadingChats, chatListError, historyError, addChat, sendMessage, clearChats } = useChats(
    isAuthenticated ? credentials : null,
    isChatOpen ? activeChatId : null,
  );
  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const signIn = (verifiedCredentials: Credentials, settings: InstanceSettings) => {
    setCredentials(verifiedCredentials);
    setInstanceSettings(settings);
    setIsAuthenticated(true);
  };

  const signOut = () => {
    sessionStorage.removeItem("greenApiCredentials");
    setCredentials({ idInstance: "", apiTokenInstance: "" });
    setFormError("");
    setInstanceSettings(null);
    setIsAuthenticated(false);
    setActiveChatId(null);
    setIsChatOpen(false);
    setIsCreatingChat(false);
    clearChats();
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setIsChatOpen(true);
  };

  const createChat = (number: string) => {
    const chatId = `${number}@c.us`;
    const existing = chats.find((chat) => chat.chatId === chatId || chat.aliasChatId === chatId);
    if (!existing) addChat(chatId, number);
    selectChat(existing?.id ?? chatId);
    setIsCreatingChat(false);
  };

  if (!isAuthenticated || !instanceSettings) {
    return (
      <Auth
        onSignIn={signIn}
        credentials={credentials}
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
        onCreateChat={() => setIsCreatingChat(true)}
        onSubmitNewChat={createChat}
        onCloseCreateChat={() => setIsCreatingChat(false)}
        onSelectChat={selectChat}
        onSignOut={signOut}
      />
      <ChatPanel
        activeChatId={activeChatId}
        isChatOpen={isChatOpen}
        activeChat={activeChat}
        historyError={historyError}
        onSendMessage={sendMessage}
        onCloseChat={() => setIsChatOpen(false)}
        onCreateChat={() => setIsCreatingChat(true)}
      />
    </main>
  );
}

export default App;
