import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Heart,
  Languages,
  Loader2,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { savePrefs, type Language, type ReminderTone, type UserRole } from "@/lib/user-prefs";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to WellCare AI — Personalize Your Care" },
      {
        name: "description",
        content:
          "Set up WellCare AI in 4 quick steps. Choose your role, language, and notification preferences for a tailored healthcare experience.",
      },
      { property: "og:title", content: "Welcome to WellCare AI" },
      {
        property: "og:description",
        content: "Personalize your medication, caregiver and clinic experience in under a minute.",
      },
    ],
  }),
  component: OnboardingPage,
});

const steps = ["Role", "Language", "Details", "Review"] as const;
type StepIndex = 0 | 1 | 2 | 3;

interface DraftPrefs {
  role: UserRole | null;
  name: string;
  language: Language;
  reminderTone: ReminderTone;
  conditions: string[];
  caregiverPhone: string;
  patientName: string;
  alertChannels: ("sms" | "push" | "call")[];
  clinicName: string;
  specialty: string;
  patientLoad: string;
}

const initialDraft: DraftPrefs = {
  role: null,
  name: "",
  language: "en",
  reminderTone: "standard",
  conditions: [],
  caregiverPhone: "",
  patientName: "",
  alertChannels: ["push"],
  clinicName: "",
  specialty: "",
  patientLoad: "1-50",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepIndex>(0);
  const [draft, setDraft] = useState<DraftPrefs>(initialDraft);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof DraftPrefs>(key: K, value: DraftPrefs[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canAdvance = useMemo(() => {
    if (step === 0) return draft.role !== null && draft.name.trim().length >= 2;
    if (step === 1) return !!draft.language && !!draft.reminderTone;
    if (step === 2) {
      if (draft.role === "patient") return true;
      if (draft.role === "caregiver")
        return draft.patientName.trim().length >= 2 && draft.alertChannels.length > 0;
      if (draft.role === "doctor")
        return draft.clinicName.trim().length >= 2 && draft.specialty.trim().length >= 2;
    }
    return true;
  }, [step, draft]);

  const next = () => {
    if (!canAdvance) return;
    if (step < 3) setStep((s) => (s + 1) as StepIndex);
  };
  const back = () => {
    if (step > 0) setStep((s) => (s - 1) as StepIndex);
  };

  const finish = async () => {
    if (!draft.role) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    savePrefs({
      role: draft.role,
      name: draft.name.trim(),
      language: draft.language,
      reminderTone: draft.reminderTone,
      conditions: draft.conditions,
      caregiverPhone: draft.caregiverPhone || undefined,
      patientName: draft.patientName || undefined,
      alertChannels: draft.alertChannels,
      clinicName: draft.clinicName || undefined,
      specialty: draft.specialty || undefined,
      patientLoad: draft.patientLoad,
      completedAt: new Date().toISOString(),
    });
    toast.success("All set! Loading your dashboard…");
    // Route to role-specific dashboard
    const storedUser = getStoredUser();
    const role = storedUser?.role ?? draft.role;
    const dest =
      role === "patient"
        ? "/patient/dashboard"
        : role === "doctor"
          ? "/doctor"
          : role === "caregiver"
            ? "/caregiver"
            : "/dashboard";
    setTimeout(() => navigate({ to: dest }), 400);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-lavender/40 blur-3xl" />

      <header className="relative z-10">
        <div className="container-page flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="flex items-center">
            <Logo className="h-8 md:h-9" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-smooth hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign out
          </Link>
        </div>
      </header>

      <main className="relative z-10 container-page pb-16 pt-2 md:pt-6">
        <div className={step === 3 ? "mx-auto max-w-5xl" : "mx-auto max-w-2xl"}>
          {/* Stepper */}
          <Stepper current={step} />

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-6 rounded-3xl border border-border/60 bg-background/90 p-6 shadow-elevated backdrop-blur-xl sm:p-8"
          >
            <AnimatePresence mode="wait">
              {step === 0 && <RoleStep key="role" draft={draft} update={update} />}
              {step === 1 && <LanguageStep key="lang" draft={draft} update={update} />}
              {step === 2 && <DetailsStep key="details" draft={draft} update={update} />}
              {step === 3 && <ReviewStep key="review" draft={draft} update={update} />}
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={step === 0 || submitting}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance}
                  className="rounded-xl bg-gradient-primary px-6 font-semibold shadow-cta hover:opacity-95"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={finish}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-primary px-6 font-semibold shadow-cta hover:opacity-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Personalizing…
                    </>
                  ) : (
                    <>
                      Open my dashboard
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            You can change these anytime from Profile & Settings.
          </p>
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

/* ---------------- Stepper ---------------- */
function Stepper({ current }: { current: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-smooth",
                  done
                    ? "bg-success text-success-foreground"
                    : active
                      ? "bg-gradient-primary text-primary-foreground shadow-cta"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={[
                  "hidden text-xs font-semibold sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={["h-0.5 flex-1 rounded-full", done ? "bg-success" : "bg-border"].join(
                    " ",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Step 1: Role ---------------- */
const ROLES: {
  value: UserRole;
  title: string;
  desc: string;
  icon: typeof Heart;
  accent: string;
}[] = [
  {
    value: "patient",
    title: "I'm a patient",
    desc: "Track my medicines, get reminders, and stay on top of my health.",
    icon: Heart,
    accent: "from-primary/10 to-primary/5",
  },
  {
    value: "caregiver",
    title: "I'm a caregiver",
    desc: "Help a parent or loved one stay safe with their medication.",
    icon: Users,
    accent: "from-lavender/60 to-lavender/20",
  },
  {
    value: "doctor",
    title: "I'm a doctor",
    desc: "Monitor patient adherence and run my clinic dashboard.",
    icon: Stethoscope,
    accent: "from-success/15 to-success/5",
  },
];

function RoleStep({
  draft,
  update,
}: {
  draft: DraftPrefs;
  update: <K extends keyof DraftPrefs>(k: K, v: DraftPrefs[K]) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Let's personalize WellCare
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your role and tell us your name — we'll tailor everything from there.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="full-name" className="text-xs font-semibold text-foreground">
          What should we call you?
        </Label>
        <Input
          id="full-name"
          placeholder="e.g. Priya Sharma"
          value={draft.name}
          onChange={(e) => update("name", e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="grid gap-3">
        {ROLES.map((r) => {
          const selected = draft.role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => update("role", r.value)}
              className={[
                "group flex items-start gap-4 rounded-2xl border p-4 text-left transition-smooth",
                selected
                  ? "border-primary bg-gradient-to-r from-primary/5 to-transparent shadow-soft ring-2 ring-primary/30"
                  : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/40",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                  r.accent,
                ].join(" ")}
              >
                <r.icon className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.desc}</p>
              </div>
              <div
                className={[
                  "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-smooth",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                ].join(" ")}
              >
                {selected && <Check className="h-3 w-3" />}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ---------------- Step 2: Language ---------------- */
const LANGS: { value: Language; label: string; sub: string; flag: string }[] = [
  { value: "en", label: "English", sub: "Default voice & UI", flag: "🇬🇧" },
  { value: "hi", label: "हिंदी", sub: "Hindi voice & UI", flag: "🇮🇳" },
  { value: "hi-en", label: "Hinglish", sub: "Mixed Hindi + English", flag: "🪔" },
];

const TONES: { value: ReminderTone; label: string; desc: string }[] = [
  { value: "gentle", label: "Gentle", desc: "Soft chime, calm voice — best for elders" },
  { value: "standard", label: "Standard", desc: "Friendly nudge with clear voice" },
  { value: "urgent", label: "Urgent", desc: "Repeating alerts for critical meds" },
];

function LanguageStep({
  draft,
  update,
}: {
  draft: DraftPrefs;
  update: <K extends keyof DraftPrefs>(k: K, v: DraftPrefs[K]) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          <Languages className="inline h-6 w-6 text-primary" /> Choose your language
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll speak to you in this language across reminders and the voice assistant.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {LANGS.map((l) => {
          const selected = draft.language === l.value;
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => update("language", l.value)}
              className={[
                "rounded-2xl border p-4 text-left transition-smooth",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border/60 bg-background hover:border-primary/40",
              ].join(" ")}
            >
              <div className="text-2xl">{l.flag}</div>
              <p className="mt-2 font-semibold text-foreground">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.sub}</p>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Reminder style</p>
        </div>
        <div className="mt-3 grid gap-2">
          {TONES.map((t) => {
            const selected = draft.reminderTone === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => update("reminderTone", t.value)}
                className={[
                  "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-smooth",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/40",
                ].join(" ")}
              >
                <div>
                  <p className="font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <div
                  className={[
                    "h-4 w-4 rounded-full border-2",
                    selected ? "border-primary bg-primary" : "border-border",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Step 3: Details (role-aware) ---------------- */
const CONDITIONS = ["Diabetes", "Hypertension", "Cardiac", "Thyroid", "Asthma", "Other"];
const CHANNELS: { value: "sms" | "push" | "call"; label: string }[] = [
  { value: "push", label: "Push notification" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Phone call" },
];
const SPECIALTIES = [
  "General Physician",
  "Cardiology",
  "Endocrinology",
  "Geriatrics",
  "Pediatrics",
  "Other",
];
const LOADS = ["1-50", "51-200", "201-500", "500+"];

function DetailsStep({
  draft,
  update,
}: {
  draft: DraftPrefs;
  update: <K extends keyof DraftPrefs>(k: K, v: DraftPrefs[K]) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">A few details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft.role === "patient" && "Help us tailor reminders and refill alerts."}
          {draft.role === "caregiver" && "Tell us about the person you care for."}
          {draft.role === "doctor" && "Tell us about your practice."}
        </p>
      </div>

      {draft.role === "patient" && (
        <div className="space-y-5">
          <div>
            <Label className="text-xs font-semibold text-foreground">
              Conditions you manage{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const on = draft.conditions.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      update(
                        "conditions",
                        on ? draft.conditions.filter((x) => x !== c) : [...draft.conditions, c],
                      )
                    }
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-smooth",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caregiver-phone" className="text-xs font-semibold text-foreground">
              Caregiver phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex h-11 items-center justify-center rounded-xl border border-input bg-muted/50 px-3 text-sm font-semibold text-foreground">
                +91
              </div>
              <Input
                id="caregiver-phone"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={draft.caregiverPhone}
                onChange={(e) => update("caregiverPhone", e.target.value.replace(/[^\d\s]/g, ""))}
                className="h-11 flex-1 rounded-xl"
                maxLength={11}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll alert this person if you miss a critical dose.
            </p>
          </div>
        </div>
      )}

      {draft.role === "caregiver" && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="patient-name" className="text-xs font-semibold text-foreground">
              Who are you caring for?
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="patient-name"
                placeholder="e.g. Mom, Dad, Anil Sharma"
                value={draft.patientName}
                onChange={(e) => update("patientName", e.target.value)}
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-foreground">Alert me via</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CHANNELS.map((c) => {
                const on = draft.alertChannels.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() =>
                      update(
                        "alertChannels",
                        on
                          ? draft.alertChannels.filter((x) => x !== c.value)
                          : [...draft.alertChannels, c.value],
                      )
                    }
                    className={[
                      "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-smooth",
                      on
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone-c" className="text-xs font-semibold text-foreground">
              Their phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex h-11 items-center justify-center rounded-xl border border-input bg-muted/50 px-3 text-sm font-semibold text-foreground">
                +91
              </div>
              <Input
                id="phone-c"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={draft.caregiverPhone}
                onChange={(e) => update("caregiverPhone", e.target.value.replace(/[^\d\s]/g, ""))}
                className="h-11 flex-1 rounded-xl"
                maxLength={11}
              />
            </div>
          </div>
        </div>
      )}

      {draft.role === "doctor" && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="clinic" className="text-xs font-semibold text-foreground">
              Clinic / Hospital name
            </Label>
            <Input
              id="clinic"
              placeholder="e.g. Apollo Clinic, Bandra"
              value={draft.clinicName}
              onChange={(e) => update("clinicName", e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Specialty</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const on = draft.specialty === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("specialty", s)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-smooth",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-foreground">Approx. patient panel</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {LOADS.map((l) => {
                const on = draft.patientLoad === l;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => update("patientLoad", l)}
                    className={[
                      "rounded-xl border px-2 py-2.5 text-sm font-semibold transition-smooth",
                      on
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------- Step 4: Review ---------------- */
function ReviewStep({
  draft,
  update,
}: {
  draft: DraftPrefs;
  update: <K extends keyof DraftPrefs>(k: K, v: DraftPrefs[K]) => void;
}) {
  const langLabel = LANGS.find((l) => l.value === draft.language)?.label ?? "English";
  const toneLabel = TONES.find((t) => t.value === draft.reminderTone)?.label ?? "Standard";

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: draft.name || "—" },
    {
      label: "Role",
      value:
        draft.role === "patient"
          ? "Patient"
          : draft.role === "caregiver"
            ? "Caregiver"
            : draft.role === "doctor"
              ? "Doctor"
              : "—",
    },
    { label: "Language", value: langLabel },
    { label: "Reminder tone", value: toneLabel },
  ];

  if (draft.role === "patient") {
    rows.push({
      label: "Conditions",
      value: draft.conditions.length ? draft.conditions.join(", ") : "None added",
    });
    if (draft.caregiverPhone)
      rows.push({ label: "Caregiver", value: `+91 ${draft.caregiverPhone}` });
  }
  if (draft.role === "caregiver") {
    rows.push({ label: "Caring for", value: draft.patientName || "—" });
    rows.push({ label: "Alerts via", value: draft.alertChannels.join(", ") });
  }
  if (draft.role === "doctor") {
    rows.push({ label: "Clinic", value: draft.clinicName || "—" });
    rows.push({ label: "Specialty", value: draft.specialty || "—" });
    rows.push({ label: "Patient panel", value: draft.patientLoad });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Looking good, {draft.name.split(" ")[0] || "there"}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle role and language below to instantly preview your dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: summary + toggles */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-1">
            <div className="rounded-2xl bg-background/60 p-4">
              <dl className="divide-y divide-border/60">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-3 gap-3 py-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {r.label}
                    </dt>
                    <dd className="col-span-2 text-sm font-medium text-foreground">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Try a different role
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const active = draft.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("role", r.value)}
                    className={[
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-smooth",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/60 bg-background hover:border-primary/40",
                    ].join(" ")}
                  >
                    <r.icon
                      className={[
                        "h-4 w-4",
                        active ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <span className="text-xs font-semibold text-foreground capitalize">
                      {r.value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Switch language
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((l) => {
                const active = draft.language === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => update("language", l.value)}
                    className={[
                      "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-smooth",
                      active
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/30"
                        : "border-border/60 bg-background text-foreground hover:border-primary/40",
                    ].join(" ")}
                  >
                    <span aria-hidden>{l.flag}</span>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-3">
          <DashboardPreview draft={draft} />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          Your live dashboard will look just like this — with real medicines, alerts and analytics
          for the{" "}
          <span className="font-semibold text-primary">
            {draft.role === "doctor"
              ? "clinic"
              : draft.role === "caregiver"
                ? "caregiver"
                : "patient"}{" "}
            experience
          </span>
          .
        </p>
      </div>
    </motion.div>
  );
}

/* ---------------- Live preview pane ---------------- */
function DashboardPreview({ draft }: { draft: DraftPrefs }) {
  const greeting =
    draft.language === "hi" ? "नमस्ते" : draft.language === "hi-en" ? "Namaste" : "Hello";
  const first = draft.name.split(" ")[0] || "friend";
  const roleLabel =
    draft.role === "doctor"
      ? "Clinic mode"
      : draft.role === "caregiver"
        ? "Caregiver mode"
        : "Patient mode";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-mist shadow-soft">
      {/* Faux browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/80 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-destructive/70" />
        <span className="h-2 w-2 rounded-full bg-warning/70" />
        <span className="h-2 w-2 rounded-full bg-success/70" />
        <span className="ml-2 truncate text-[10px] font-medium text-muted-foreground">
          wellcare.ai/dashboard · live preview
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${draft.role}-${draft.language}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-3 p-3"
        >
          {/* Mini banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-primary p-3 text-primary-foreground">
            <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
              {roleLabel}
            </span>
            <p className="mt-1.5 font-display text-sm font-bold leading-tight">
              {greeting}, {first} 👋
            </p>
            <p className="text-[10px] text-primary-foreground/85">
              {draft.role === "patient" && "Your medicine day is on track."}
              {draft.role === "caregiver" &&
                `Watching over ${draft.patientName || "your loved one"}.`}
              {draft.role === "doctor" && `${draft.clinicName || "Your clinic"} · today's overview`}
            </p>
          </div>

          {draft.role === "patient" && <PreviewPatient draft={draft} />}
          {draft.role === "caregiver" && <PreviewCaregiver draft={draft} />}
          {draft.role === "doctor" && <PreviewDoctor draft={draft} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PreviewPatient({ draft }: { draft: DraftPrefs }) {
  const next = draft.language === "hi" ? "अगली खुराक" : "Next dose";
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 flex flex-col items-center justify-center rounded-xl bg-background p-3">
        <MiniRing pct={75} />
        <p className="mt-1 text-[10px] font-semibold text-muted-foreground">on track</p>
      </div>
      <div className="col-span-2 space-y-2">
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">{next}</p>
          <p className="text-xs font-bold text-foreground">Losartan 50mg</p>
          <p className="text-[10px] text-primary">8:00 PM · after dinner</p>
        </div>
        <div className="grid grid-cols-7 items-end gap-1 rounded-xl bg-background p-2">
          {[88, 92, 76, 100, 95, 70, 75].map((v, i) => (
            <div
              key={i}
              className={[
                "w-full rounded-sm",
                v >= 90 ? "bg-gradient-primary" : v >= 75 ? "bg-success" : "bg-warning",
              ].join(" ")}
              style={{ height: `${Math.max(6, v / 4)}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCaregiver({ draft }: { draft: DraftPrefs }) {
  const took = draft.language === "hi" ? "ने दवा ली" : "took";
  const name = draft.patientName || "Mom";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Adherence</p>
          <p className="font-display text-base font-bold text-success">92%</p>
        </div>
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Missed (7d)</p>
          <p className="font-display text-base font-bold text-warning">2</p>
        </div>
      </div>
      <ul className="space-y-1.5 rounded-xl bg-background p-2">
        {[
          { ok: true, text: `${name} ${took} Metformin`, t: "8:02 AM" },
          { ok: true, text: `${name} ${took} Atorvastatin`, t: "1:05 PM" },
          { ok: false, text: "Reminder sent · Losartan", t: "8:00 PM" },
        ].map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                e.ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
              ].join(" ")}
            >
              <Check className="h-2.5 w-2.5" />
            </span>
            <p className="flex-1 truncate text-[11px] font-medium text-foreground">{e.text}</p>
            <p className="text-[10px] text-muted-foreground">{e.t}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewDoctor({ draft }: { draft: DraftPrefs }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Patients</p>
          <p className="font-display text-base font-bold text-foreground">{draft.patientLoad}</p>
        </div>
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Avg adher.</p>
          <p className="font-display text-base font-bold text-success">81%</p>
        </div>
        <div className="rounded-xl bg-background p-2">
          <p className="text-[9px] font-semibold uppercase text-muted-foreground">High risk</p>
          <p className="font-display text-base font-bold text-destructive">3</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl bg-background">
        {[
          { n: "Rajesh K.", a: 54, r: "high" },
          { n: "Meera I.", a: 71, r: "med" },
          { n: "Anil S.", a: 92, r: "low" },
        ].map((p) => (
          <div
            key={p.n}
            className="flex items-center gap-2 border-b border-border/40 px-2 py-1.5 last:border-0"
          >
            <p className="flex-1 truncate text-[11px] font-semibold text-foreground">{p.n}</p>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
              <div
                className={[
                  "h-full rounded-full",
                  p.a >= 85 ? "bg-success" : p.a >= 70 ? "bg-warning" : "bg-destructive",
                ].join(" ")}
                style={{ width: `${p.a}%` }}
              />
            </div>
            <span className="w-7 text-right text-[10px] font-semibold text-foreground">{p.a}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-14 w-14">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={r} className="fill-none stroke-muted" strokeWidth="6" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          className="fill-none stroke-[hsl(var(--success))]"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold text-foreground">
        {pct}%
      </div>
    </div>
  );
}
