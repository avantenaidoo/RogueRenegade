import { useEffect, useState } from "react";
import {
  initCollaboration,
  onCursorUpdate,
  onPresenceUpdate,
  onChatMessage,
  sendTyping,
  onTyping,
} from "../utils/collaboration";
import { useEditorStore } from "../store";
import { open } from "@tauri-apps/plugin-dialog";

export default function CollaborationPanel({
  username,
  roomId,
  onToggleMaximize,
}: {
  username: string;
  roomId: string;
  onToggleMaximize?: () => void;
}) {
  const users = useEditorStore(state => state.users ?? []);
  const repoPath = useEditorStore(state => state.repoPath);

  const {
    chatTabs,
    activeChatId,
    addChatTab,
    setActiveChat,
    closeChatTab,
    addChatMessage,
    updateChatDraft,
    addChatAttachment,
    clearChatInput,
    toggleCollaboration,
  } = useEditorStore();

  const activeChat = chatTabs.find(t => t.id === activeChatId);

  /* 🔥 STEP 6 — typing state (ADD ONLY) */
  const [typingUsers, setTypingUsers] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    initCollaboration(username, roomId);

    onPresenceUpdate(userIds => {
      const collaborators = userIds.map(id => ({
        id,
        name: id,
      }));
      useEditorStore.getState().setUsers(collaborators);
    });

    onCursorUpdate(cursor => {
      console.log("[cursor]", cursor);
    });

    /* ─────────────────────────────────────────────
       🔥 STEP 5 — RECEIVE REMOTE CHAT MESSAGES
       ───────────────────────────────────────────── */
    onChatMessage(message => {
      const { chatTabs } = useEditorStore.getState();

      const tabExists = chatTabs.some(t => t.id === message.chatId);
      if (!tabExists) return;

      addChatMessage(message.chatId, message);
    });
    /* ───────────────────────────────────────────── */

    /* 🔥 STEP 6 — RECEIVE TYPING */
    onTyping((chatId, user, isTyping) => {
      setTypingUsers(prev => {
        const current = prev[chatId] ?? [];
        const next = isTyping
          ? [...new Set([...current, user])]
          : current.filter(u => u !== user);

        return { ...prev, [chatId]: next };
      });
    });
  }, [username, roomId]);

  const sendMessage = () => {
    if (!activeChat) return;
    if (!activeChat.draft.trim() && activeChat.attachments.length === 0)
      return;

    addChatMessage(activeChat.id, {
      id: crypto.randomUUID(),
      chatId: activeChat.id,
      senderId: username,
      senderName: username,
      text: activeChat.draft,
      attachments: activeChat.attachments,
      timestamp: Date.now(),
    });

    sendTyping(activeChat.id, false);
    clearChatInput(activeChat.id);
  };

  /* ───────────────────────────────────────────── */
  /* 🔥 STEP 3 — REAL FILE ATTACHMENT (WORKSPACE) */
  /* ───────────────────────────────────────────── */
  const attachFile = async () => {
    if (!activeChat) return;

    const selected = await open({
      multiple: true,
      directory: false,
      defaultPath: repoPath ?? undefined,
      title: "Attach file(s) to chat",
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];

    for (const path of paths) {
      const name = path.split(/[\\/]/).pop()!;
      addChatAttachment(activeChat.id, { path, name });
    }
  };
  /* ───────────────────────────────────────────── */

  const typingList = typingUsers[activeChatId ?? ""] ?? [];
  const currentUser = useEditorStore(state => state.currentUser);
  console.log("[CHAT PANEL] Current user from store:", currentUser);

  return (
    <div className="h-full w-full flex flex-col bg-muted text-default">
      {/* HEADER */}
      <div className="h-9 flex items-center justify-between px-2 border-b border-default text-xs select-none">
        {/* Left: User info + badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {/* Online/offline badge */}
            <div className={`w-2.5 h-2.5 rounded-full ${
              currentUser?.isOnline ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-gray-500"
            }`} />
            
            {/* Username or email */}
            <span className="font-medium">
              {currentUser?.username || currentUser?.email || "local-user"}
              {/* Debug fallback */}
              {currentUser ? "" : " (store is null)"}
            </span>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-1">
          <button title="New Chat" className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded" onClick={addChatTab}>
            +
          </button>
          <button title="Chat Settings" className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded">
            ⚙
          </button>
          <button title="Maximize Chat" className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded" onClick={onToggleMaximize}>
            ⤢
          </button>
          <button title="Close Chat" className="w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded" onClick={toggleCollaboration}>
            ✕
          </button>
        </div>
      </div>

      {/* PRESENCE BAR */}
      {users.length > 0 && (
        <div className="px-2 py-1 border-b text-xs flex gap-2 overflow-x-auto">
          {users.map(u => (
            <span
              key={u.id}
              className="px-2 py-0.5 rounded bg-neutral-700 text-white whitespace-nowrap"
            >
              {u.name}
            </span>
          ))}
        </div>
      )}

      {/* CHAT TABS */}
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

      {/* MESSAGES */}
      <div className="flex-1 overflow-auto p-2 space-y-2 text-sm">
        {activeChat?.messages.map(m => (
          <div key={m.id}>
            <div className="text-xs opacity-70">
              {m.senderName} ·{" "}
              {new Date(m.timestamp).toLocaleTimeString()}
            </div>
            <div>{m.text}</div>

            {m.attachments.length > 0 && (
              <div className="text-xs opacity-80">
                {m.attachments.map(a => (
                  <div key={a.path}>📎 {a.name}</div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 🔥 STEP 6 — TYPING INDICATOR */}
        {typingList.length > 0 && (
          <div className="text-xs italic opacity-60">
            {typingList.join(", ")} typing…
          </div>
        )}
      </div>

      {/* INPUT */}
      {activeChat && (
        <div className="border-t p-2 flex flex-col gap-1">
          {activeChat.attachments.length > 0 && (
            <div className="flex gap-1 text-xs">
              {activeChat.attachments.map(a => (
                <span key={a.path} className="bg-neutral-600 px-1 rounded">
                  {a.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            <button onClick={attachFile}>📎</button>

            <input
              value={activeChat.draft}
              onChange={e => {
                updateChatDraft(activeChat.id, e.target.value);
                sendTyping(activeChat.id, true);
              }}
              onBlur={() => sendTyping(activeChat.id, false)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-transparent border rounded px-2"
              placeholder="Message…"
            />

            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
