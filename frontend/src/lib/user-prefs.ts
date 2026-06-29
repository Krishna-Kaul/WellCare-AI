export type UserRole = "patient" | "caregiver" | "doctor";
export type Language = "en" | "hi" | "hi-en";
export type ReminderTone = "gentle" | "standard" | "urgent";

export interface UserPrefs {
  role: UserRole;
  name: string;
  language: Language;
  reminderTone: ReminderTone;
  // Patient
  conditions?: string[];
  caregiverPhone?: string;
  // Caregiver
  patientName?: string;
  alertChannels?: ("sms" | "push" | "call")[];
  // Doctor
  clinicName?: string;
  specialty?: string;
  patientLoad?: string;
  completedAt: string;
}

const KEY = "wellcare:prefs";

export function savePrefs(prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function loadPrefs(): UserPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserPrefs) : null;
  } catch {
    return null;
  }
}

export function clearPrefs() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
