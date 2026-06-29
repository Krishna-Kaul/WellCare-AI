import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  LogOut,
  Loader2,
  Pill,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { clearPrefs, loadPrefs, type UserPrefs } from "@/lib/user-prefs";
import { clearAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — WellCare AI" },
      {
        name: "description",
        content:
          "Personalized WellCare AI dashboard for patients, caregivers, and doctors. Track adherence, alerts, and patient analytics.",
      },
      { property: "og:title", content: "Your WellCare AI Dashboard" },
      {
        property: "og:description",
        content: "Tailored healthcare command center — for patients, caregivers, and clinics.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    setHydrated(true);
    if (!p) {
      navigate({ to: "/onboarding" });
    }
  }, [navigate]);

  if (!hydrated || !prefs) {
    return (
      <div className="min-h-screen bg-mist">
        <div className="container-page flex h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
            Loading your dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden h-9 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-sm text-muted-foreground hover:bg-muted sm:flex"
            >
              <Search className="h-4 w-4" />
              Search…
            </button>
            <nav className="hidden md:flex items-center gap-1 mr-1">
              {prefs.role === "patient" && (
                <>
                  <Link to="/patient/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Dashboard</Link>
                  <Link to="/medications" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Medicines</Link>
                  <Link to="/prescriptions" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Prescriptions</Link>
                  <Link to="/reminders" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Reminders</Link>
                </>
              )}
              {prefs.role === "doctor" && (
                <Link to="/doctor" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Doctor Dashboard</Link>
              )}
              {prefs.role === "caregiver" && (
                <Link to="/caregiver" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Caregiver Dashboard</Link>
              )}
            </nav>
            <Link
              to="/reminders"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground hover:bg-muted"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="Go back"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                clearPrefs();
                clearAuth();
                toast.success("Signed out");
                navigate({ to: "/" });
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-foreground/5 px-3 text-sm font-medium text-foreground hover:bg-foreground/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-page py-6 md:py-10">
        <WelcomeBanner prefs={prefs} />

        <div className="mt-6">
          {prefs.role === "patient" && <PatientDashboard prefs={prefs} />}
          {prefs.role === "caregiver" && <CaregiverDashboard prefs={prefs} />}
          {prefs.role === "doctor" && <DoctorDashboard prefs={prefs} />}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">This is a personalized preview.</p>
              <p className="text-sm text-muted-foreground">
                Update your preferences anytime to see the dashboard adapt.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/onboarding">
              Re-run onboarding
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

function WelcomeBanner({ prefs }: { prefs: UserPrefs }) {
  const first = prefs.name.split(" ")[0] || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const roleLabel =
    prefs.role === "doctor"
      ? "Clinic mode"
      : prefs.role === "caregiver"
        ? "Caregiver mode"
        : "Patient mode";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-primary p-6 text-primary-foreground shadow-elevated md:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {prefs.role === "doctor" && <Stethoscope className="h-3.5 w-3.5" />}
            {prefs.role === "caregiver" && <Users className="h-3.5 w-3.5" />}
            {prefs.role === "patient" && <Heart className="h-3.5 w-3.5" />}
            {roleLabel}
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">
            {greeting}, {first} 👋
          </h1>
          <p className="mt-1 max-w-xl text-sm text-primary-foreground/90 md:text-base">
            {prefs.role === "patient" &&
              "Here's your medication day — stay on track and we'll handle the rest."}
            {prefs.role === "caregiver" &&
              `Watching over ${prefs.patientName || "your loved one"}. Latest activity is below.`}
            {prefs.role === "doctor" &&
              `${prefs.clinicName || "Your clinic"} — here are today's compliance highlights.`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
            Today
          </p>
          <p className="font-display text-xl font-bold">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function PatientDashboard({ prefs }: { prefs: UserPrefs }) {
  const meds = [
    { time: "8:00 AM", name: "Metformin 500mg", note: "After breakfast", taken: true },
    { time: "1:00 PM", name: "Atorvastatin 10mg", note: "With lunch", taken: true },
    { time: "8:00 PM", name: "Losartan 50mg", note: "After dinner", taken: false, next: true },
    { time: "10:00 PM", name: "Vitamin D3", note: "Bedtime", taken: false },
  ];
  const taken = meds.filter((m) => m.taken).length;
  const pct = Math.round((taken / meds.length) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <p className="text-sm font-semibold text-muted-foreground">Today's adherence</p>
          <ProgressRing pct={pct} />
          <p className="mt-3 font-display text-lg font-bold text-foreground">
            {taken} of {meds.length} doses
          </p>
          <p className="text-sm text-muted-foreground">
            Next: <span className="font-semibold text-foreground">Losartan at 8:00 PM</span>
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-cta hover:opacity-95"
          >
            <Check className="h-4 w-4" />
            Mark next as taken
          </button>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          icon={Pill}
          title="Today's medicine schedule"
          subtitle={`Reminders in ${labelForLang(prefs.language)} · ${labelForTone(prefs.reminderTone)} tone`}
        />
        <ul className="mt-4 space-y-2">
          {meds.map((m) => (
            <li
              key={m.name}
              className={[
                "flex items-center gap-3 rounded-2xl border p-3",
                m.taken
                  ? "border-success/30 bg-success/5"
                  : m.next
                    ? "border-primary/40 bg-primary/5 ring-2 ring-primary/15"
                    : "border-border/60 bg-background",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  m.taken
                    ? "bg-success text-success-foreground"
                    : m.next
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {m.taken ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.note}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{m.time}</p>
                <p
                  className={[
                    "text-xs font-medium",
                    m.taken ? "text-success" : m.next ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {m.taken ? "Taken" : m.next ? "Up next" : "Scheduled"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader icon={TrendingUp} title="Weekly adherence" subtitle="Last 7 days" />
        <WeeklyChart data={[88, 92, 76, 100, 95, 70, pct]} />
      </Card>

      <Card>
        <CardHeader icon={Activity} title="Health profile" />
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Conditions</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(prefs.conditions?.length ? prefs.conditions : ["No conditions added"]).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-warning">
              <Bell className="h-3.5 w-3.5" /> Refill alert
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">Metformin runs out in 4 days</p>
            <button className="mt-2 text-xs font-semibold text-primary hover:underline">
              Order refill →
            </button>
          </div>
          {prefs.caregiverPhone && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary">Caregiver linked</p>
              <p className="mt-1 text-sm font-medium text-foreground">+91 {prefs.caregiverPhone}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function CaregiverDashboard({ prefs }: { prefs: UserPrefs }) {
  const patientName = prefs.patientName || "Your loved one";
  const events = [
    { time: "8:02 AM", text: `${patientName} took Metformin 500mg`, ok: true },
    { time: "1:05 PM", text: `${patientName} took Atorvastatin 10mg`, ok: true },
    { time: "8:00 PM", text: `Reminder sent — Losartan 50mg`, ok: true, pending: true },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1 bg-gradient-lavender">
        <p className="text-xs font-semibold uppercase text-lavender-foreground">Caring for</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">{patientName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Adherence" value="92%" tone="success" />
          <Stat label="Missed (7d)" value="2" tone="warning" />
        </div>
        <div className="mt-4 rounded-2xl bg-background/70 p-3 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Alert channels</p>
          <p className="mt-1 text-sm font-semibold text-foreground capitalize">
            {prefs.alertChannels?.join(" · ") || "push"}
          </p>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader icon={Activity} title="Activity feed" subtitle="Live updates from today" />
        <ul className="mt-4 space-y-2">
          {events.map((e, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
            >
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  e.pending ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
                ].join(" ")}
              >
                {e.pending ? <Clock className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{e.text}</p>
                <p className="text-xs text-muted-foreground">{e.time}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader icon={AlertTriangle} title="Risk insights" />
        <div className="mt-3 space-y-3">
          <RiskRow label="Evening dose adherence" value={68} tone="warning" />
          <RiskRow label="Morning dose adherence" value={96} tone="success" />
          <RiskRow label="Refill timeliness" value={82} tone="primary" />
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader icon={Calendar} title="Upcoming reminders" />
        <ul className="mt-3 space-y-2">
          {[
            { t: "8:00 PM", n: "Losartan 50mg", note: "Tonight" },
            { t: "8:00 AM", n: "Metformin 500mg", note: "Tomorrow" },
            { t: "Mon", n: "Refill: Atorvastatin", note: "3 days left" },
          ].map((u) => (
            <li
              key={u.n}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{u.n}</p>
                  <p className="text-xs text-muted-foreground">{u.note}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">{u.t}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function DoctorDashboard({ prefs: _prefs }: { prefs: UserPrefs }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/doctor" });
  }, [navigate]);
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "rounded-3xl border border-border/60 bg-background p-5 shadow-soft",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Heart;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-display text-base font-bold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 56;
  const c = 2 * Math.PI * radius;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative mt-3 h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} className="fill-none stroke-muted" strokeWidth="12" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          className="fill-none stroke-[hsl(var(--success))]"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl font-bold text-foreground">{pct}%</p>
        <p className="text-xs font-semibold text-muted-foreground">on track</p>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: number[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="mt-3 flex h-44 items-end gap-3">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-xl bg-muted">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${v}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
              className={[
                "w-full rounded-xl",
                v >= 90 ? "bg-gradient-primary" : v >= 75 ? "bg-success" : "bg-warning",
              ].join(" ")}
            />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "primary";
}) {
  const color =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <div className="rounded-2xl bg-background/70 p-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RiskRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "primary";
}) {
  const bar = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}%</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const cfg = {
    low: "bg-success/15 text-success",
    medium: "bg-warning/15 text-warning",
    high: "bg-destructive/15 text-destructive",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cfg[risk]}`}
    >
      {risk}
    </span>
  );
}

function labelForLang(l: string) {
  if (l === "hi") return "Hindi";
  if (l === "hi-en") return "Hinglish";
  return "English";
}
function labelForTone(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
