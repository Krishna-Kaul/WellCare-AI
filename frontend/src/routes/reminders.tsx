import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  SkipForward,
  Utensils,
  CalendarDays,
  History as HistoryIcon,
  Pill,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNavbar } from "@/components/AppNavbar";
import { API_BASE_URL, authHeaders, getAuthToken, getStoredUser } from "@/lib/auth";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders & Alerts — WellCare AI" },
      {
        name: "description",
        content:
          "Today's medication schedule, upcoming doses and adherence history with smart browser alerts.",
      },
      { property: "og:title", content: "Reminders & Alerts — WellCare AI" },
      {
        property: "og:description",
        content: "Track today's doses and your adherence history.",
      },
    ],
  }),
  component: RemindersPage,
});

/* -------------------- Types -------------------- */

type ReminderStatus = "pending" | "taken" | "missed" | "skipped";

interface TodayReminder {
  log_id: number;
  medicine_name: string;
  strength?: string | null;
  scheduled_time: string;
  status: ReminderStatus;
  before_meal?: boolean;
  risk_level?: "low" | "medium" | "high";
  miss_probability?: number;
  early_by_minutes?: number;
  should_repeat_reminder?: boolean;
  ml_reasoning?: string;
}

interface HistoryReminder {
  log_id: number;
  medicine_name: string;
  strength?: string | null;
  scheduled_time: string;
  action_time?: string | null;
  status: ReminderStatus;
}

/* -------------------- Helpers -------------------- */

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
function statusStyle(s: ReminderStatus) {
  switch (s) {
    case "taken":
      return "bg-success/15 text-success";
    case "missed":
      return "bg-destructive/15 text-destructive";
    case "skipped":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-warning/15 text-warning";
  }
}

/* -------------------- Page -------------------- */

function RemindersPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<"today" | "history">("today");

  // Today
  const [today, setToday] = useState<TodayReminder[] | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  // History
  const [historyDays, setHistoryDays] = useState<7 | 14 | 30>(7);
  const [history, setHistory] = useState<HistoryReminder[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Enable browser notifications globally for this page
  useReminderNotifications(true);

  /* ---------- Auth guard ---------- */
  useEffect(() => {
    const token = getAuthToken();
    const user = getStoredUser();
    if (!token) {
      navigate({ to: "/login" });
      return;
    }
    if (user?.role && user.role !== "patient") {
      navigate({ to: "/dashboard" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  /* ---------- API ---------- */

  const handle401 = useCallback(
    (status: number) => {
      if (status === 401) {
        toast.error("Session expired");
        navigate({ to: "/login" });
        return true;
      }
      return false;
    },
    [navigate],
  );

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reminders/today`, {
        headers: authHeaders(),
      });
      if (handle401(res.status)) return;
      if (!res.ok) throw new Error("Failed to load");
      const data: TodayReminder[] = await res.json();
      setToday(
        data.sort(
          (a, b) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime(),
        ),
      );
    } catch (e) {
      setToday([]);
      toast.error((e as Error).message || "Could not load today's reminders");
    } finally {
      setLoadingToday(false);
    }
  }, [handle401]);

  const loadHistory = useCallback(
    async (days: number) => {
      setLoadingHistory(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/reminders/history?days=${days}`,
          { headers: authHeaders() },
        );
        if (handle401(res.status)) return;
        if (!res.ok) throw new Error("Failed to load");
        const data: HistoryReminder[] = await res.json();
        setHistory(
          data.sort(
            (a, b) =>
              new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime(),
          ),
        );
      } catch (e) {
        setHistory([]);
        toast.error((e as Error).message || "Could not load history");
      } finally {
        setLoadingHistory(false);
      }
    },
    [handle401],
  );

  useEffect(() => {
    if (!authChecked) return;
    loadToday();

    // Mark missed overdue reminders on page load
    (async () => {
      try {
        await fetch(`${API_BASE_URL}/api/v1/reminders/mark-missed-overdue`, {
          method: "POST",
          headers: authHeaders(),
        });
        // Silently mark missed - no need to show toast
      } catch {
        // Silently ignore errors
      }
    })();
  }, [authChecked, loadToday]);

  useEffect(() => {
    if (!authChecked) return;
    loadHistory(historyDays);
  }, [authChecked, historyDays, loadHistory]);

  const syncToday = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reminders/generate-today`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (handle401(res.status)) return;
      if (!res.ok) throw new Error("Sync failed");
      const data: { created_count: number; medicines_processed: number } = await res.json();
      toast.success(
        `Synced ${data.created_count} new reminder${data.created_count === 1 ? "" : "s"} across ${data.medicines_processed} medicine${data.medicines_processed === 1 ? "" : "s"}`,
      );
      await loadToday();
    } catch (e) {
      toast.error((e as Error).message || "Could not sync today");
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (logId: number, status: "taken" | "skipped") => {
    setActingId(logId);
    // Optimistic update
    setToday((prev) =>
      prev ? prev.map((r) => (r.log_id === logId ? { ...r, status } : r)) : prev,
    );
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reminders/${logId}`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (handle401(res.status)) return;
      if (!res.ok) throw new Error("Update failed");
      toast.success(status === "taken" ? "Marked as taken ✓" : "Skipped");
    } catch (e) {
      toast.error((e as Error).message || "Could not update reminder");
      // Re-load to revert optimistic state
      loadToday();
    } finally {
      setActingId(null);
    }
  };

  /* ---------- Stats ---------- */

  const stats = useMemo(() => {
    const list = today ?? [];
    const total = list.length;
    const taken = list.filter((r) => r.status === "taken").length;
    const pending = list.filter((r) => r.status === "pending").length;
    const missed = list.filter((r) => r.status === "missed").length;
    const overdue = list.filter(
      (r) => r.status === "pending" && new Date(r.scheduled_time).getTime() < Date.now(),
    ).length;
    return { total, taken, pending, missed, overdue };
  }, [today]);

  /* ---------- Render ---------- */

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-mist">
        <AppNavbar />
        <div className="container-page py-8">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-24">
      <AppNavbar notificationCount={stats.overdue} />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="container-page py-6 md:py-10"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Bell className="h-3 w-3" />
              Reminders
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              Your medication schedule
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay on track with smart reminders and gentle nudges.
            </p>
          </div>
          <Button
            onClick={syncToday}
            disabled={syncing}
            className="bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Today
          </Button>
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Today" value={stats.total} tone="primary" />
          <StatCard label="Taken" value={stats.taken} tone="success" />
          <StatCard label="Pending" value={stats.pending} tone="warning" />
          <StatCard label="Overdue" value={stats.overdue} tone="destructive" />
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "today" | "history")}
          className="mt-8"
        >
          <TabsList className="rounded-2xl bg-background p-1 shadow-soft">
            <TabsTrigger value="today" className="rounded-xl px-4">
              <CalendarDays className="mr-1.5 h-4 w-4" /> Today
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl px-4">
              <HistoryIcon className="mr-1.5 h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="mt-5">
            {loadingToday ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-3xl" />
                ))}
              </div>
            ) : !today || today.length === 0 ? (
              <EmptyState
                title="No reminders for today"
                desc="Tap “Sync Today” to generate today's schedule from your active medicines."
                action={
                  <Button
                    onClick={syncToday}
                    disabled={syncing}
                    className="bg-gradient-primary text-primary-foreground shadow-cta"
                  >
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sync Today
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {today.map((r, i) => (
                    <motion.div
                      key={r.log_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <TodayCard
                        r={r}
                        acting={actingId === r.log_id}
                        onTake={() => updateStatus(r.log_id, "taken")}
                        onSkip={() => updateStatus(r.log_id, "skipped")}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="mt-5">
            <div className="mb-4 flex items-center gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setHistoryDays(d as 7 | 14 | 30)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-smooth ${
                    historyDays === d
                      ? "bg-gradient-primary text-primary-foreground shadow-cta"
                      : "border border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-3xl" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <EmptyState
                title="No history yet"
                desc="Your past doses will appear here once you start taking medicines."
              />
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <motion.div
                    key={h.log_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-4 shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {h.medicine_name}
                          {h.strength ? (
                            <span className="text-muted-foreground"> · {h.strength}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(h.scheduled_time)} · {formatTime(h.scheduled_time)}
                          {h.action_time
                            ? ` · acted ${formatTime(h.action_time)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyle(h.status)}`}
                    >
                      {h.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    primary: "from-primary to-primary-glow text-primary-foreground",
    success: "from-success to-success/80 text-success-foreground",
    warning: "from-warning to-warning/80 text-warning-foreground",
    destructive: "from-destructive to-destructive/80 text-destructive-foreground",
  }[tone];
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between">
        <p className="font-display text-3xl font-bold text-foreground">{value}</p>
        <div
          className={`h-9 w-9 rounded-xl bg-gradient-to-br ${toneCls} shadow-soft`}
          aria-hidden
        />
      </div>
    </div>
  );
}

function TodayCard({
  r,
  acting,
  onTake,
  onSkip,
}: {
  r: TodayReminder;
  acting: boolean;
  onTake: () => void;
  onSkip: () => void;
}) {
   const overdue     = r.status === "pending" && new Date(r.scheduled_time).getTime() < Date.now();
  const isHighRisk  = r.risk_level === "high";
  return (
    <div
      className={`rounded-3xl border bg-gradient-card p-4 shadow-card md:p-5 ${
    overdue      ? "border-destructive/40" :
    isHighRisk   ? "border-destructive/20 ring-1 ring-destructive/20" :
    "border-border/60"
  }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta">
            <Pill className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">
              {r.medicine_name}
              {r.strength ? (
                <span className="font-medium text-muted-foreground"> · {r.strength}</span>
              ) : null}
            </p>
            {/* ML Risk + Early badges */}
            {(r.risk_level && r.risk_level !== "low") || r.early_by_minutes ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <RiskBadge level={r.risk_level} probability={r.miss_probability} />
                <EarlyBadge minutes={r.early_by_minutes} />
              </div>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(r.scheduled_time)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Utensils className="h-3.5 w-3.5" />
                {r.before_meal ? "Before meal" : "After meal"}
              </span>
              {overdue && (
                <span className="inline-flex items-center gap-1 font-bold text-destructive">
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyle(r.status)}`}
          >
            {r.status}
          </span>
          {r.status === "pending" && new Date(r.scheduled_time).getTime() <= Date.now() && (
            <>
              <Button
                size="sm"
                onClick={onTake}
                disabled={acting}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mark Taken
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSkip}
                disabled={acting}
                className="border-border/60"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-background/60 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-lavender">
        <Bell className="h-6 w-6 text-lavender-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function RiskBadge({
  level,
  probability,
}: {
  level?: "low" | "medium" | "high";
  probability?: number;
}) {
  if (!level || level === "low") return null;

  const config = {
    medium: {
      className: "bg-warning/15 text-warning border border-warning/30",
      label:     "Medium Risk",
    },
    high: {
      className: "bg-destructive/15 text-destructive border border-destructive/30",
      label:     "High Risk",
    },
  } as const;

  const cfg = config[level];
  const pct = probability !== undefined ? ` · ${Math.round(probability * 100)}%` : "";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.className}`}>
      {level === "high" ? "⚠️" : "🔔"} {cfg.label}{pct}
    </span>
  );
}

function EarlyBadge({ minutes }: { minutes?: number }) {
  if (!minutes || minutes === 0) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
      ⏰ Sent {minutes}m early
    </span>
  );
}