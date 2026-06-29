import { motion } from "framer-motion";
import { Layers, Heart, Globe, Users, Zap, Building2 } from "lucide-react";

const items = [
  {
    icon: Layers,
    title: "All-in-one",
    desc: "OCR, reminders, voice & analytics — unified, not bolted together.",
  },
  {
    icon: Heart,
    title: "Elder-friendly UX",
    desc: "Large taps, simple flows, voice fallback. Built for everyone.",
  },
  {
    icon: Globe,
    title: "India-first multilingual",
    desc: "Hindi, English, regional languages — natural voice support.",
  },
  {
    icon: Users,
    title: "Family accountability",
    desc: "Loved ones stay in the loop without being intrusive.",
  },
  {
    icon: Zap,
    title: "Predictive healthcare",
    desc: "ML signals catch deterioration before it becomes a crisis.",
  },
  {
    icon: Building2,
    title: "B2C + B2B scale",
    desc: "Patients, families, clinics, and enterprises — one stack.",
  },
];

export function WhyWellCare() {
  return (
    <section className="bg-mist py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Why <span className="text-gradient-primary">WellCare</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            What sets us apart isn’t one feature. It’s the system.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="hover-lift rounded-3xl border border-border/60 bg-white p-6 shadow-soft"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-lavender">
                  <it.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {it.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
