import { motion } from "framer-motion";
import { Upload, Brain, HeartPulse } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Upload,
    title: "Upload Prescription",
    desc: "Snap a photo or upload a PDF. Works with handwritten and printed scripts.",
  },
  {
    n: "02",
    icon: Brain,
    title: "AI Builds Your Plan",
    desc: "Our model extracts every medicine, dose, and timing — then builds a personalized schedule.",
  },
  {
    n: "03",
    icon: HeartPulse,
    title: "Stay Healthy",
    desc: "Smart reminders, family alerts, and doctor insights keep you on track every single day.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative bg-mist py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Three steps to <span className="text-gradient-primary">peace of mind</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Setup takes under 60 seconds. Results last a lifetime.
          </p>
        </motion.div>

        <div className="relative mt-16">
          {/* Connecting line desktop */}
          <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/20" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                    <s.icon className="h-10 w-10 text-white" strokeWidth={1.8} />
                  </div>
                </div>
                <div className="mt-5 font-display text-xs font-bold tracking-widest text-primary">
                  STEP {s.n}
                </div>
                <h3 className="mt-2 font-display text-xl font-semibold text-foreground md:text-2xl">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
