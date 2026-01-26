import { io, Socket } from "socket.io-client";

let socket: Socket;

export function initCollaboration(username: string, roomId: string) {
  socket = io("https://your-collab-server.com"); // Set up your server
  socket.emit("joinRoom", { username, roomId });
}

export function sendCursorPosition(tabPath: string, line: number, col: number) {
  socket.emit("cursorMove", { tabPath, line, col });
}

export function onCursorUpdate(callback: (user: string, pos: any) => void) {
  socket.on("cursorUpdate", callback);
}

export function sendFileChange(tabPath: string, content: string) {
  socket.emit("fileChange", { tabPath, content });
}

export function onFileChange(callback: (user: string, tabPath: string, content: string) => void) {
  socket.on("fileUpdate", callback);
}