import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  Download,
  FileText,
  Loader2,
  Pill,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNavbar } from "@/components/AppNavbar";
import {
  API_BASE_URL,
  authHeaders,
  getAuthToken,
  getStoredUser,
} from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard â€” WellCare AI" },
      {
        name: "description",
        content:
          "Monitor your patients' adherence, risk levels and refill alerts. Link new patients and export reports.",
      },
      { property: "og:title", content: "Doctor Dashboard â€” WellCare AI" },
      {
        property: "og:description",
        content:
          "Patient monitoring, risk scoring, alerts and exports â€” built for clinicians.",
      },
    ],
  }),
  component: DoctorDashboardPage,
});

/* -------------------- Types -------------------- */

type Risk = "high" | "medium" | "low";
type AlertSeverity = "high" | "medium";

interface Patient {
  id: string;
  name: string;
  email: string;
  adherence: number; // 0-100
  risk: Risk;
}

interface DoctorDashboardData {
  doctor_name: string;
  total_patients: number;
  at_risk_patients: number;
  overall_adherence: number;
  active_alerts: number;
  patients: Patient[];
  alerts: DoctorAlert[];
}

interface DoctorAlert {
  id: string;
  patient_id?: string;
  patient_name: string;
  message: string;
  severity: AlertSeverity;
  created_at?: string;
}

