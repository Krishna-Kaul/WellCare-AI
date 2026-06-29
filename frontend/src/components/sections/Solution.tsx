import { motion } from "framer-motion";
import { ScanLine, Bell, Mic, Users, Stethoscope, RefreshCw } from "lucide-react";

const features = [
  {
    icon: ScanLine,
    title: "Smart Prescription Scanner",
    desc: "Upload any prescription — our AI OCR extracts medicine name, dose, timing & duration in seconds.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Bell,
    title: "Adaptive Reminders",
    desc: "Reminders learn your behavior — gentle nudges that actually fit into your day.",
    accent: "bg-lavender text-lavender-foreground",
  },
  {
    icon: Mic,
    title: "Voice Assistant",
    desc: "Hands-free in Hindi & English. Ask “Did I take my morning dose?” and get answers.",
    accent: "bg-success/10 text-success",
  },
  {
    icon: Users,
    title: "Caregiver Alerts",
    desc: "Missed dose? Family is instantly notified — accountability without the awkward calls.",
    accent: "bg-warning/10 text-warning",
  },
  {
    icon: Stethoscope,
    title: "Doctor Dashboard",
    desc: "Real-world adherence analytics so clinicians can intervene before complications start.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: RefreshCw,
    title: "Refill Intelligence",
    desc: "Predictive refill alerts — never run out of critical medication again.",
    accent: "bg-lavender text-lavender-foreground",
  },
];

export function Solution() {
  return (
    <section id="features" className="bg-white py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            One platform. Six superpowers.
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything you need for <span className="text-gradient-primary">smarter care</span>.
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Built around real patients, real families, and real clinicians.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="hover-lift group rounded-3xl border border-border/60 bg-gradient-card p-7 shadow-soft"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.accent}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
