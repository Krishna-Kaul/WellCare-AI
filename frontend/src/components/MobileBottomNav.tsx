import { Home, Pill, ScanLine, BarChart3, User } from "lucide-react";

const items = [
  { icon: Home, label: "Home" },
  { icon: Pill, label: "Medicines" },
  { icon: ScanLine, label: "Scan", primary: true },
  { icon: BarChart3, label: "Reports" },
  { icon: User, label: "Profile" },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-3xl border border-border/60 bg-white/95 p-2 shadow-elevated backdrop-blur-xl">
        {items.map((it) => (
          <button
            key={it.label}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-smooth ${
              it.primary
                ? "-mt-6 bg-gradient-primary px-4 py-3 text-white shadow-cta"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <it.icon className={it.primary ? "h-6 w-6" : "h-5 w-5"} />
            <span className="text-[10px] font-semibold">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
