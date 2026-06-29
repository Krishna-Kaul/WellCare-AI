import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { setAuthToken, setStoredUser, API_BASE_URL } from "@/lib/auth";
import { savePrefs } from "@/lib/user-prefs";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in to WellCare AI — Smarter Care, Every Day" },
      {
        name: "description",
        content:
          "Sign in or create your WellCare AI account. Access medication reminders, prescription scanning, caregiver alerts and doctor insights.",
      },
      { property: "og:title", content: "Sign in to WellCare AI" },
      {
        property: "og:description",
        content: "Access your WellCare AI account — smarter, safer medication care every day.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const navigate = useNavigate();

  // After login/signup: route based on role returned from backend
  const handleSuccess = (role: string) => {
    if (role === "patient") navigate({ to: "/patient/dashboard" });
    else if (role === "doctor") navigate({ to: "/doctor" });
    else if (role === "caregiver") navigate({ to: "/caregiver" });
    else navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-lavender/40 blur-3xl" />

      <header className="relative z-10">
        <div className="container-page flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 md:h-9" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-smooth hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="relative z-10 container-page grid gap-12 pb-16 pt-4 lg:grid-cols-2 lg:gap-16 lg:pt-10">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden flex-col justify-center lg:flex"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Smarter Care, Every Day
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">
            Your health journey,
            <br />
            <span className="text-primary">simplified</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Join thousands of patients, caregivers, and doctors who trust WellCare AI.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="flex items-center justify-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/80 p-6 shadow-xl backdrop-blur-md md:p-8">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="email" className="flex-1">
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex-1">
                  Phone / OTP
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <div className="mb-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      mode === "signin"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      mode === "signup"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign up
                  </button>
                </div>
                <EmailForm mode={mode} onSuccess={handleSuccess} />
              </TabsContent>

              <TabsContent value="phone">
                <OtpForm onSuccess={handleSuccess} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.section>
      </main>
      <Toaster />
    </div>
  );
}

function EmailForm({ mode, onSuccess }: { mode: Mode; onSuccess: (role: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"patient" | "caregiver" | "doctor">("patient");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    if (mode === "signup") {
      if (name.trim().length < 2) e.name = "Please enter your full name";
      if (!phone.trim()) {
        e.phone = "Phone number is required for WhatsApp reminders";
      } else if (!/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
        e.phone = "Please enter a valid E.164 phone number (e.g. +919876543210)";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const body =
        mode === "signup" ? { name: name.trim(), email, password, role, phone: phone.trim() } : { email, password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail ?? "Something went wrong. Please try again.");
        return;
      }

      // Store token + user info
      setAuthToken(data.access_token);
      setStoredUser({
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as "patient" | "caregiver" | "doctor",
      });

      // Sync prefs so dashboard can read role without onboarding
      savePrefs({
        role: data.user.role as "patient" | "caregiver" | "doctor",
        name: data.user.name,
        language: "en",
        reminderTone: "standard",
        completedAt: new Date().toISOString(),
      });

      toast.success(mode === "signin" ? "Welcome back!" : "Account created — welcome to WellCare!");
      onSuccess(data.user.role);
    } catch {
      toast.error("Network error. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-foreground">
              Full name
            </Label>
            <Input
              id="name"
              placeholder="Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-phone" className="text-xs font-semibold text-foreground">
              Phone Number (E.164 format, e.g. +919876543210)
            </Label>
            <Input
              id="signup-phone"
              type="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </>
      )}


      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold text-foreground">
          Email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold text-foreground">
            Password
          </Label>
          {mode === "signin" && (
            <a href="#" className="text-xs font-semibold text-primary hover:underline">
              Forgot?
            </a>
          )}
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">I am a…</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["patient", "caregiver", "doctor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-colors ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-gradient-primary font-semibold shadow-cta hover:opacity-95"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…
          </>
        ) : mode === "signin" ? (
          "Sign in"
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}

function OtpForm({ onSuccess: _onSuccess }: { onSuccess: (role: string) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
    toast.info("Phone auth is not yet connected — use the Email tab for now.");
  };

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
          Mobile number
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      {sent && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Enter OTP</Label>
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="button"
            onClick={() => toast.info("Backend OTP verification not yet implemented.")}
            className="mt-2 h-11 w-full rounded-xl"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Verify OTP
          </Button>
        </div>
      )}

      {!sent && (
        <Button
          type="submit"
          disabled={loading || phone.length < 8}
          className="h-11 w-full rounded-xl bg-gradient-primary font-semibold"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send OTP
        </Button>
      )}
    </form>
  );
}
