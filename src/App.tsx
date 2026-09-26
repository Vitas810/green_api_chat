import { useState } from "react";

import "./App.scss";
import Auth from "@/pages/Auth/Auth.tsx";
import Aside from "@/components/Aside/Aside.tsx";
import ChatPanel from "@/components/ChatPanel/ChatPanel.tsx";

function App() {
  let [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const signIn = async () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Auth onSignIn={signIn} chats={chats} />;
  }

  return (
    <main className="chat-layout">
      <Aside
        activeChatId={activeChatId}
        isCreatingChat={isCreatingChat}
        onSetIsCreatingChat={setIsCreatingChat}
        onSetActiveChatId={setActiveChatId}
        onSetIsChatOpen={setIsChatOpen}
      />
      <ChatPanel
        activeChatId={activeChatId}
        activeChat={activeChat}
        onSetIsChatOpen={setIsChatOpen}
        onSetIsCreatingChat={setIsCreatingChat}
      />
    </main>
  );
}

export default App;