interface MissedDoseAlert {
  id: number;
  patient_id: number;
  patient_name: string;
  medication_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface PatientMedication {
  id: string;
  name: string;
  strength: string;
  timing: string[];
  before_meal?: boolean;
  is_active: boolean;
}

interface AdherencePoint {
  day: string;
  adherence: number;
}

interface ReminderItem {
  id: string;
  medicine_name: string;
  strength?: string;
  scheduled_time: string;
  meal_timing?: "before" | "after" | "with" | string;
  status: "taken" | "missed" | "pending" | string;
  is_adaptive?: boolean;
  early_by_minutes?: number;
  snooze_count?: number;
}

/* -------------------- Mock fallback -------------------- */

const MOCK: DoctorDashboardData = {
  doctor_name: "",
  total_patients: 24,
  at_risk_patients: 5,
  overall_adherence: 82,
  active_alerts: 7,
  patients: [
    { id: "p1", name: "Aarav Sharma", email: "aarav@example.com", adherence: 92, risk: "low" },
    { id: "p2", name: "Priya Patel", email: "priya@example.com", adherence: 64, risk: "high" },
    { id: "p3", name: "Rohan Mehta", email: "rohan@example.com", adherence: 78, risk: "medium" },
    { id: "p4", name: "Ishita Rao", email: "ishita@example.com", adherence: 55, risk: "high" },
    { id: "p5", name: "Vikram Singh", email: "vikram@example.com", adherence: 88, risk: "low" },
    { id: "p6", name: "Sara Khan", email: "sara@example.com", adherence: 71, risk: "medium" },
  ],
  alerts: [
    {
      id: "a1",
      patient_id: "p2",
      patient_name: "Priya Patel",
      message: "Missed 4 doses in the past 3 days.",
      severity: "high",
    },
    {
      id: "a2",
      patient_id: "p4",
      patient_name: "Ishita Rao",
      message: "Adherence dropped below 60% this week.",
      severity: "high",
    },
    {
      id: "a3",
      patient_id: "p3",
      patient_name: "Rohan Mehta",
      message: "Refill due in 3 days for Metformin.",
      severity: "medium",
    },
    {
      id: "a4",
      patient_id: "p6",
      patient_name: "Sara Khan",
      message: "Two missed evening doses this week.",
      severity: "medium",
    },
  ],
};

const MOCK_MEDS: PatientMedication[] = [
  { id: "m1", name: "Metformin", strength: "500 mg", timing: ["morning", "evening"], before_meal: false, is_active: true },
  { id: "m2", name: "Telmisartan", strength: "40 mg", timing: ["night"], before_meal: true, is_active: true },
  { id: "m3", name: "Atorvastatin", strength: "10 mg", timing: ["night"], before_meal: false, is_active: true },
];

const MOCK_ADHERENCE: AdherencePoint[] = [
  { day: "Mon", adherence: 90 },
  { day: "Tue", adherence: 75 },
  { day: "Wed", adherence: 100 },
  { day: "Thu", adherence: 60 },
  { day: "Fri", adherence: 80 },
  { day: "Sat", adherence: 95 },
  { day: "Sun", adherence: 70 },
];

/* -------------------- Page -------------------- */

function DoctorDashboardPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [missedAlerts, setMissedAlerts] = useState<MissedDoseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<Patient | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/doctor/patients/${unlinkTarget.id}/unlink`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok && res.status !== 204) throw new Error();
      setData((prev) => prev ? {
        ...prev,
        total_patients: prev.total_patients - 1,
        patients: prev.patients.filter((p) => p.id !== unlinkTarget.id),
      } : prev);
      toast.success(`${unlinkTarget.name} unlinked`);
    } catch {
      toast.error("Could not unlink patient. Please try again.");
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    const user = getStoredUser();
    if (!token && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (user?.role && user.role !== "doctor") {
      toast.error("This page is for doctors only");
      navigate({ to: "/dashboard" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    const user = getStoredUser();
    const fallbackName = user?.name || user?.email?.split("@")[0] || "Doctor";

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/doctor/dashboard`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const patients = (json.patients ?? []).map((p: any) => ({
            id: String(p.patient_id ?? p.id ?? ""),
            name: p.patient_name ?? p.name ?? "Unknown",
            email: p.email ?? "",
            adherence: typeof p.adherence === "number" ? p.adherence : 0,
            risk: p.at_risk === true ? "high" : p.adherence < 70 ? "medium" : "low" as Risk,
          }));
          setData({
            doctor_name: json.doctor?.name ?? json.doctor_name ?? fallbackName,
            total_patients: patients.length,
            at_risk_patients: json.summary?.at_risk_patients ?? patients.filter((p: any) => p.risk === "high").length,
            overall_adherence: json.summary?.overall_adherence ?? (patients.length > 0 ? Math.round(patients.reduce((a: number, p: any) => a + p.adherence, 0) / patients.length) : 0),
            active_alerts: json.summary?.active_alerts ?? (json.alerts?.length ?? 0),
            patients,
            alerts: (json.alerts ?? []).map((a: any) => ({
              id: String(a.patient_id ?? a.id ?? Math.random()),
              patient_name: a.patient_name ?? "",
              message: a.missed_doses ? `${a.missed_doses} missed doses` : a.message ?? "",
              severity: (a.risk_level === "high" || a.severity === "high") ? "high" : "medium" as AlertSeverity,
              created_at: a.created_at ?? new Date().toISOString(),
            })),
          });
        }
      } catch {
        if (!cancelled) setData({ ...MOCK, doctor_name: fallbackName });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Load missed dose alerts
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/doctor/my-alerts`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const alerts = await res.json();
        if (!cancelled) {
          setMissedAlerts(alerts);
        }
      } catch {
        // silently ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.patients;
    return data.patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-28 md:pb-8">
      <Toaster position="top-center" richColors />
      <AppNavbar notificationCount={data?.active_alerts ?? 0} />

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
            <p className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-success">
              <Sparkles className="h-3 w-3" /> Clinical View
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-foreground">
              Welcome back, Dr.{" "}
              <span className="text-gradient-primary">
                {loading ? "â€¦" : data?.doctor_name || "Doctor"}
              </span>
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              {data?.at_risk_patients ?? 0} patients need your attention today.
            </p>
          </div>
          <Button
            onClick={() => setLinkOpen(true)}
            className="rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" /> Link Patient
          </Button>
        </motion.section>

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard loading={loading} icon={Users} label="Total Patients" value={data?.total_patients ?? 0} tone="primary" />
          <StatCard loading={loading} icon={AlertTriangle} label="At-Risk Patients" value={data?.at_risk_patients ?? 0} tone="destructive" />
          <StatCard loading={loading} icon={TrendingUp} label="Overall Adherence" value={`${data?.overall_adherence ?? 0}%`} tone="success" />
          <StatCard loading={loading} icon={Bell} label="Active Alerts" value={data?.active_alerts ?? 0} tone="warning" />
        </section>

        {/* Patients table */}
        <section className="rounded-3xl border border-border/60 bg-gradient-card p-5 md:p-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                Your Patients
              </h2>
              <p className="text-xs text-muted-foreground">
                Tap a row to see medicines, adherence trends, and exports
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email"
                className="pl-9 rounded-xl bg-background/70"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 items-center gap-3 bg-mist px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">Patient</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Adherence</div>
                <div className="col-span-2">Risk</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y divide-border/60 bg-background/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 px-4 py-4">
                      <Skeleton className="col-span-4 h-5" />
                      <Skeleton className="col-span-3 h-5" />
                      <Skeleton className="col-span-2 h-5" />
                      <Skeleton className="col-span-2 h-5" />
                      <Skeleton className="col-span-1 h-5" />
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <EmptyState query={query} />
                ) : (
                  filtered.map((p) => (
                    <div
                      key={p.id}
                      className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3.5 hover:bg-accent/40"
                    >
                      <button
                        onClick={() => setSelected(p)}
                        className="col-span-4 flex items-center gap-3 min-w-0 text-left"
                      >
                        <Avatar name={p.name} />
                        <span className="truncate text-sm font-bold text-foreground">{p.name}</span>
                      </button>
                      <button onClick={() => setSelected(p)} className="col-span-3 truncate text-sm text-muted-foreground text-left">{p.email}</button>
                      <button onClick={() => setSelected(p)} className="col-span-2">
                        <AdherencePill value={p.adherence} />
                      </button>
                      <button onClick={() => setSelected(p)} className="col-span-2">
                        <RiskBadge risk={p.risk} />
                      </button>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => setUnlinkTarget(p)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Unlink patient"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/60 bg-background/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="m-3 h-20 rounded-xl" />
                ))
              ) : filtered.length === 0 ? (
                <EmptyState query={query} />
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    className="flex w-full items-center gap-3 p-3.5 hover:bg-accent/40"
                  >
                    <button onClick={() => setSelected(p)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                      <Avatar name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <AdherencePill value={p.adherence} />
                          <RiskBadge risk={p.risk} />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setUnlinkTarget(p)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Alerts */}
        <AlertsSection loading={loading} alerts={data?.alerts ?? []} missedAlerts={missedAlerts} />
      </main>

      {/* Patient detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <PatientDetail patient={selected} />}
        </SheetContent>
      </Sheet>

      {/* Link patient dialog */}
      <LinkPatientSheet
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onLinked={(patient) => {
          if (data) {
            setData({
              ...data,
              total_patients: data.total_patients + 1,
              patients: [patient, ...data.patients],
            });
          }
        }}
      />

      {/* Unlink confirmation dialog */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {unlinkTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {unlinkTarget?.name} from your patient panel. You can re-link them later using their patient ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function StatCard({
  loading,
  icon: Icon,
  label,
  value,
  tone,
}: {
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "destructive" | "warning";
}) {
  const toneMap = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning",
  } as const;
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card hover-lift">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "P";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-primary-foreground">
      {initials}
    </div>
  );
}

function AdherencePill({ value }: { value: number }) {
  const good = value >= 70;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        good ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      {Math.round(value)}%
    </span>
  );
}

function RiskBadge({ risk }: { risk: Risk | string | undefined }) {
  const cfg: Record<string, { label: string; className: string }> = {
    high: { label: "High Risk", className: "bg-destructive text-destructive-foreground" },
    medium: { label: "Medium", className: "bg-warning text-warning-foreground" },
    low: { label: "Low", className: "bg-success/15 text-success" },
  };
  const c = cfg[risk ?? ""] ?? { label: "Unknown", className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${c.className}`}>
      {c.label}
    </span>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Users className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {query ? "No matches" : "No patients linked yet"}
      </p>
      <p className="text-xs text-muted-foreground">
        {query ? "Try a different search term" : "Use Link Patient to add your first patient"}
      </p>
    </div>
  );
}

