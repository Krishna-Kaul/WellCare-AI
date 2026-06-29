import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, TrendingUp, FileDown } from "lucide-react";

function Ring({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="110" height="110" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke="url(#ring-grad)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Bars() {
  const data = [60, 80, 70, 92, 85, 95, 88];
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex h-24 items-end gap-2">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: `${v}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.06 }}
            className="w-full rounded-t-md bg-gradient-primary"
          />
          <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardSection() {
  return (
    <section id="dashboard" className="bg-white py-20 md:py-28">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Built for <span className="text-gradient-primary">patients</span> &{" "}
            <span className="text-gradient-primary">doctors</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            One platform, two perspectives — perfectly synchronized.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Patient */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-card md:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Patient view
                </div>
                <h3 className="mt-1 font-display text-2xl font-semibold text-foreground">
                  Today’s progress
                </h3>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                On track
              </span>
            </div>

            <div className="mt-6 flex items-center gap-6">
              <div className="relative">
                <Ring value={92} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl font-bold text-foreground">92%</div>
                  <div className="text-[10px] text-muted-foreground">Adherence</div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-foreground">Metformin · 8:00 AM</div>
                    <div className="text-xs text-muted-foreground">Taken</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-lavender p-3">
                  <div className="h-5 w-5 rounded-full border-2 border-lavender-foreground" />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-foreground">Atorvastatin · 2:00 PM</div>
                    <div className="text-xs text-muted-foreground">Upcoming</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-mist p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">This week</div>
                <div className="text-xs text-muted-foreground">Avg 84%</div>
              </div>
              <Bars />
            </div>
          </motion.div>

          {/* Doctor */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-card md:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Doctor view
                </div>
                <h3 className="mt-1 font-display text-2xl font-semibold text-foreground">
                  Clinic overview
                </h3>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <FileDown className="h-3.5 w-3.5" /> Export
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Patients", value: "248", color: "text-foreground" },
                { label: "At-risk", value: "12", color: "text-destructive" },
                { label: "Avg adherence", value: "87%", color: "text-success" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl bg-mist p-4 text-center">
                  <div className={`font-display text-2xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-sm font-semibold text-foreground">High-risk alerts</div>
              {[
                { name: "R. Sharma", note: "3 missed doses · BP meds", risk: "high" },
                { name: "M. Patel", note: "Refill due in 2 days", risk: "med" },
                { name: "A. Khan", note: "Adherence dropped 18%", risk: "high" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      p.risk === "high"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.note}</div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
