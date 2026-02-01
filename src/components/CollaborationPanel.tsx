import { useEffect, useState } from "react";
import {
  initCollaboration,
  onCursorUpdate,
  onPresenceUpdate,
} from "../utils/collaboration";
import { useEditorStore } from "../store";

interface ChatTab {
  id: string;
  title: string;
}

export default function CollaborationPanel({
  username,
  roomId,
}: {
  username: string;
  roomId: string;
}) {
  const [users, setUsers] = useState<string[]>([]);

  /* ───── CHAT TABS (LOCAL, LIKE EDITOR TABS) ───── */
  const [chatTabs, setChatTabs] = useState<ChatTab[]>([
    { id: "chat-1", title: "Chat 1" },
  ]);
  const [activeChatId, setActiveChatId] = useState("chat-1");

  const toggleCollaboration = useEditorStore(
    state => state.toggleCollaboration
  );

  useEffect(() => {
    initCollaboration(username, roomId);

    onPresenceUpdate(setUsers);

    onCursorUpdate((user, position) => {
      console.log("Cursor:", user, position);
    });
  }, [username, roomId]);

  /* ───── ACTIONS ───── */

  const createNewChat = () => {
    const id = `chat-${Date.now()}`;
    setChatTabs(tabs => [...tabs, { id, title: `Chat ${tabs.length + 1}` }]);
    setActiveChatId(id);
  };

  const openChatSettings = () => {
    console.log("Open chat settings (stub)");
  };

  const toggleChatMaximized = () => {
    console.log("Toggle chat maximize (stub)");
  };

  return (
    <div className="h-full w-full flex flex-col bg-muted text-default">
      {/* ───────── PANEL HEADER ───────── */}
      <div className="h-9 flex items-center justify-between px-2 border-b border-default text-xs select-none">
        <span className="font-semibold uppercase tracking-wide">Chat</span>

        <div className="flex items-center gap-1">
          {/* NEW CHAT */}
          <button
            title="New Chat"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={createNewChat}
          >
            +
          </button>

          {/* SETTINGS */}
          <button
            title="Chat Settings"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={openChatSettings}
          >
            ⚙
          </button>

          {/* MAXIMIZE */}
          <button
            title="Maximize Chat"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={toggleChatMaximized}
          >
            ⤢
          </button>

          {/* CLOSE PANEL */}
          <button
            title="Close Chat"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={toggleCollaboration}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ───────── CHAT TABS ───────── */}
      <div className="h-8 flex border-b border-default overflow-x-auto">
        {chatTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChatId(tab.id)}
            className={`px-3 text-xs flex items-center
              ${
                tab.id === activeChatId
                  ? "bg-(--foreground)/65 text-(--background) border-b-2 border-blue-500"
                  : "hover:bg-neutral-500"
              }`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* ───────── CHAT CONTENT ───────── */}
      <div className="flex-1 overflow-auto p-2 text-sm">
        <h4 className="font-semibold mb-2">
          Active: {chatTabs.find(t => t.id === activeChatId)?.title}
        </h4>

        <div className="mb-2">Live Collaboration</div>

        <ul className="text-xs opacity-80">
          {users.map(u => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
