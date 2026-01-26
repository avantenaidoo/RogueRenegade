import { useEffect, useState } from "react";
import { initCollaboration, onCursorUpdate } from "../utils/collaboration";

export default function CollaborationPanel({ username, roomId }: { username: string; roomId: string }) {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    initCollaboration(username, roomId);
    onCursorUpdate((user, pos) => {
      console.log(user, pos);
    });
  }, [username, roomId]);

  return (
    <div style={{ borderTop: "1px solid gray", padding: "5px" }}>
      <h4>Live Collaboration</h4>
      <ul>
        {users.map(u => <li key={u}>{u}</li>)}
      </ul>
    </div>
  );
}