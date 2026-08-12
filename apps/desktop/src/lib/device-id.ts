const DEVICE_KEY = "omni.device_id";

/** Stable per-browser / per-install id used for presence and echo suppression. */
export function getDeviceId(): string {
  if (typeof localStorage === "undefined") {
    return "device-unknown";
  }
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now().toString(36)}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}
