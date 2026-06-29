import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroPhone from "@/assets/hero-phone.png";

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-lavender/40 blur-3xl" />

      <div className="container-page relative grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-8 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-start"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered medication intelligence
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Never Miss a <span className="text-gradient-primary">Dose</span> Again
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            AI-powered medication reminders, prescription scanning, caregiver alerts, and doctor
            insights — all in one beautifully simple platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-14 rounded-2xl bg-gradient-primary px-7 text-base font-semibold shadow-cta hover:opacity-95">
              <Link to="/login">
                Get Started
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl border-2 px-7 text-base font-semibold hover:bg-muted"
              onClick={() => setShowDemo(true)}
            >
              <Play className="mr-1 h-4 w-4 fill-current" />
              Watch Demo
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              HIPAA-aware
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              End-to-end encrypted
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="relative flex items-center justify-center lg:justify-end"
        >
          {/* Glow */}
          <div className="absolute inset-0 -z-10 m-auto h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

          <div className="animate-float relative">
            <img
              src={heroPhone}
              alt="WellCare app dashboard showing medication adherence ring at 92% with daily medicine schedule"
              className="relative z-10 mx-auto h-auto w-[300px] drop-shadow-2xl sm:w-[380px] md:w-[440px] lg:w-[500px]"
              width={500}
              height={500}
            />
          </div>

          {/* Floating UI cards */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-2 top-12 z-20 hidden rounded-2xl border border-border/60 bg-white/90 p-3 shadow-elevated backdrop-blur md:block"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Dose Taken</div>
                <div className="text-[10px] text-muted-foreground">Metformin · 8:00 AM</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-2 right-4 z-20 hidden rounded-2xl border border-border/60 bg-white/90 p-3 shadow-elevated backdrop-blur md:block"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender">
                <Sparkles className="h-5 w-5 text-lavender-foreground" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">AI Scan Ready</div>
                <div className="text-[10px] text-muted-foreground">3 medicines extracted</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="text-lg font-semibold text-foreground">Demo Video</div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                onClick={() => setShowDemo(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video
              controls
              autoPlay
              className="h-[70vh] w-full bg-black"
              src="/WellCare-demo-video.mp4"
            />
          </div>
        </div>
      )}
    </section>
  );
}
