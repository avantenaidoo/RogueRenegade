import { useEffect, useState } from "react";
import {
  initCollaboration,
  onCursorUpdate,
  onPresenceUpdate,
} from "../utils/collaboration";
import { useEditorStore } from "../store";

export default function CollaborationPanel({
  username,
  roomId,
  onToggleMaximize, // 🔥 ADD ONLY
}: {
  username: string;
  roomId: string;
  onToggleMaximize?: () => void; // 🔥 ADD ONLY
}) {
  const [users, setUsers] = useState<string[]>([]);

  /* ───── CHAT TABS (GLOBAL, UI ONLY) ───── */
  const chatTabs = useEditorStore(state => state.chatTabs);
  const activeChatId = useEditorStore(state => state.activeChatId);
  const addChatTab = useEditorStore(state => state.addChatTab);
  const setActiveChat = useEditorStore(state => state.setActiveChat);
  const closeChatTab = useEditorStore(state => state.closeChatTab);

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
    addChatTab();
  };

  const openChatSettings = () => {
    console.log("Open chat settings (stub)");
  };

  const toggleChatMaximized = () => {
    onToggleMaximize?.(); // 🔥 THIS IS THE ENTIRE FIX
  };

  return (
    <div className="h-full w-full flex flex-col bg-muted text-default">
      {/* ───────── PANEL HEADER ───────── */}
      <div className="h-9 flex items-center justify-between px-2 border-b border-default text-xs select-none">
        <span className="font-semibold uppercase tracking-wide">Chat</span>

        <div className="flex items-center gap-1">
          <button
            title="New Chat"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={createNewChat}
          >
            +
          </button>

          <button
            title="Chat Settings"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={openChatSettings}
          >
            ⚙
          </button>

          <button
            title="Maximize Chat"
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
            onClick={toggleChatMaximized}
          >
            ⤢
          </button>

          {/* CLOSE PANEL — VISIBILITY ONLY */}
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
          <div
            key={tab.id}
            className={`group flex items-center text-xs px-2 cursor-pointer
              ${
                tab.id === activeChatId
                  ? "bg-(--foreground)/65 text-(--background) border-b-2 border-blue-500"
                  : "hover:bg-neutral-500"
              }`}
            onClick={() => setActiveChat(tab.id)}
          >
            <span className="mr-2">{tab.title}</span>

            {/* CLOSE TAB (UI ONLY) */}
            <button
              className="opacity-0 group-hover:opacity-100 ml-1 text-xs hover:text-red-400"
              onClick={e => {
                e.stopPropagation();
                closeChatTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
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
