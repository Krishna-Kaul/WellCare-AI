import { motion } from "framer-motion";
import appShowcase from "@/assets/app-showcase.png";
import { Smartphone } from "lucide-react";

const screens = [
  "Today's Schedule",
  "Smart Reminders",
  "Prescription Scan",
  "Adherence Graph",
  "Voice Assistant",
  "Family Monitor",
];

export function AppShowcase() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-mist to-white py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Smartphone className="h-3.5 w-3.5" />
            Designed for your pocket
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            A native-quality app that{" "}
            <span className="text-gradient-primary">just feels right</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Every screen is crafted for clarity. Large taps, gentle motion, zero clutter.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mt-12"
        >
          <div className="absolute inset-0 -z-10 m-auto h-72 max-w-3xl rounded-full bg-primary/10 blur-3xl" />
          <img
            src={appShowcase}
            alt="WellCare app screens — medicine schedule, prescription scanner, weekly adherence graph"
            className="mx-auto h-auto w-full max-w-5xl"
            loading="lazy"
            width={1600}
            height={900}
          />
        </motion.div>

        {/* Screen labels carousel mobile */}
        <div className="mt-8 flex gap-3 overflow-x-auto px-2 pb-2 no-scrollbar md:justify-center md:flex-wrap">
          {screens.map((s) => (
            <span
              key={s}
              className="shrink-0 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-soft"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
