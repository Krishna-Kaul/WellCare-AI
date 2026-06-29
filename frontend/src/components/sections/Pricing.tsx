import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "Perfect for getting started.",
    features: [
      "Basic medication reminders",
      "1 prescription scan / month",
      "Progress tracking",
      "Single user",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Premium",
    price: "₹299",
    period: "/month",
    desc: "For families who want it all.",
    features: [
      "Unlimited prescription scans",
      "Family monitoring (up to 5)",
      "Voice AI assistant (Hindi + English)",
      "Advanced adherence analytics",
      "Refill intelligence",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Clinic",
    price: "Custom",
    period: "",
    desc: "Built for healthcare providers.",
    features: [
      "Multi-patient dashboard",
      "Real-time alert center",
      "Compliance reports & exports",
      "EHR integrations",
      "Priority onboarding & training",
      "Dedicated success manager",
    ],
    cta: "Book a demo",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-mist py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Simple, <span className="text-gradient-primary">transparent</span> pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Start free. Upgrade when you need more.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`relative flex flex-col rounded-3xl border p-7 md:p-8 ${
                p.featured
                  ? "border-primary/30 bg-gradient-card shadow-elevated lg:scale-105"
                  : "border-border/60 bg-white shadow-soft"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-cta">
                  <Sparkles className="h-3 w-3" /> Most popular
                </div>
              )}
              <div>
                <div className="font-display text-lg font-semibold text-foreground">{p.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-foreground md:text-5xl">
                  {p.price}
                </span>
                {p.period && <span className="text-sm text-muted-foreground">{p.period}</span>}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${p.featured ? "bg-gradient-primary" : "bg-success/15"}`}
                    >
                      <Check
                        className={`h-3 w-3 ${p.featured ? "text-white" : "text-success"}`}
                        strokeWidth={3}
                      />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className={`mt-7 h-12 w-full rounded-2xl font-semibold ${
                  p.featured
                    ? "bg-gradient-primary text-white shadow-cta hover:opacity-95"
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}
              >
                {p.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
