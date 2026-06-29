import { motion } from "framer-motion";
import { AlertCircle, Heart, ArrowRight } from "lucide-react";

const problems = [
  { title: "People forget medicines", desc: "60% of patients miss at least one dose every week." },
  {
    title: "Elderly users get confused",
    desc: "Complex schedules overwhelm seniors managing 5+ drugs daily.",
  },
  {
    title: "Chronic patients skip treatment",
    desc: "Diabetes & hypertension worsen without consistent adherence.",
  },
  {
    title: "Families lack visibility",
    desc: "Loved ones can’t tell if mom took her evening dose.",
  },
  {
    title: "Doctors lose adherence data",
    desc: "Real-world treatment outcomes remain a black box.",
  },
];

export function ProblemStory() {
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
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            The hidden healthcare crisis
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Medication non-adherence costs <span className="text-destructive">lives</span> and
            billions every year.
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Behind every missed dose is a story — a forgotten alarm, a confused parent, a worried
            daughter.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="rounded-3xl border border-border/60 bg-white p-6 shadow-soft"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Hope transition */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-16 overflow-hidden rounded-3xl border border-border/60 bg-gradient-lavender p-8 text-center md:p-12"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft">
            <Heart className="h-7 w-7 fill-primary text-primary" />
          </div>
          <h3 className="mt-5 font-display text-2xl font-bold text-foreground md:text-3xl">
            But it doesn’t have to be this way.
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            WellCare turns medication management into something effortless, intelligent, and deeply
            human.
          </p>
          <a
            href="#features"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-smooth"
          >
            See how it works
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
