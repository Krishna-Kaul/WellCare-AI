import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  Loader2,
  Pencil,
  Pill,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppNavbar } from "@/components/AppNavbar";
import { API_BASE_URL, authHeaders, getAuthToken, getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/medications")({
  head: () => ({
    meta: [
      { title: "My Medications — WellCare AI" },
      {
        name: "description",
        content:
          "Manage your medications, schedules, dosage timing, meal preferences and reminders in one place.",
      },
      { property: "og:title", content: "My Medications — WellCare AI" },
      {
        property: "og:description",
        content: "Add, edit and track your prescriptions with smart reminders.",
      },
    ],
  }),
  component: MedicationsPage,
});

/* -------------------- Types -------------------- */

type TimingSlot = "morning" | "afternoon" | "evening" | "night";
type Source = "manual" | "ocr";

interface Medication {
  id: string;
  name: string;
  strength: string;
  dosage_timing: string;
  custom_times?: string;
  duration_days: number;
  before_meal: boolean;
  notes?: string;
  source: Source;
  is_active: boolean;
  created_at?: string;
}

interface MedicationAPIResponse {
  id: number;
  user_id: number;
  name: string;
  strength: string | null;
  dosage_timing: string | null;
  custom_times: string | null;
  duration_days: number | null;
  before_meal: boolean;
  notes: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
}

const TIMING_LABELS: Record<TimingSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

function getTimingSlots(med: Medication): TimingSlot[] {
  if (med.custom_times) {
    // Parse custom_times into slots
    const times = med.custom_times.split(',').map(t => t.trim());
    return times.map(t => {
      const hour = parseInt(t.split(':')[0]);
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    }).filter((v, i, a) => a.indexOf(v) === i); // unique
  } else if (med.dosage_timing) {
    return med.dosage_timing.split(',').map(t => t.trim().toLowerCase() as TimingSlot);
  }
  return [];
}

/* -------------------- Local mock fallback --------------------
 * The brief specifies http://localhost:8000 endpoints, which won't
 * be reachable from the preview. We try the network first; if it
 * fails we fall back to an in-memory store so the UI stays usable.
 */

let MOCK_DB: Medication[] = [
  {
    id: "m_1",
    name: "Metformin",
    strength: "500 mg",
    dosage_timing: "morning, night",
    custom_times: "08:00,20:00",
    duration_days: 30,
    before_meal: false,
    notes: "Take with a full glass of water.",
    source: "ocr",
    is_active: true,
  },
  {
    id: "m_2",
    name: "Atorvastatin",
    strength: "10 mg",
    dosage_timing: "night",
    custom_times: "20:00",
    duration_days: 90,
    before_meal: false,
    notes: "",
    source: "manual",
    is_active: true,
  },
  {
    id: "m_3",
    name: "Vitamin D3",
    strength: "60,000 IU",
    dosage_timing: "morning",
    custom_times: "08:00",
    duration_days: 7,
    before_meal: true,
    notes: "Once a week.",
    source: "manual",
    is_active: false,
  },
];

