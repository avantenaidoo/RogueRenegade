import { io, Socket } from "socket.io-client";

let socket: Socket;

export type CursorPosition = {
  tabPath: string;
  line: number;
  column: number;
};

export function initCollaboration(username: string, roomId: string) {
  socket = io("http://127.0.0.1:3000");

  socket.emit("joinRoom", { username, roomId });
}

/* ========================
   Cursor sync
   ======================== */

export function sendCursorPosition(position: CursorPosition) {
  socket.emit("cursorMove", position);
}

export function onCursorUpdate(
  callback: (user: string, position: CursorPosition) => void
) {
  socket.on("cursorUpdate", ({ user, position }) => {
    callback(user, position);
  });
}

/* ========================
   File sync
   ======================== */

export function sendFileChange(tabPath: string, content: string) {
  socket.emit("fileChange", { tabPath, content });
}

export function onFileChange(
  callback: (user: string, tabPath: string, content: string) => void
) {
  socket.on("fileUpdate", ({ user, tabPath, content }) => {
    callback(user, tabPath, content);
  });
}

/* ========================
   Presence
   ======================== */

export function onPresenceUpdate(
  callback: (users: string[]) => void
) {
  socket.on("presenceUpdate", callback);
}

/* =========================================================
   🔥🔥🔥 CHAT SYNC — STEP 4B (ADD ONLY)
   ========================================================= */

export type NetworkChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments: {
    path: string;
    name: string;
  }[];
  timestamp: number;
};

/* SEND chat message to other users */
export function sendChatMessage(message: NetworkChatMessage) {
  socket.emit("chatMessage", message);
}

/* RECEIVE chat messages from other users */
export function onChatMessage(
  callback: (message: NetworkChatMessage) => void
) {
  socket.on("chatMessage", (message: NetworkChatMessage) => {
    callback(message);
  });
}

/* =========================================================
   🔥 STEP 6 — TYPING INDICATORS (ADD ONLY)
   ========================================================= */

export function sendTyping(chatId: string, isTyping: boolean) {
  socket.emit("typing", { chatId, isTyping });
}

export function onTyping(
  callback: (chatId: string, user: string, isTyping: boolean) => void
) {
  socket.on("typing", ({ chatId, user, isTyping }) => {
    callback(chatId, user, isTyping);
  });
}
