import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mic, MicOff, Send, Sparkles, Trash2, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, authHeaders, getAuthToken, getStoredUser } from "@/lib/auth";

type Mode = "voice" | "text";
type VoiceState = "idle" | "recording" | "loading" | "speaking";

interface Exchange {
  id: string;
  question: string;
  answer: string;
}

const MAX_HISTORY = 5;
const RECORD_TIMEOUT_MS = 10_000;

export function VoiceAssistant() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [isPatient, setIsPatient] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("voice");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [textQuery, setTextQuery] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  // Hydrate role on client only — avoids SSR/localStorage mismatch
  useEffect(() => {
    setMounted(true);
    const u = getStoredUser();
    setIsPatient(u?.role === "patient");
  }, []);

  // Re-check role on route change (login/onboarding flows can change it)
  useEffect(() => {
    if (!mounted) return;
    const u = getStoredUser();
    setIsPatient(u?.role === "patient");
  }, [location.pathname, mounted]);

  // Auto-scroll history
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [history, lastTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function cleanupRecording() {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }

  function pushExchange(question: string, answer: string) {
    setHistory((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), question, answer }];
      return next.slice(-MAX_HISTORY);
    });
  }

  /* -------------------- VOICE -------------------- */

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.warning("Microphone not available, switched to text mode");
      setMode("text");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        // free mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current);
          stopTimeoutRef.current = null;
        }

        if (blob.size === 0) {
          setVoiceState("idle");
          toast.error("No audio captured, try again");
          return;
        }
        await sendAudio(blob);
      };

      recorder.start();
      setVoiceState("recording");

      // Auto-stop after 10s
      stopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, RECORD_TIMEOUT_MS);
    } catch (err) {
      console.error("Mic error:", err);
      toast.warning("Microphone not available, switched to text mode");
      setMode("text");
      setVoiceState("idle");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setVoiceState("loading");
    }
  }

  async function sendAudio(blob: Blob) {
    setVoiceState("loading");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "recording.webm");

      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE_URL}/api/v1/voice/audio`, {
        method: "POST",
        headers,
        body: fd,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as {
        transcribed_query: string;
        response_text: string;
        response_audio_b64?: string;
        audio_format?: string;
      };

      setLastTranscript(data.transcribed_query);
      pushExchange(data.transcribed_query, data.response_text);

      if (data.response_audio_b64) {
        await playAudioBase64(data.response_audio_b64, data.audio_format ?? "wav");
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voice request failed";
      toast.error(msg);
      setVoiceState("idle");
    }
  }

  async function playAudioBase64(b64: string, format: string) {
    try {
      const bytes = base64ToBytes(b64);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: `audio/${format}` });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setVoiceState("speaking");
      audio.onended = () => {
        setVoiceState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setVoiceState("idle");
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error("Audio playback error:", err);
      setVoiceState("idle");
    }
  }

  /* -------------------- TEXT -------------------- */

  async function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    const q = textQuery.trim();
    if (!q || textLoading) return;
    setTextLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/voice/query`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = (await res.json()) as { query: string; response: string };
      pushExchange(data.query || q, data.response);
      setTextQuery("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      toast.error(msg);
    } finally {
      setTextLoading(false);
    }
  }

  /* -------------------- Render -------------------- */

  if (!mounted || !isPatient) return null;

  return (
    <div className="pointer-events-none">
      {/* Floating panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="voice-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-3xl border border-border/60 bg-background shadow-elevated overflow-hidden"
            role="dialog"
            aria-label="WellCare Assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-gradient-lavender p-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-cta">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-foreground">
                    WellCare Assistant
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Ask me about medicines, doses, or reminders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground transition-smooth"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-3 pt-3">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                <ModeTab active={mode === "voice"} onClick={() => setMode("voice")}>
                  Voice
                </ModeTab>
                <ModeTab active={mode === "text"} onClick={() => setMode("text")}>
                  Text
                </ModeTab>
              </div>
            </div>

            {/* History */}
            <div className="px-3 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Conversation
                </p>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      setLastTranscript("");
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-smooth"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <div ref={conversationRef} className="mt-2 max-h-44 overflow-y-auto pr-1 space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No conversations yet — try asking a question.
                  </p>
                ) : (
                  history.map((ex) => (
                    <div key={ex.id} className="space-y-1.5">
                      <Bubble side="right">{ex.question}</Bubble>
                      <Bubble side="left">{ex.answer}</Bubble>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mode body */}
            <div className="p-4">
              {mode === "voice" ? (
                <VoiceModeBody
                  state={voiceState}
                  onStart={startRecording}
                  onStop={stopRecording}
                  lastTranscript={lastTranscript}
                />
              ) : (
                <form onSubmit={sendText} className="flex items-center gap-2">
                  <input
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="Type your question…"
                    className="flex-1 h-10 rounded-xl border border-border/60 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={textLoading}
                  />
                  <button
                    type="submit"
                    disabled={textLoading || !textQuery.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-cta disabled:opacity-50 transition-smooth hover:opacity-95"
                    aria-label="Send"
                  >
                    {textLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="pointer-events-auto fixed bottom-6 right-4 sm:right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-cta transition-smooth hover:scale-105 active:scale-95"
      >
        {/* Pulsing glow */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring"
            aria-hidden
          />
        )}
        <span className="relative">
          {open ? <X className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </span>
      </button>
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-8 rounded-lg text-xs font-bold transition-smooth ${
        active
          ? "bg-background text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-snug ${
          side === "right"
            ? "bg-accent text-accent-foreground rounded-br-md"
            : "bg-gradient-lavender text-foreground rounded-bl-md"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function VoiceModeBody({
  state,
  onStart,
  onStop,
  lastTranscript,
}: {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  lastTranscript: string;
}) {
  const label = {
    idle: "Tap to speak",
    recording: "Listening…",
    loading: "Thinking…",
    speaking: "Speaking…",
  }[state];

  const handleClick = () => {
    if (state === "idle") onStart();
    else if (state === "recording") onStop();
  };
  const disabled = state === "loading" || state === "speaking";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={label}
        className={`relative inline-flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-cta transition-smooth disabled:cursor-not-allowed ${
          state === "recording"
            ? "bg-destructive"
            : state === "speaking"
              ? "bg-success"
              : "bg-gradient-primary hover:scale-105 active:scale-95"
        }`}
      >
        {state === "recording" && (
          <>
            <span className="absolute inset-0 rounded-full bg-destructive/40 animate-pulse-ring" />
            <span className="absolute inset-2 rounded-full bg-destructive/60 animate-pulse-ring [animation-delay:0.4s]" />
          </>
        )}
        <span className="relative">
          {state === "loading" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : state === "recording" ? (
            <MicOff className="h-7 w-7" />
          ) : state === "speaking" ? (
            <SpeakingWaves />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </span>
      </button>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {state === "idle" && lastTranscript && (
        <p className="text-[11px] text-muted-foreground text-center px-2">
          You said: <span className="italic">"{lastTranscript}"</span>
        </p>
      )}
    </div>
  );
}

function SpeakingWaves() {
  return (
    <span className="flex items-end gap-1 h-7" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="block w-1 rounded-full bg-success-foreground"
          animate={{ height: ["30%", "100%", "40%", "80%", "30%"] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          style={{ height: "30%" }}
        />
      ))}
    </span>
  );
}

/* -------------------- Helpers -------------------- */

function pickSupportedMime(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function base64ToBytes(b64: string): Uint8Array {
  // Strip optional data URL prefix
  const clean = b64.replace(/^data:.*;base64,/, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
