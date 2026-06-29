import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-gradient-cta" />
      {/* abstract medical shapes */}
      <div className="pointer-events-none absolute -top-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <svg
        className="pointer-events-none absolute right-10 top-10 hidden h-32 w-32 text-white/10 md:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2a2 2 0 00-2 2v6H4a2 2 0 100 4h6v6a2 2 0 104 0v-6h6a2 2 0 100-4h-6V4a2 2 0 00-2-2z" />
      </svg>
      <svg
        className="pointer-events-none absolute left-10 bottom-10 hidden h-24 w-24 text-white/10 md:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>

      <div className="container-page relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center text-white"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Start Smarter Healthcare Today
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/85 md:text-lg">
            Join thousands of families and clinics who trust WellCare with what matters most.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-14 rounded-2xl bg-white px-8 text-base font-semibold text-primary shadow-elevated hover:bg-white/95"
            >
              Get Started Free
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl border-2 border-white/40 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              <Calendar className="mr-1 h-4 w-4" />
              Book Clinic Demo
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
