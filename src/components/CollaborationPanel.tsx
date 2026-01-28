import { useEffect, useState } from "react";
import {
  initCollaboration,
  onCursorUpdate,
  onPresenceUpdate,
} from "../utils/collaboration";

export default function CollaborationPanel({
  username,
  roomId,
}: {
  username: string;
  roomId: string;
}) {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    initCollaboration(username, roomId);

    onPresenceUpdate(setUsers);

    onCursorUpdate((user, position) => {
      console.log("Cursor:", user, position);
    });
  }, [username, roomId]);

  return (
    // <div style={{ borderTop: "1px solid gray", padding: "5px" }}>
    <div className="h-full w-full flex items-center justify-center">
      <h4>Live Collaboration</h4>
      <ul>
        {users.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
    </div>
  );
}
