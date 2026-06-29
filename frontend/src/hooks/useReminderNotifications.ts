import { useEffect, useRef } from "react";
import { API_BASE_URL, getAuthToken } from "@/lib/auth";

interface UpcomingReminder {
  log_id: number;
  medicine_name: string;
  strength?: string | null;
  before_meal?: boolean;
  scheduled_time: string;
  status: string;
  minutes_until: number;
  risk_level?: "low" | "medium" | "high";
  early_by_minutes?: number;
  effective_minutes_until?: number;
  miss_probability?: number;
}

const DUE_WINDOW_MIN = 15;
const POLL_MS = 2 * 60 * 1000;
const MAX_NOTIFY = 4;

export function useReminderNotifications(enabled: boolean = true) {
  const notifyCountRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

   const RISK_TITLE = {
      high:   "⚠️ Important reminder:",
      medium: "🔔 Reminder:",
      low:    "💊 Time to take your medicine",
    };
     
    const playAlarmSound = (risk: "low" | "medium" | "high") => {
  try {
    const ctx      = new AudioContext();
    const master   = ctx.createGain();
    master.connect(ctx.destination);

    // Vibration — mobile pe kaam karega
    if ("vibrate" in navigator) {
      if (risk === "high") {
        navigator.vibrate([200, 100, 200, 100, 200]); // 3 pulses
      } else if (risk === "medium") {
        navigator.vibrate([200, 100, 200]);            // 2 pulses
      } else {
        navigator.vibrate([150]);                      // 1 soft pulse
      }
    }

    // Notes — gentle bell-like melody
    // C5, E5, G5 = pleasant major chord arpeggio
    const notes =
      risk === "high"
        ? [523, 659, 784, 659, 523]   // C5 E5 G5 E5 C5 — descending feel
        : risk === "medium"
        ? [523, 659, 784]             // C5 E5 G5 — short upward
        : [659, 784];                 // E5 G5 — minimal 2 note

    const volume    = risk === "high" ? 0.35 : risk === "medium" ? 0.25 : 0.18;
    const noteDur   = 0.22;  // seconds each note plays
    const noteGap   = 0.28;  // gap between notes

    notes.forEach((freq, i) => {
      const t          = ctx.currentTime + i * noteGap;
      const osc        = ctx.createOscillator();
      const envGain    = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      // Bell-like timbre — triangle wave + slight filtering
      osc.type              = "triangle";
      osc.frequency.value   = freq;

      // Soft low-pass filter — removes harshness
      filterNode.type            = "lowpass";
      filterNode.frequency.value = 2000;

      // Envelope — fast attack, slow release (bell-like decay)
      envGain.gain.setValueAtTime(0, t);
      envGain.gain.linearRampToValueAtTime(volume, t + 0.01);  // fast attack
      envGain.gain.exponentialRampToValueAtTime(0.001, t + noteDur + 0.3); // slow decay

      osc.connect(filterNode);
      filterNode.connect(envGain);
      envGain.connect(master);

      osc.start(t);
      osc.stop(t + noteDur + 0.35);
    });

    // Auto close
    const totalDur = notes.length * noteGap + 0.8;
    setTimeout(() => ctx.close(), totalDur * 1000);

  } catch {
    // Silently fail
  }
};

    const fire = (r: UpcomingReminder) => {
      const count = notifyCountRef.current.get(r.log_id) ?? 0;
      if (count >= MAX_NOTIFY) return;
      notifyCountRef.current.set(r.log_id, count + 1);
      try {
        const meal           = r.before_meal ? "before meal" : "after meal";
        const risk           = r.risk_level ?? "low";
        const earlyBy        = r.early_by_minutes ?? 0;
        const minutesUntil   = r.minutes_until;

       
        const isEarlyWarning = minutesUntil > 2;

        const title = isEarlyWarning
          ? `⏰ Get ready! Medicine in ~${minutesUntil} min`
          : RISK_TITLE[risk];

        const body = isEarlyWarning
          ? `${r.medicine_name}${r.strength ? ` ${r.strength}` : ""} — due ${meal} at ${new Date(r.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : `${r.medicine_name}${r.strength ? ` ${r.strength}` : ""} — ${meal}`;

        new Notification(title, {
          body,
          tag:                `reminder-${r.log_id}-${count}`,
          requireInteraction: risk === "high" || isEarlyWarning,
        });
        playAlarmSound(risk as "low" | "medium" | "high");
      } catch {}
    };

    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/reminders/upcoming?hours=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) return;
        const data: UpcomingReminder[] = await res.json();
        if (cancelled) return;
        if (Notification.permission !== "granted") return;
        for (const r of data) {
          const effectiveMinutes = r.effective_minutes_until ?? r.minutes_until;
          if (r.status === "pending" && effectiveMinutes <= DUE_WINDOW_MIN && effectiveMinutes >= 0) {
            fire(r);
          }
        }
      } catch {}
    };

    const markMissed = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/v1/reminders/mark-missed-overdue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {}
    };

    tick();
    markMissed();
    const pollId = window.setInterval(tick, POLL_MS);
    const missedId = window.setInterval(markMissed, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(missedId);
    };
  }, [enabled]);
}

export async function fetchOverdueCount(): Promise<number> {
  try {
    const token = getAuthToken();
    if (!token) return 0;
    const res = await fetch(`${API_BASE_URL}/api/v1/reminders/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data: Array<{ status: string; scheduled_time: string }> = await res.json();
    const now = Date.now();
    return data.filter(
      (r) => r.status === "pending" && new Date(r.scheduled_time).getTime() < now,
    ).length;
  } catch {
    return 0;
  }
}