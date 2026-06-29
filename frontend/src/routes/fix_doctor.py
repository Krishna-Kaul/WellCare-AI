with open('c:/Users/pranj/Desktop/WellCare_PWA/frontend/src/routes/doctor.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('function TodayTab'):
        break
    # the mangled utf-16 lines start with space
    if line.startswith(' f u n c t i o n   T o d a y T a b'):
        break
    new_lines.append(line)

code_to_add = """
function TodayTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReminderItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/doctor/patients/${patientId}/reminders`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ReminderItem[] | { reminders: ReminderItem[] };
        const list = Array.isArray(json) ? json : (json.reminders ?? []);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No reminders for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
        Today's schedule
      </p>
      {items.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
        >
          <div className="flex h-10 w-12 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <span className="text-[11px] font-bold leading-none">
              {formatTime(r.scheduled_time)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {r.medicine_name}
              {r.strength && (
                <span className="font-medium text-muted-foreground"> · {r.strength}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {r.meal_timing ? `${r.meal_timing} meal` : "Anytime"}
            </p>
          </div>
          <StatusPill status={r.status} />
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    taken: { label: "Taken", className: "bg-success/15 text-success" },
    missed: { label: "Missed", className: "bg-destructive/10 text-destructive" },
    pending: { label: "Pending", className: "bg-accent text-accent-foreground" },
  };
  const c = cfg[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatTime(t: string) {
  if (/^\\d{2}:\\d{2}/.test(t)) return t.slice(0, 5);
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { /* ignore */ }
  return t;
}
"""

with open('c:/Users/pranj/Desktop/WellCare_PWA/frontend/src/routes/doctor.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write(code_to_add)
