import { useEffect, useState } from "react";
import Workspace from "@/pages/Workspace";

/**
 * TEMP auth states for STEP 1
 * These will be replaced with real logic in STEP 2
 */
type AuthState =
  | "checking"
  | "unauthenticated"
  | "pending"
  | "approved"
  | "rejected";

export default function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    // 🔐 STEP 1: Stubbed auth check
    // In STEP 2 this will call Tauri securely
    console.log("🔐 Checking auth status...");

    setTimeout(() => {
      // CHANGE THIS VALUE TO TEST FLOWS
      setAuthState("unauthenticated");
      // setAuthState("approved");
      // setAuthState("pending");
      // setAuthState("rejected");
    }, 500);
  }, []);

  if (authState === "checking") {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-muted-foreground">
        Checking authentication…
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">Authentication Required</h1>
        <p>You must sign in to use this application.</p>
      </div>
    );
  }

  if (authState === "pending") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">Awaiting Approval</h1>
        <p>Your account is pending authorization.</p>
      </div>
    );
  }

  if (authState === "rejected") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold text-red-500">
          Access Denied
        </h1>
        <p>You have not been authorized to use this application.</p>
      </div>
    );
  }

  // ✅ ONLY approved users reach here
  return <Workspace />;
}
