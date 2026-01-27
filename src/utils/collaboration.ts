import { io, Socket } from "socket.io-client";

let socket: Socket;

export type CursorPosition = {
  tabPath: string;
  line: number;
  column: number;
};

export function initCollaboration(username: string, roomId: string) {
  socket = io("http://localhost:3000");

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
