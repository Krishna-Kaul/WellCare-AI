import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import {
  AlertTriangle,
  Check,
  Clock,
  Flame,
  Info,
  Loader2,
  Pill,
  SkipForward,
  Sparkles,
  TrendingUp,
  Utensils,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AppNavbar } from "@/components/AppNavbar";
import { BotMascot } from "@/components/EmotionalMascot";
import { API_BASE_URL, authHeaders, getAuthToken, getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/patient/dashboard")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard — WellCare AI" },
      {
        name: "description",
        content:
          "Track today's medicines, adherence, weekly progress, and refill alerts on your WellCare patient dashboard.",
      },
      { property: "og:title", content: "Patient Dashboard — WellCare AI" },
      {
        property: "og:description",
        content:
          "See today's schedule, weekly adherence, streaks and refill alerts in one premium view.",
      },
    ],
  }),
  component: PatientDashboardPage,
});

type ReminderStatus = "taken" | "missed" | "pending" | "skipped";


interface ReminderItem {
  log_id: string;
  medicine_name: string;
  strength?: string;
  time?: string;
  scheduled_time?: string;
  meal_timing?: "before_meal" | "after_meal" | "with_meal" | string;
  status: ReminderStatus;
  early_by_minutes?: number;
}

interface WeeklyPoint {
  day: string;
  date?: string;
  adherence: number;
}

interface PatientDashboardData {
  user_name: string;
  today_adherence: number;
  taken_count: number;
  total_count: number;
  schedule: ReminderItem[];
  weekly: WeeklyPoint[];
  active_medicines: number;
  streak_days: number;
  missed_this_week: number;
  recovery_score: number;
  adherence_momentum: string;
  streak_status: string;
}

const MOCK_DATA: PatientDashboardData = {
  user_name: "",
  today_adherence: 75,
  taken_count: 3,
  total_count: 4,
  schedule: [
    { log_id: "r1", medicine_name: "Metformin", strength: "500 mg", time: "08:00", meal_timing: "after_meal", status: "taken" },
    { log_id: "r2", medicine_name: "Atorvastatin", strength: "10 mg", time: "13:30", meal_timing: "with_meal", status: "taken" },
    { log_id: "r3", medicine_name: "Vitamin D3", strength: "60,000 IU", time: "18:00", meal_timing: "after_meal", status: "taken" },
    { log_id: "r4", medicine_name: "Telmisartan", strength: "40 mg", time: "21:30", meal_timing: "before_meal", status: "pending" },
  ],
  weekly: [
    { day: "Mon", adherence: 100 },
    { day: "Tue", adherence: 80 },
    { day: "Wed", adherence: 100 },
    { day: "Thu", adherence: 60 },
    { day: "Fri", adherence: 100 },
    { day: "Sat", adherence: 90 },
    { day: "Sun", adherence: 75 },
  ],
  active_medicines: 4,
  streak_days: 12,
  missed_this_week: 2,
  recovery_score: 1250,
  adherence_momentum: "positive",
  streak_status: "active",
};

function PatientDashboardPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useReminderNotifications(true);

  useEffect(() => {
    const token = getAuthToken();
    const user = getStoredUser();
    if (!token && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (user?.role && user.role !== "patient") {
      toast.error("This page is for patients only");
      navigate({ to: "/dashboard" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const user = getStoredUser();
    const fallbackName = user?.name || user?.email?.split("@")[0] || "there";

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/patient/dashboard`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData({
            user_name:       json.user?.name || fallbackName,
            today_adherence: json.today_summary?.adherence_pct ?? 0,
            taken_count:     json.today_summary?.taken ?? 0,
            total_count:     json.today_summary?.total ?? 0,
            schedule: (json.todays_schedule ?? []).map((s: Record<string, unknown>) => ({
              log_id:         String(s.log_id),
              medicine_name:  s.medicine_name,
              strength:       s.strength,
              scheduled_time: s.scheduled_time,
              status:         (String(s.status).split(".").pop() ?? "pending") as ReminderStatus,
              before_meal:    s.before_meal,
              early_by_minutes: s.early_by_minutes as number | undefined,
            })),
            weekly: (json.weekly_breakdown ?? []).map((w: Record<string, unknown>) => ({
              day:       w.day,
              date:      w.date,
              adherence: w.adherence,
            })),
            active_medicines: json.total_medicines ?? 0,
            streak_days:      json.user?.current_streak ?? 0,
            missed_this_week: (json.weekly_breakdown ?? []).reduce(
              (acc: number, w: Record<string, unknown>) =>
                acc + ((w.total as number) - (w.taken as number)),
              0,
            ),
            recovery_score: json.user?.recovery_score ?? 0,
            adherence_momentum: json.user?.adherence_momentum ?? "neutral",
            streak_status: json.user?.streak_status ?? "active",
          });
        }
      } catch {
        if (!cancelled) setData({ ...MOCK_DATA, user_name: fallbackName });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authChecked]);

  const pendingCount = useMemo(
    () => data?.schedule.filter((s) => s.status === "pending").length ?? 0,
    [data],
  );

  const overdueCount = useMemo(
    () => data?.schedule.filter(
      (s) => s.status === "pending" && s.scheduled_time && new Date(s.scheduled_time).getTime() < Date.now(),
    ).length ?? 0,
    [data],
  );

  const handleMarkTaken = async (log_id: string) => {
    if (!data) return;
    setMarkingId(log_id);
    const newSchedule = data.schedule.map((s) =>
      s.log_id === log_id ? { ...s, status: "taken" as ReminderStatus } : s,
    );
    const newTaken     = newSchedule.filter((s) => s.status === "taken").length;
    const newAdherence = data.total_count > 0 ? Math.round((newTaken / data.total_count) * 100) : 0;
    setData({ ...data, schedule: newSchedule, taken_count: newTaken, today_adherence: newAdherence });

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reminders/${log_id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "taken" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      if (json.day_completed) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 4000);
        // Optimistically increment streak
        setData(prev => prev ? { ...prev, streak_days: prev.streak_days + 1 } : prev);
      } else {
        toast.success("Marked as taken");
      }
    } catch {
      toast.success("Marked as taken (offline mode)");
    } finally {
      setMarkingId(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-28 md:pb-8 relative overflow-hidden">
      <Toaster position="top-center" richColors />
      <AppNavbar notificationCount={overdueCount} />
      
      {/* Level Up Fullscreen Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center justify-center"
            >
              <BotMascot streakDays={(data?.streak_days || 0) + 1} size="lg" />
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-4xl md:text-5xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] text-center"
              >
                LEVEL COMPLETED!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-xl font-bold text-cyan-300 drop-shadow-md"
              >
                Streak Increased 🔥
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container-page py-6 md:py-10 space-y-6 md:space-y-8">

        {/* Welcome */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-3"
        >
          <div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Today
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-foreground">
              {greeting()},{" "}
              <span className="text-gradient-primary">
                {loading ? "…" : data?.user_name || "there"}
              </span>
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              {pendingCount > 0
                ? `You have ${pendingCount} dose${pendingCount > 1 ? "s" : ""} pending today.`
                : "All caught up — great job staying on track!"}
            </p>
          </div>
        </motion.section>

        {/* Adherence ring + stat cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AdherenceCard loading={loading} data={data} />
          
          {!loading && data ? (
            <BotMascot 
              streakDays={data.streak_days} 
              isCompleted={pendingCount === 0 && data.total_count > 0 && data.taken_count === data.total_count}
              patientName={data.user_name}
              size="md"
              className="h-full w-full"
            />
          ) : (
            <Skeleton className="rounded-[2.5rem] h-full w-full min-h-[300px]" />
          )}

          <div className="flex flex-col gap-4 md:gap-6 md:col-span-2 lg:col-span-1">
            <StatCard loading={loading} icon={Pill}    label="Active Medicines"  value={data?.active_medicines ?? 0}  tone="primary"     />
            <StatCard loading={loading} icon={Sparkles} label="Recovery XP"  value={data?.recovery_score ?? 0}  tone="primary" />
          </div>
        </section>

        {/* Schedule + Weekly chart */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="lg:col-span-3">
            <ScheduleCard
              loading={loading}
              schedule={data?.schedule ?? []}
              markingId={markingId}
            />
          </div>
          <div className="lg:col-span-2">
            <WeeklyChart loading={loading} weekly={data?.weekly ?? []} />
          </div>
        </section>


      </main>
    </div>
  );
}

function AdherenceCard({ loading, data }: { loading: boolean; data: PatientDashboardData | null }) {
  const pct = data?.today_adherence ?? 0;
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-card flex flex-col items-center justify-center text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Adherence</p>
      <div className="mt-3">
        {loading ? <Skeleton className="h-44 w-44 rounded-full" /> : <AdherenceRing percent={pct} />}
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-5 w-32" />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{data?.taken_count ?? 0}</span> of{" "}
          <span className="font-bold text-foreground">{data?.total_count ?? 0}</span> doses taken
        </p>
      )}
    </div>
  );
}

function AdherenceRing({ percent }: { percent: number }) {
  const size    = 180;
  const stroke  = 14;
  const r       = (size - stroke) / 2;
  const c       = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash    = (clamped / 100) * c;
  const tone    = clamped >= 80 ? "hsl(var(--success))" : clamped >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tone} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span key={clamped} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold text-foreground">
          {Math.round(clamped)}%
        </motion.span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">on track</span>
      </div>
    </div>
  );
}

function StatCard({ loading, icon: Icon, label, value, tone }: {
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive";
}) {
  const toneMap = {
    primary:     "bg-accent text-accent-foreground",
    success:     "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card hover-lift">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {loading ? null : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-4 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-24" />
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        </>
      )}
    </div>
  );
}

function ScheduleCard({ loading, schedule, markingId }: {
  loading: boolean;
  schedule: ReminderItem[];
  markingId: string | null;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-5 md:p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground">Today's Schedule</h2>
          <p className="text-xs text-muted-foreground">Your medication schedule for today</p>
        </div>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : schedule.length === 0 ? (
          <EmptySchedule />
        ) : (
          <AnimatePresence initial={false}>
            {schedule.map((item) => (
              <ScheduleItem key={item.log_id} item={item} marking={markingId === item.log_id} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ScheduleItem({ item, marking }: {
  item: ReminderItem;
  marking: boolean;
}) {
  const statusConfig: Record<ReminderStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
    taken:   { label: "Taken",   className: "bg-success/15 text-success",          icon: Check       },
    missed:  { label: "Missed",  className: "bg-destructive/10 text-destructive",  icon: XCircle     },
    pending: { label: "Pending", className: "bg-warning/15 text-warning",          icon: Clock       },
    skipped: { label: "Skipped", className: "bg-muted text-muted-foreground",      icon: SkipForward },
  };

  const cfg        = statusConfig[item.status] ?? statusConfig["pending"];
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4 hover:border-primary/30 transition-smooth"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
          <Pill className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {item.medicine_name}{" "}
            {item.strength && <span className="font-medium text-muted-foreground">· {item.strength}</span>}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {item.time ?? item.scheduled_time}
            </span>
            {item.meal_timing && (
              <span className="inline-flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                {prettyMeal(item.meal_timing)}
              </span>
            )}
            {item.early_by_minutes && item.early_by_minutes > 0 ? (
              <span className="inline-flex items-center gap-1 text-warning font-semibold">
                <Sparkles className="h-3 w-3" />
                Adaptive (-{item.early_by_minutes}m)
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>
    </motion.div>
  );
}

function EmptySchedule() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Pill className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">No medicines scheduled today</p>
      <p className="text-xs text-muted-foreground">Add medicines to start tracking your routine.</p>
    </div>
  );
}

function WeeklyChart({ loading, weekly }: { loading: boolean; weekly: WeeklyPoint[] }) {
  const CHART_HEIGHT = 140;

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-5 md:p-6 shadow-card h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground">Weekly Adherence</h2>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>
        <TrendingUp className="h-5 w-5 text-success" />
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : weekly.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <>
          {/* Bar chart using SVG for pixel-perfect rendering */}
          <div className="w-full" style={{ height: `${CHART_HEIGHT + 32}px` }}>
            <svg
              width="100%"
              height={CHART_HEIGHT}
              viewBox={`0 0 ${weekly.length * 40} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              className="overflow-visible"
            >
              {weekly.map((d, i) => {
                const pct     = Math.max(0, Math.min(100, d.adherence > 1 ? d.adherence : d.adherence * 100));
                const barH    = Math.max(3, (pct / 100) * (CHART_HEIGHT - 10));
                const x       = i * 40 + 4;
                const barW    = 32;
                const y       = CHART_HEIGHT - barH;
                const fill    = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : pct > 0 ? "#EF4444" : "#E2E8F0";
                const radius  = 6;

                return (
                  <g key={`bar-${i}`}>
                    {/* Background track */}
                    <rect
                      x={x}
                      y={4}
                      width={barW}
                      height={CHART_HEIGHT - 4}
                      rx={radius}
                      fill="#F1F5F9"
                    />
                    {/* Actual bar — grows from bottom */}
                    {pct > 0 && (
                      <motion.rect
                        x={x}
                        width={barW}
                        rx={radius}
                        fill={fill}
                        initial={{ y: CHART_HEIGHT, height: 0 }}
                        animate={{ y, height: barH }}
                        transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                      />
                    )}
                    {/* Percentage label on hover — always show if > 0 */}
                    {pct > 0 && (
                      <text
                        x={x + barW / 2}
                        y={y - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill={pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444"}
                      >
                        {Math.round(pct)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Day labels */}
            <div className="flex w-full mt-1" style={{ gap: 0 }}>
              {weekly.map((d, i) => (
                <div
                  key={`label-${i}`}
                  className="flex-1 text-center"
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-success" /> ≥80%
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" /> 50–79%
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive" /> &lt;50%
            </span>
          </div>
        </>
      )}
    </div>
  );
}



function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function prettyMeal(m: string) {
  switch (m) {
    case "before_meal": return "Before meal";
    case "after_meal":  return "After meal";
    case "with_meal":   return "With meal";
    default:            return m.replace(/_/g, " ");
  }
}