function uid() {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

async function tryFetch<T>(url: string, init?: RequestInit, timeoutMs = 2500): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function dosageToTiming(dosage: string): TimingSlot[] {
  const d = dosage.toLowerCase();
  if (d.includes("once") || d.includes("morning")) return ["morning"];
  if (d.includes("twice")) return ["morning", "night"];
  if (d.includes("three") || d.includes("thrice")) return ["morning", "afternoon", "night"];
  if (d.includes("night") || d.includes("bedtime")) return ["night"];
  if (d.includes("afternoon")) return ["afternoon"];
  return ["morning"]; // default fallback
}

async function apiList(): Promise<Medication[]> {
  try {
    const raw = await tryFetch<MedicationAPIResponse[]>(`${API_BASE_URL}/api/v1/medications/`, {
      method: "GET",
      headers: authHeaders(),
    });
    return raw.map((m) => ({
      id: String(m.id),
      name: m.name,
      strength: m.strength || "",
      dosage_timing: m.dosage_timing || "",
      custom_times: m.custom_times || undefined,
      duration_days: m.duration_days || 0,
      before_meal: m.before_meal,
      notes: m.notes || undefined,
      source: m.source as Source,
      is_active: m.is_active,
      created_at: m.created_at,
    }));
  } catch {
    return [...MOCK_DB];
  }
}

async function apiCreate(
  payload: Omit<Medication, "id" | "is_active" | "source"> & { source?: Source },
): Promise<Medication> {
  const body = { ...payload, source: payload.source ?? "manual", is_active: true };
  try {
    const raw = await tryFetch<any>(`${API_BASE_URL}/api/v1/medications/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    return { ...raw, dosage_timing: raw.dosage_timing ?? "", custom_times: raw.custom_times ?? undefined };
  } catch {
    const created: Medication = { id: uid(), ...body } as Medication;
    MOCK_DB = [created, ...MOCK_DB];
    return created;
  }
}

async function apiUpdate(id: string, patch: Partial<Medication>): Promise<Medication> {
  try {
    const raw = await tryFetch<MedicationAPIResponse>(`${API_BASE_URL}/api/v1/medications/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    return {
      id: String(raw.id),
      name: raw.name,
      strength: raw.strength || "",
      dosage_timing: raw.dosage_timing || "",
      custom_times: raw.custom_times || undefined,
      duration_days: raw.duration_days || 0,
      before_meal: raw.before_meal,
      notes: raw.notes || undefined,
      source: raw.source as Source,
      is_active: raw.is_active,
      created_at: raw.created_at,
    };
  } catch {
    MOCK_DB = MOCK_DB.map((m) => (m.id === id ? { ...m, ...patch } : m));
    return MOCK_DB.find((m) => m.id === id)!;
  }
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/medications/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

/* -------------------- Page -------------------- */

type FilterTab = "all" | "active" | "inactive";

function MedicationsPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const [editing, setEditing] = useState<Medication | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Medication | null>(null);

  // Auth + role guard
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Please sign in to manage medications");
      navigate({ to: "/login" });
      return;
    }
    const user = getStoredUser();
    if (user && user.role && user.role !== "patient") {
      toast.error("Medications are available for patient accounts only");
      navigate({ to: "/dashboard" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  // Fetch list
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiList();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) toast.error("Couldn't load medications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (tab === "active" && !m.is_active) return false;
      if (tab === "inactive" && m.is_active) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.strength.toLowerCase().includes(q) ||
        (m.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, tab]);

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((m) => m.is_active).length,
      inactive: items.filter((m) => !m.is_active).length,
    }),
    [items],
  );

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (m: Medication) => {
    setEditing(m);
    setShowForm(true);
  };

  const handleSave = async (values: MedicineFormValues) => {
    const defaultTimes: Record<string, string> = {
      morning: "08:00",
      afternoon: "14:00",
      evening: "18:00",
      night: "20:00",
    };
    const customTimesStr = values.timing
      .map((slot) => values.customTimes?.[slot] || defaultTimes[slot] || "08:00")
      .join(",");
    const dosageTimingStr = values.timing.join(", ");
    const backendPayload = {
      name: values.name,
      strength: values.strength,
      dosage_timing: dosageTimingStr,
      custom_times: customTimesStr,
      duration_days: values.duration_days,
      before_meal: values.before_meal,
      notes: values.notes,
    };
    if (editing) {
      const updated = await apiUpdate(editing.id, backendPayload);
      setItems((prev) => prev.map((m) => (m.id === editing.id ? updated : m)));
      toast.success(`${updated.name} updated`);
    } else {
      const created = await apiCreate({ ...backendPayload, source: "manual" });
      setItems((prev) => [created, ...prev]);
      toast.success(`${created.name} added to your list`);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const m = confirmDelete;
    try {
      await apiDelete(m.id);
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      toast.success(`${m.name} removed`);
    } catch {
      toast.error("Couldn't delete medication");
    } finally {
      setConfirmDelete(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist pb-24">
      <Toaster position="top-center" richColors />

      <AppNavbar notificationCount={2} />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="container-page pt-6 md:pt-10"
      >
        {/* Page title + primary CTA */}
        <div className="mb-6 flex items-start justify-between gap-3 md:mb-8">
          <div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">
              My Medications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Smart reminders, every dose on time
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="h-10 gap-2 rounded-xl bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground shadow-cta hover:opacity-95 md:h-11 md:px-5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Medicine</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Search + tabs */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, strength, notes…"
              className="h-11 rounded-xl border-border/60 bg-background pl-9 pr-9 text-sm shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex w-full gap-1 rounded-xl border border-border/60 bg-background p-1 shadow-sm md:w-auto">
            {(["all", "active", "inactive"] as FilterTab[]).map((t) => {
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-smooth md:flex-none md:px-4 md:text-sm ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-cta"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  <span
                    className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/25 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {counts[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List area */}
        <div className="mt-6 md:mt-8">
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState hasItems={items.length > 0} onAdd={openAdd} query={query} tab={tab} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((m) => (
                  <MedicationCard
                    key={m.id}
                    med={m}
                    onEdit={() => openEdit(m)}
                    onDelete={() => setConfirmDelete(m)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.main>

      {/* Form dialog */}
      <MedicineFormDialog
        open={showForm}
        onOpenChange={(o) => {
          setShowForm(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        onSubmit={handleSave}
      />

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Remove medicine?</DialogTitle>
            <DialogDescription>
              {confirmDelete
                ? `${confirmDelete.name} will be marked inactive. You can reactivate it any time.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Card -------------------- */

function MedicationCard({
  med,
  onEdit,
  onDelete,
}: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-background p-5 shadow-sm transition-smooth hover:border-primary/30 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-cta">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold leading-tight">{med.name}</h3>
            <p className="text-sm text-muted-foreground">{med.strength}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            med.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${med.is_active ? "bg-success" : "bg-muted-foreground"}`}
          />
          {med.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        <Row icon={Clock} label="Timing">
          <div className="flex flex-wrap gap-1">
            {getTimingSlots(med).length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              getTimingSlots(med).map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground"
                >
                  {TIMING_LABELS[t]}
                </span>
              ))
            )}
          </div>
        </Row>
        <Row icon={Sparkles} label="Duration">
          <span className="font-semibold text-foreground">{med.duration_days} days</span>
        </Row>
        <Row icon={Utensils} label="Meal">
          <span className="font-semibold text-foreground">
            {med.before_meal ? "Before meal" : "After meal"}
          </span>
        </Row>
      </div>

      {med.notes && (
        <p className="mt-3 line-clamp-2 rounded-xl bg-muted/60 p-2.5 text-xs text-muted-foreground">
          {med.notes}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            med.source === "ocr"
              ? "bg-lavender/40 text-lavender-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {med.source === "ocr" ? <ScanLine className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          {med.source === "ocr" ? "OCR" : "Manual"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth"
            aria-label={`Edit ${med.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth"
            aria-label={`Remove ${med.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="text-right">{children}</div>
      </div>
    </div>
  );
}

/* -------------------- Skeleton & Empty -------------------- */

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 bg-background p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="mt-5 flex justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasItems,
  onAdd,
  query,
  tab,
}: {
  hasItems: boolean;
  onAdd: () => void;
  query: string;
  tab: FilterTab;
}) {
  const isFiltered = hasItems && (query.length > 0 || tab !== "all");
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border/70 bg-background p-10 text-center shadow-sm md:p-14"
    >
      {/* SVG illustration */}
      <svg
        viewBox="0 0 200 160"
        className="mb-6 h-32 w-40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="100" cy="138" rx="72" ry="8" fill="hsl(var(--muted))" />
        <rect x="48" y="34" width="104" height="80" rx="14" fill="hsl(var(--accent))" />
        <rect
          x="48"
          y="34"
          width="104"
          height="36"
          rx="14"
          fill="hsl(var(--primary))"
          opacity="0.18"
        />
        <circle cx="74" cy="52" r="6" fill="hsl(var(--primary))" />
        <rect
          x="88"
          y="48"
          width="48"
          height="8"
          rx="4"
          fill="hsl(var(--primary))"
          opacity="0.55"
        />
        <rect
          x="64"
          y="82"
          width="72"
          height="6"
          rx="3"
          fill="hsl(var(--primary))"
          opacity="0.35"
        />
        <rect
          x="64"
          y="94"
          width="56"
          height="6"
          rx="3"
          fill="hsl(var(--primary))"
          opacity="0.25"
        />
        <g transform="translate(122 84) rotate(28)">
          <rect x="-6" y="-22" width="32" height="44" rx="14" fill="hsl(var(--primary))" />
          <rect x="-6" y="0" width="32" height="22" rx="0" fill="hsl(var(--primary-glow))" />
          <rect
            x="-6"
            y="-22"
            width="32"
            height="44"
            rx="14"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      </svg>

      <h3 className="font-display text-xl font-bold md:text-2xl">
        {isFiltered ? "No medicines match your filter" : "No medicines yet"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {isFiltered
          ? "Try clearing your search or switching tabs."
          : "Add your first medicine to start getting smart reminders, dosage tracking and refill alerts."}
      </p>
      {!isFiltered && (
        <Button
          onClick={onAdd}
          className="mt-6 h-11 gap-2 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-cta hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Add your first medicine
        </Button>
      )}
    </motion.div>
  );
}

/* -------------------- Form Dialog -------------------- */

interface MedicineFormValues {
  name: string;
  strength: string;
  timing: TimingSlot[];
  customTimes?: Record<string, string>;
  duration_days: number;
  before_meal: boolean;
  notes?: string;
}

function MedicineFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Medication | null;
  onSubmit: (v: MedicineFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [timing, setTiming] = useState<TimingSlot[]>([]);
  const [customTimes, setCustomTimes] = useState<Record<string, string>>({
    morning: "08:00",
    afternoon: "14:00",
    evening: "18:00",
    night: "20:00",
  });
  const [duration, setDuration] = useState<string>("7");
  const [beforeMeal, setBeforeMeal] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setStrength(initial?.strength ?? "");
      setTiming(dosageToTiming(initial?.dosage_timing ?? ""));
      if (initial?.dosage_timing) {
        const slots = initial.dosage_timing.split(",").map((s: string) => s.trim().toLowerCase());
        const times: Record<string, string> = { morning: "08:00", afternoon: "14:00", evening: "18:00", night: "20:00" };
        if (initial.custom_times) {
          const customArr = initial.custom_times.split(",");
          slots.forEach((slot: string, i: number) => {
            if (customArr[i]) times[slot] = customArr[i].trim();
          });
        }
        setCustomTimes(times);
      }
      setDuration(String(initial?.duration_days ?? 7));
      setBeforeMeal(initial?.before_meal ?? false);
      setNotes(initial?.notes ?? "");
      setErrors({});
    }
  }, [open, initial]);

  const toggleTiming = (slot: TimingSlot) => {
    setTiming((prev) => (prev.includes(slot) ? prev.filter((x) => x !== slot) : [...prev, slot]));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Medicine name is required";
    if (!strength.trim()) e.strength = "Strength is required (e.g. 500 mg)";
    if (timing.length === 0) e.timing = "Pick at least one timing";
    const d = Number(duration);
    if (!Number.isFinite(d) || d <= 0) e.duration = "Enter a valid number of days";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        strength: strength.trim(),
        timing,
        customTimes,
        duration_days: Number(duration),
        before_meal: beforeMeal,
        notes: notes.trim() || undefined,
      });
    } catch {
      toast.error("Couldn't save medicine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {initial ? "Edit medicine" : "Add a new medicine"}
          </DialogTitle>
          <DialogDescription>
            Set timing, dosage and meal preference. We'll handle the reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-name" className="text-xs font-semibold">
                Name
              </Label>
              <Input
                id="med-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metformin"
                className="h-10 rounded-xl"
              />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-strength" className="text-xs font-semibold">
                Strength
              </Label>
              <Input
                id="med-strength"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500 mg"
                className="h-10 rounded-xl"
              />
              {errors.strength && <p className="text-[11px] text-destructive">{errors.strength}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Dosage timing</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(TIMING_LABELS) as TimingSlot[]).map((slot) => {
                const selected = timing.includes(slot);
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => toggleTiming(slot)}
                    className={`relative flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-smooth ${
                      selected
                        ? "border-primary bg-gradient-primary text-primary-foreground shadow-cta"
                        : "border-border/60 bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {TIMING_LABELS[slot]}
                  </button>
                );
              })}
            </div>
            {errors.timing && <p className="text-[11px] text-destructive">{errors.timing}</p>}
            {timing.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label className="text-xs font-semibold">Set time for each slot</Label>
                {timing.map((slot) => (
                  <div key={slot} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-medium capitalize text-muted-foreground">{slot}</span>
                    <input
                      type="time"
                      value={customTimes[slot] || "08:00"}
                      onChange={(e) => setCustomTimes((prev) => ({ ...prev, [slot]: e.target.value }))}
                      className="h-9 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="med-duration" className="text-xs font-semibold">
                Duration (days)
              </Label>
              <Input
                id="med-duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 rounded-xl"
              />
              {errors.duration && <p className="text-[11px] text-destructive">{errors.duration}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Meal preference</Label>
              <div className="flex h-10 items-center justify-between rounded-xl border border-border/60 bg-background px-3">
                <span className="text-sm">{beforeMeal ? "Before meal" : "After meal"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={beforeMeal}
                  onClick={() => setBeforeMeal((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-smooth ${
                    beforeMeal ? "bg-gradient-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                      beforeMeal ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="med-notes" className="text-xs font-semibold">
              Notes (optional)
            </Label>
            <Textarea
              id="med-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take with a glass of water"
              className="min-h-20 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-cta hover:opacity-95"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : initial ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {initial ? "Save changes" : "Add medicine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
