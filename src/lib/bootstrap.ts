import { registerDeviceOnce } from "./deviceRegister";

let bootstrapped = false;

export async function bootstrapSecurity() {
  if (bootstrapped) return;

  console.log("🔐 BOOTSTRAP: registering device");

  await registerDeviceOnce();

  bootstrapped = true;

  console.log("✅ BOOTSTRAP COMPLETE");
}
