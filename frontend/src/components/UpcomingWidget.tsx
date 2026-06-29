import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Utensils, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeaders, getAuthToken } from "@/lib/auth";

interface UpcomingDose {
  log_id: number;
  medicine_name: string;
  strength?: string | null;
  before_meal?: boolean;
  scheduled_time: string;
  status: string;
  minutes_until: number;
}

function formatIn(min: number) {
  if (min <= 0) return "Due now";
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function UpcomingWidget({ limit = 2 }: { limit?: number }) {
  const [items, setItems] = useState<UpcomingDose[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!getAuthToken()) {
        setLoading(false);
        setItems([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/reminders/upcoming?hours=24`, {
          headers: authHeaders(),
        });
        if (res.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed");
        const data: UpcomingDose[] = await res.json();
        if (!cancelled) setItems(data.slice(0, limit));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [limit]);

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-cta">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Upcoming doses</h3>
            <p className="text-xs text-muted-foreground">Next {limit} reminders</p>
          </div>
        </div>
        <Link
          to="/reminders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((d, i) => (
              <motion.div
                key={d.log_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {d.medicine_name}
                    {d.strength ? <span className="text-muted-foreground"> · {d.strength}</span> : null}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(d.scheduled_time)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Utensils className="h-3 w-3" />
                      {d.before_meal ? "Before meal" : "After meal"}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                  {formatIn(d.minutes_until)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">No upcoming doses</p>
          <p className="mt-1 text-xs text-muted-foreground">You're all caught up for now.</p>
        </div>
      )}
    </div>
  );
}

export default UpcomingWidget;