function AlertsSection({ loading, alerts, missedAlerts }: { loading: boolean; alerts: DoctorAlert[]; missedAlerts: MissedDoseAlert[] }) {
  const high = alerts.filter((a) => a.severity === "high");
  const med = alerts.filter((a) => a.severity === "medium");
  const unreadMissed = missedAlerts.filter((a) => !a.is_read);
  return (
    <section className="rounded-3xl border border-border/60 bg-gradient-card p-5 md:p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
            Active Alerts
          </h2>
          <p className="text-xs text-muted-foreground">High and medium risk patients, missed doses</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertColumn title="High risk" tone="destructive" loading={loading} alerts={high} />
        <AlertColumn title="Medium risk" tone="warning" loading={loading} alerts={med} />
        <MissedAlertsColumn loading={loading} alerts={unreadMissed} />
      </div>
    </section>
  );
}

function AlertColumn({
  title,
  tone,
  loading,
  alerts,
}: {
  title: string;
  tone: "destructive" | "warning";
  loading: boolean;
  alerts: DoctorAlert[];
}) {
  const toneMap = {
    destructive: "border-destructive/40 bg-destructive/5",
    warning: "border-warning/40 bg-warning/5",
  } as const;
  const dotMap = {
    destructive: "bg-destructive",
    warning: "bg-warning",
  } as const;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <span className="text-xs font-semibold text-muted-foreground">
          {loading ? "â€”" : alerts.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No {title.toLowerCase()} alerts.</p>
        ) : (
          alerts.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 rounded-xl border ${toneMap[tone]} p-3`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotMap[tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{a.patient_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function MissedAlertsColumn({
  loading,
  alerts,
}: {
  loading: boolean;
  alerts: MissedDoseAlert[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Missed Doses</p>
        <span className="text-xs font-semibold text-muted-foreground">
          {loading ? "â€”" : alerts.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No missed dose alerts.</p>
        ) : (
          alerts.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{a.patient_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------- Patient Detail Sheet -------------------- */

function PatientDetail({ patient }: { patient: Patient }) {
  const [detail, setDetail] = useState<{ today_adherence?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/doctor/patients/${patient.id}/adherence`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setDetail(json);
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  const adherenceValue = detail?.today_adherence ?? patient.adherence;

  return (
    <>
      <SheetHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={patient.name} />
          <div className="min-w-0">
            <SheetTitle className="truncate text-left">{patient.name}</SheetTitle>
            <SheetDescription className="truncate text-left">{patient.email}</SheetDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdherencePill value={adherenceValue} />
          <RiskBadge risk={patient.risk} />
        </div>
      </SheetHeader>

      <Tabs defaultValue="today" className="mt-6">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="adherence">Adherence</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          <TodayTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="medicines" className="mt-4">
          <MedicinesTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="adherence" className="mt-4">
          <AdherenceTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="export" className="mt-4">
          <ExportTab patientId={patient.id} patientName={patient.name} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function MedicinesTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<PatientMedication[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/doctor/patients/${patientId}/medications`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.medications ?? [];
        const mapped = list.map((m: any) => ({
          ...m,
          id: String(m.id),
          timing: Array.isArray(m.timing)
            ? m.timing
            : (m.dosage_timing ?? "").split(/,|\band\b/).map((t: string) => t.trim()).filter(Boolean),
        }));
        if (!cancelled) setMeds(mapped);
      } catch {
        if (!cancelled) setMeds(MOCK_MEDS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (meds.length === 0) {
    return (
      <div className="text-center py-10">
        <Pill className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No active medicines</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meds.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Pill className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {m.name}{" "}
              <span className="font-medium text-muted-foreground">Â· {m.strength}</span>
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {m.timing.join(", ")}
              {typeof m.before_meal === "boolean" && (
                <> Â· {m.before_meal ? "Before meal" : "After meal"}</>
              )}
            </p>
          </div>
          {m.is_active ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/15 rounded-full px-2 py-0.5">
              Active
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              Inactive
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AdherenceTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<AdherencePoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/doctor/patients/${patientId}/adherence`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AdherencePoint[] | { weekly?: AdherencePoint[]; weekly_breakdown?: AdherencePoint[] };
        const list = Array.isArray(json)
          ? json
          : json.weekly ?? json.weekly_breakdown ?? [];
        if (!cancelled) setPoints(list);
      } catch {
        if (!cancelled) setPoints(MOCK_ADHERENCE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return <Skeleton className="h-56 w-full rounded-2xl" />;
  }

  const avg = points.length > 0 ? Math.round(points.reduce((a, b) => a + b.adherence, 0) / points.length) : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Weekly Average
          </p>
          <p className="font-display text-2xl font-bold text-foreground">{avg}%</p>
        </div>
        <Activity className="h-5 w-5 text-primary" />
      </div>

      <div className="flex items-end justify-between gap-2 h-40">
        {points.map((d, i) => {
          const h = d.adherence === 0 ? 0 : Math.max(4, d.adherence);
          const tone =
            d.adherence >= 80
              ? "bg-success"
              : d.adherence >= 50
                ? "bg-warning"
                : "bg-destructive";
          const labelTone =
            d.adherence >= 80
              ? "text-success"
              : d.adherence >= 50
                ? "text-warning"
                : "text-destructive";
          return (
            <div key={`${d.day}-${i}`} className="flex-1 flex flex-col items-center gap-1.5 h-full min-h-0">
              <span className={`text-[11px] font-semibold ${labelTone}`}>
                {d.adherence}%
              </span>
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted-foreground/10 min-h-0">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                  style={{ height: `${h}%`, bottom: 0, left: 0, right: 0, position: "absolute" }}
                  className={`rounded-t-lg ${tone}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        {points.map((d, i) => (
          <div key={`l-${i}`} className="flex-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const handleExport = async (format: "csv" | "pdf") => {
    setDownloading(format);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/doctor/patients/${patientId}/export?format=${format}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerDownload(blob, `${slug(patientName)}-report.${format}`);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      // Fallback: generate a stub locally so the action still works in demo
      const stub =
        format === "csv"
          ? `name,email,adherence\n"${patientName}","-",-`
          : `%PDF-1.4\n% WellCare AI demo report for ${patientName}`;
      const blob = new Blob([stub], {
        type: format === "csv" ? "text/csv" : "application/pdf",
      });
      triggerDownload(blob, `${slug(patientName)}-report.${format}`);
      toast.success(`${format.toUpperCase()} downloaded (offline mode)`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Download {patientName}'s adherence and medication report.
      </p>

      <button
        onClick={() => handleExport("csv")}
        disabled={downloading !== null}
        className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4 text-left transition-smooth hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">CSV Report</p>
            <p className="text-xs text-muted-foreground">Spreadsheet-friendly export</p>
          </div>
        </div>
        {downloading === "csv" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Download className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <button
        onClick={() => handleExport("pdf")}
        disabled={downloading !== null}
        className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4 text-left transition-smooth hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">PDF Report</p>
            <p className="text-xs text-muted-foreground">Printable clinical summary</p>
          </div>
        </div>
        {downloading === "pdf" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Download className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/* -------------------- Link Patient -------------------- */

function LinkPatientSheet({
  open,
  onClose,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  onLinked: (p: Patient) => void;
}) {
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = patientId.trim();
    if (!id) {
      toast.error("Enter a patient ID");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/doctor/patients/${encodeURIComponent(id)}/link`,
        { method: "POST", headers: authHeaders() },
      );
      const json = await res.json();
      if (res.status === 404) {
        toast.error("Patient ID not found. Make sure the patient has an account.");
        return;
      }
      if (res.status === 409) {
        toast.error("This patient is already linked to your account.");
        return;
      }
      if (!res.ok) {
        toast.error(json.detail ?? "Could not link patient. Please try again.");
        return;
      }
      // Backend returns { message: "..." } â€” fetch fresh patient list
      toast.success("Patient linked successfully!");
      setPatientId("");
      onClose();
      // Reload the page to get fresh data
      window.location.reload();
    } catch {
      toast.error("Network error. Make sure the backend is running.");
      setPatientId("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Link Patient
          </SheetTitle>
          <SheetDescription>
            Enter a patient's ID to add them to your panel.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Patient ID
            </label>
            <Input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. 10"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> Link Patient
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}


function TodayTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReminderItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/doctor/patients/${patientId}/reminders`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ReminderItem[] | { reminders: ReminderItem[] };
        const list = Array.isArray(json) ? json : (json.reminders ?? []);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No reminders for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
        Today's schedule
      </p>
      {items.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
        >
          <div className="flex h-10 w-12 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <span className="text-[11px] font-bold leading-none">
              {formatTime(r.scheduled_time)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {r.medicine_name}
              {r.strength && (
                <span className="font-medium text-muted-foreground"> · {r.strength}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {r.meal_timing ? `${r.meal_timing} meal` : "Anytime"}
            </p>
            {r.is_adaptive && (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning">
                <Sparkles className="h-3 w-3" /> Adaptive ({r.early_by_minutes}m early)
              </p>
            )}
            {(r.snooze_count ?? 0) > 0 && r.status === "pending" && (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                <Bell className="h-3 w-3" /> Snoozed {r.snooze_count}x
              </p>
            )}
          </div>
          <StatusPill status={r.status} />
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    taken: { label: "Taken", className: "bg-success/15 text-success" },
    missed: { label: "Missed", className: "bg-destructive/10 text-destructive" },
    pending: { label: "Pending", className: "bg-accent text-accent-foreground" },
  };
  const c = cfg[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatTime(t: string) {
  if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5);
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { /* ignore */ }
  return t;
}
