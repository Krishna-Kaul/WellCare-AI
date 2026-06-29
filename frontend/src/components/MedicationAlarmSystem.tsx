import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { format, isBefore, isAfter, subMinutes, addMinutes, parseISO } from "date-fns";
import { API_BASE_URL, getAuthToken, getStoredUser } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Check, Clock, X } from "lucide-react";

const SNOOZE_MINUTES = 5;

export function MedicationAlarmSystem() {
  const [activeAlarm, setActiveAlarm] = useState<any | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<"taken" | "snooze" | "skipped" | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Stop the alarm sound
  const stopSound = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  // Play a loud synthesized medical alarm tone
  const playSound = () => {
    stopSound();
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Beep pattern
      let isHigh = true;
      intervalRef.current = window.setInterval(() => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        
        osc.type = "square";
        osc.frequency.setValueAtTime(isHigh ? 800 : 600, audioCtxRef.current.currentTime);
        
        gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.3);
        
        osc.start(audioCtxRef.current.currentTime);
        osc.stop(audioCtxRef.current.currentTime + 0.3);
        
        isHigh = !isHigh;
      }, 500);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const fetchUpcomingReminders = async () => {
    const token = getAuthToken();
    if (!token) return;
    const user = getStoredUser();
    if (user?.role !== "patient") return;

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/reminders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      
      const now = new Date();
      
      // Find the first pending reminder that is due
      const dueReminder = data.find((r: any) => {
        if (r.status !== "pending") return false;
        
        let targetTime = parseISO(r.scheduled_time);
        
        // Apply adaptive ML offset if present
        if (r.early_by_minutes && r.early_by_minutes > 0) {
          targetTime = subMinutes(targetTime, r.early_by_minutes);
        }
        
        // If it was snoozed, the alarm shouldn't ring until the snooze expires
        if (r.snoozed_until) {
          const snoozedUntilTime = parseISO(r.snoozed_until);
          if (isBefore(now, snoozedUntilTime)) return false;
        }

        // Trigger if current time is past the target time and it hasn't been actioned
        return isAfter(now, targetTime);
      });

      if (dueReminder && (!activeAlarm || activeAlarm.log_id !== dueReminder.log_id)) {
        setActiveAlarm(dueReminder);
        playSound();
      } else if (!dueReminder && activeAlarm) {
        setActiveAlarm(null);
        stopSound();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Poll every 30 seconds
    fetchUpcomingReminders();
    const timer = setInterval(fetchUpcomingReminders, 30000);
    return () => {
      clearInterval(timer);
      stopSound();
    };
  }, [activeAlarm]);

  const handleAction = async (action: "taken" | "snooze" | "skipped") => {
    if (!activeAlarm) return;
    stopSound();
    const logId = activeAlarm.log_id;
    const token = getAuthToken();
    
    // Show feedback screen
    setFeedbackAction(action);

    try {
      if (action === "snooze") {
        const res = await fetch(`${API_BASE_URL}/api/v1/reminders/${logId}/snooze`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          toast.success(`Alarm snoozed for ${SNOOZE_MINUTES} minutes`);
        } else {
          toast.error("Failed to snooze");
        }
      } else {
        const status = action === "taken" ? "taken" : "missed";
        const res = await fetch(`${API_BASE_URL}/api/v1/reminders/${logId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          toast.success(`Marked as ${status}`);
        } else {
          toast.error(`Failed to mark as ${status}`);
        }
      }
    } catch (e) {
      toast.error("Network error");
    }
    
    // Auto close feedback after delay
    setTimeout(() => {
      setActiveAlarm(null);
      setFeedbackAction(null);
      fetchUpcomingReminders();
    }, 2500);
  };

  return (
    <AnimatePresence>
      {activeAlarm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 ring-red-500"
          >
            <div className="flex flex-col items-center p-8 text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="mb-4 rounded-full bg-red-100 p-4 text-red-600"
              >
                <BellRing className="h-12 w-12" />
              </motion.div>
              <h2 className="mb-2 text-3xl font-bold text-gray-900">
                Time for Medication!
              </h2>
              <p className="mb-1 text-2xl font-semibold text-blue-600">
                {activeAlarm.medicine_name} {activeAlarm.strength && `(${activeAlarm.strength})`}
              </p>
              <p className="mb-6 text-gray-500">
                Scheduled for: {format(parseISO(activeAlarm.scheduled_time), "h:mm a")}
              </p>
              
              {activeAlarm.snooze_count > 0 && (
                <div className="mb-6 rounded-full bg-orange-100 px-4 py-1 text-sm font-medium text-orange-800">
                  Snoozed {activeAlarm.snooze_count} time(s)
                </div>
              )}

              {feedbackAction ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="flex flex-col items-center justify-center py-6"
                >
                  {feedbackAction === "taken" && (
                    <>
                      <div className="text-8xl mb-4 drop-shadow-md">🥳</div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">Good, keep it up!</h3>
                      <p className="text-gray-500">Your streak has been protected.</p>
                    </>
                  )}
                  {feedbackAction === "skipped" && (
                    <>
                      <div className="text-8xl mb-4 drop-shadow-md">😟</div>
                      <h3 className="text-2xl font-bold text-red-600 mb-2">You missed medicine</h3>
                      <p className="text-gray-500">Please try not to miss your next dose.</p>
                    </>
                  )}
                  {feedbackAction === "snooze" && (
                    <>
                      <div className="text-8xl mb-4 drop-shadow-md">😴</div>
                      <h3 className="text-2xl font-bold text-orange-600 mb-2">Snoozed!</h3>
                      <p className="text-gray-500">We'll remind you again in {SNOOZE_MINUTES} minutes.</p>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => handleAction("taken")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-4 text-lg font-bold text-white transition hover:bg-green-600 active:scale-95"
                  >
                    <Check className="h-6 w-6" />
                    Mark as Taken
                  </button>
                  <button
                    onClick={() => handleAction("snooze")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 text-lg font-bold text-white transition hover:bg-orange-600 active:scale-95"
                  >
                    <Clock className="h-6 w-6" />
                    Snooze ({SNOOZE_MINUTES} min)
                  </button>
                  <button
                    onClick={() => handleAction("skipped")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-3 text-lg font-bold text-gray-700 transition hover:bg-gray-300 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                    Skip Dose
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
