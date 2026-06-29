export interface StoredUser {
  id?: string;
  name?: string;
  email?: string;
  role?: "patient" | "caregiver" | "doctor";
}

const TOKEN_KEY = "wellcare:token";
const USER_KEY = "wellcare:user";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as StoredUser;
  } catch {
    // ignore
  }
  // Fall back to onboarding prefs so demo users have a role
  try {
    const prefsRaw = localStorage.getItem("wellcare:prefs");
    if (prefsRaw) {
      const prefs = JSON.parse(prefsRaw);
      return { name: prefs.name, role: prefs.role };
    }
  } catch {
    // ignore
  }
  return null;
}

export function setStoredUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const API_BASE_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "http://192.168.1.9:8000"
  : "http://localhost:8000";

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}
