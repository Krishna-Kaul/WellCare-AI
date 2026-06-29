import { motion } from "framer-motion";
import { Star } from "lucide-react";
import t1 from "@/assets/testimonial-1.jpg";
import t2 from "@/assets/testimonial-2.jpg";
import t3 from "@/assets/testimonial-3.jpg";

const testimonials = [
  {
    quote:
      "I have diabetes and high BP. Before WellCare, I missed doses constantly. Now my morning starts with a gentle reminder — and my sugar levels have never been more stable.",
    name: "Sunita Verma",
    role: "Living with diabetes · Pune",
    img: t1,
  },
  {
    quote:
      "I live in Bangalore, my father is in Lucknow. WellCare lets me see if he took his evening tablets without calling him every night. It’s changed our relationship.",
    name: "Priya Iyer",
    role: "Daughter · Caregiver",
    img: t2,
  },
  {
    quote:
      "The doctor dashboard gives me real adherence data — not what patients say, but what they actually do. I can intervene weeks earlier. It’s clinical gold.",
    name: "Dr. Arjun Mehta",
    role: "Internal Medicine · Apollo",
    img: t3,
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Loved by <span className="text-gradient-primary">families & clinicians</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Real stories from real users.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="flex flex-col rounded-3xl border border-border/60 bg-gradient-card p-7 shadow-card"
            >
              <div className="flex gap-1 text-warning">
                {[...Array(5)].map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
