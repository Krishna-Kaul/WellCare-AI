import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  HeartPulse,
  Loader2,
  Pill,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
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
import { AppNavbar } from "@/components/AppNavbar";
import { API_BASE_URL, authHeaders, getAuthToken, getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/caregiver")({
  head: () => ({
    meta: [
      { title: "Caregiver Dashboard — WellCare AI" },
      {
        name: "description",
        content:
          "Monitor your loved ones' medication adherence, missed doses, and risk alerts in one calm view.",
      },
      { property: "og:title", content: "Caregiver Dashboard — WellCare AI" },
      {
        property: "og:description",
        content:
          "Stay close to the people you care for — track adherence and missed doses without the worry.",
      },
    ],
  }),
  component: CaregiverDashboardPage,
});

/* -------------------- Types -------------------- */

type RiskLevel = "high" | "medium" | "low";

interface CaregiverPatient {
  id: string;
  name: string;
  email?: string;
  missed_today: number;
  adherence?: number;
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

interface MissedAlert {
  id: string;
  medicine_name: string;
  consecutive_missed: number;
  risk_level: RiskLevel;
  last_missed_at?: string;
  message?: string;
}

/* -------------------- Page -------------------- */

function CaregiverDashboardPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<CaregiverPatient[]>([]);
  const [missedAlerts, setMissedAlerts] = useState<MissedDoseAlert[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CaregiverPatient | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<CaregiverPatient | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const user = getStoredUser();
    if (!token && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (user?.role && user.role !== "caregiver") {
      toast.error("This page is for caregivers only");
      navigate({ to: "/dashboard" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/caregiver/patients`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CaregiverPatient[] | { patients: CaregiverPatient[] };
        const list = Array.isArray(json) ? json : (json.patients ?? []);
        if (!cancelled) setPatients(list);
      } catch {
        // FIX 1: Mock data hataya — real data nahi aaya toh empty show karo
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Load missed dose alerts
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/caregiver/my-alerts`, {
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
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.email?.toLowerCase().includes(q) ?? false),
    );
  }, [patients, query]);

  const totalMissed = patients.reduce((sum, p) => sum + (p.missed_today || 0), 0);

  // FIX 3: Unlink handler
  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/caregiver/patients/${unlinkTarget.id}/unlink`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok && res.status !== 204) throw new Error();
      setPatients((prev) => prev.filter((p) => p.id !== unlinkTarget.id));
      toast.success(`${unlinkTarget.name} removed from your care circle`);
    } catch {
      toast.error("Could not unlink patient. Please try again.");
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
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
    <div className="min-h-screen bg-gradient-hero pb-28 md:pb-8">
      <Toaster position="top-center" richColors />
      <AppNavbar notificationCount={totalMissed} />

      <main className="container-page py-6 md:py-10 space-y-6 md:space-y-8">
        {/* Header */}
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
            <p className="inline-flex items-center gap-1.5 rounded-full bg-lavender/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lavender-foreground">
              <Sparkles className="h-3 w-3" /> Care Circle
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-foreground">
              Watching over{" "}
              <span className="text-gradient-primary">
                {loading
                  ? "…"
                  : `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`}
              </span>
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              {totalMissed > 0
                ? `${totalMissed} dose${totalMissed === 1 ? "" : "s"} missed today across your care circle.`
                : "Everyone is on track today. ✨"}
            </p>
          </div>
          <Button
            onClick={() => setLinkOpen(true)}
            className="rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" /> Link Patient
          </Button>
        </motion.section>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9 rounded-xl bg-background/70"
          />
        </div>

        {/* Patient cards grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-3xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState query={query} onLink={() => setLinkOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="group relative text-left rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card hover-lift"
                >
                  {/* Unlink button */}
                  <button
                    onClick={() => setUnlinkTarget(p)}
                    className="absolute top-3 right-3 rounded-lg p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Remove from care circle"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>

                  <button
                    onClick={() => setSelected(p)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={p.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                          {p.email && (
                            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                          )}
                        </div>
                      </div>
                      <HeartPulse className="h-5 w-5 text-primary shrink-0 opacity-70 group-hover:opacity-100 transition-smooth" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Missed today
                        </p>
                        <p
                          className={`mt-1 font-display text-2xl font-bold ${
                            p.missed_today > 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {p.missed_today}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Adherence
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">
                          {p.adherence != null ? `${Math.round(p.adherence)}%` : "—"}
                        </p>
                      </div>
                    </div>

                    {p.missed_today > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Needs attention
                      </div>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Missed Alerts */}
        {missedAlerts.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-gradient-card p-5 md:p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                  Missed Dose Alerts
                </h2>
                <p className="text-xs text-muted-foreground">Recent missed medications</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>

            <div className="mt-4 space-y-3">
              {missedAlerts.filter(a => !a.is_read).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{alert.patient_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Patient detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <PatientDetail patient={selected} />}
        </SheetContent>
      </Sheet>

      {/* Link patient */}
      <LinkPatientSheet
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onLinked={(patient) => setPatients((prev) => [patient, ...prev])}
      />

      {/* Unlink confirmation dialog */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {unlinkTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {unlinkTarget?.name} from your care circle. You can re-add them later using their patient ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function Avatar({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "P";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-primary-foreground">
      {initials}
    </div>
  );
}

function EmptyState({ query, onLink }: { query: string; onLink: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-background/50 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Users className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {query ? "No matches" : "No one in your care circle yet"}
      </p>
      <p className="text-xs text-muted-foreground">
        {query
          ? "Try a different name or email"
          : "Link your first patient to start watching over them"}
      </p>
      {!query && (
        <Button
          onClick={onLink}
          className="mt-4 rounded-2xl bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
        >
          <UserPlus className="h-4 w-4" /> Link Patient
        </Button>
      )}
    </div>
  );
}

/* -------------------- Patient Detail -------------------- */

function PatientDetail({ patient }: { patient: CaregiverPatient }) {
  return (
    <>
      <SheetHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={patient.name} />
          <div className="min-w-0">
            <SheetTitle className="truncate text-left">{patient.name}</SheetTitle>
            {patient.email && (
              <SheetDescription className="truncate text-left">{patient.email}</SheetDescription>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {patient.missed_today > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
              <AlertTriangle className="h-3 w-3" /> {patient.missed_today} missed today
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
              On track today
            </span>
          )}
          {patient.adherence != null && (
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
              {Math.round(patient.adherence)}% adherence
            </span>
          )}
        </div>
      </SheetHeader>

      <Tabs defaultValue="today" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="missed">Missed</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-4">
          <TodayTab patientId={patient.id} />
          <MedicinesList patientId={patient.id} />
        </TabsContent>
        <TabsContent value="weekly" className="mt-4">
          <WeeklyTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="missed" className="mt-4">
          <MissedTab patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </>
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
          `${API_BASE_URL}/api/v1/caregiver/patients/${patientId}/reminders`,
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

function MedicinesList({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<PatientMedication[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/caregiver/patients/${patientId}/medications`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.medications ?? []);
        const mapped = list.map((m: any) => ({
          ...m,
          id: String(m.id),
          timing: Array.isArray(m.timing)
            ? m.timing
            : (m.dosage_timing ?? "").split(/,|\band\b/).map((t: string) => t.trim()).filter(Boolean),
        }));
        if (!cancelled) setMeds(mapped);
      } catch {
        if (!cancelled) setMeds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
        Active medicines
      </p>
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))
      ) : meds.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">No medicines on file</div>
      ) : (
        meds.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Pill className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {m.name} <span className="font-medium text-muted-foreground">· {m.strength}</span>
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {m.timing.join(", ")}
                {typeof m.before_meal === "boolean" && (
                  <> · {m.before_meal ? "Before meal" : "After meal"}</>
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
        ))
      )}
    </div>
  );
}

function WeeklyTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<AdherencePoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/caregiver/patients/${patientId}/adherence`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AdherencePoint[] | { weekly?: AdherencePoint[]; weekly_breakdown?: AdherencePoint[] };
        const list = Array.isArray(json)
          ? json
          : json.weekly ?? json.weekly_breakdown ?? [];
        if (!cancelled) setPoints(list);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return <Skeleton className="h-56 w-full rounded-2xl" />;

  if (points.length === 0) {
    return (
      <div className="text-center py-10">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No adherence data yet</p>
      </div>
    );
  }

  const avg =
    points.length > 0 ? Math.round(points.reduce((a, b) => a + b.adherence, 0) / points.length) : 0;

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
            d.adherence >= 80 ? "bg-success" : d.adherence >= 50 ? "bg-warning" : "bg-destructive";
          const labelTone =
            d.adherence >= 80 ? "text-success" : d.adherence >= 50 ? "text-warning" : "text-destructive";
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

function MissedTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<MissedAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/caregiver/patients/${patientId}/missed-alerts`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MissedAlert[] | { alerts: MissedAlert[] };
        const list = Array.isArray(json) ? json : (json.alerts ?? []);
        if (!cancelled) setAlerts(list);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">No missed alerts</p>
        <p className="text-xs text-muted-foreground">All doses on schedule recently</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 ${riskBorder(a.risk_level)}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{a.medicine_name}</p>
              <p className="text-xs text-muted-foreground">
                {a.message ||
                  `${a.consecutive_missed} consecutive dose${a.consecutive_missed === 1 ? "" : "s"} missed`}
              </p>
            </div>
            <RiskTag risk={a.risk_level} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Consecutive missed
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                a.consecutive_missed >= 3
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/15 text-warning"
              }`}
            >
              {a.consecutive_missed}
            </span>
          </div>
        </motion.div>
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

function RiskTag({ risk }: { risk: RiskLevel }) {
  const cfg: Record<RiskLevel, { label: string; className: string }> = {
    high: { label: "High Risk", className: "bg-destructive text-destructive-foreground" },
    medium: { label: "Medium", className: "bg-warning text-warning-foreground" },
    low: { label: "Low", className: "bg-success/15 text-success" },
  };
  const c = cfg[risk] ?? { label: "Unknown", className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${c.className}`}>
      {c.label}
    </span>
  );
}

function riskBorder(risk: RiskLevel) {
  switch (risk) {
    case "high": return "border-destructive/40 bg-destructive/5";
    case "medium": return "border-warning/40 bg-warning/5";
    default: return "border-border/60 bg-background/60";
  }
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

/* -------------------- Link Patient -------------------- */

function LinkPatientSheet({
  open,
  onClose,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  onLinked: (p: CaregiverPatient) => void;
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
        `${API_BASE_URL}/api/v1/caregiver/patients/${encodeURIComponent(id)}/link`,
        { method: "POST", headers: authHeaders() },
      );
      const data = await res.json();
      if (res.status === 404) {
        toast.error("Patient ID not found. Make sure the patient has an account.");
        return;
      }
      if (res.status === 409) {
        toast.error("This patient is already in your care circle.");
        return;
      }
      if (!res.ok) {
        toast.error(data.detail ?? "Could not link patient. Please try again.");
        return;
      }
      toast.success("Patient added to your care circle!");
      setPatientId("");
      onClose();
      window.location.reload();
    } catch {
      toast.error("Network error. Make sure the backend is running.");
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
            Enter a patient's ID to add them to your care circle.
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
              <><Plus className="h-4 w-4" /> Link Patient</>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
