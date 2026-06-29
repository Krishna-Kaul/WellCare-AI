import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { clearAuth, getStoredUser, type StoredUser } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Role = NonNullable<StoredUser["role"]>;

interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<Role, NavLink[]> = {
  patient: [
    { to: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/medications", label: "Medicines", icon: Pill },
    { to: "/prescriptions", label: "Prescriptions", icon: ClipboardList },
    { to: "/reminders", label: "Reminders", icon: Bell },
  ],
  doctor: [{ to: "/doctor", label: "Dashboard", icon: LayoutDashboard }],
  caregiver: [
    { to: "/caregiver", label: "Dashboard", icon: LayoutDashboard },
  ],
};

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  patient: {
    label: "Patient",
    className: "bg-accent text-accent-foreground",
  },
  doctor: {
    label: "Doctor",
    className: "bg-success/15 text-success",
  },
  caregiver: {
    label: "Caregiver",
    className: "bg-lavender/40 text-lavender-foreground",
  },
};

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function AppNavbar({
  notificationCount = 0,
}: {
  notificationCount?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const role: Role = (user?.role as Role) ?? "patient";
  const links = useMemo(() => NAV_BY_ROLE[role] ?? NAV_BY_ROLE.patient, [role]);
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.patient;
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Welcome";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    clearAuth();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
          {/* Left — Logo */}
          <Link to="/" className="flex shrink-0 items-center" aria-label="WellCare AI home">
            <Logo className="h-8 md:h-9" />
          </Link>

          {/* Center — desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {links.map((l) => (
              <NavItem key={l.to} link={l} active={isActive(location.pathname, l.to)} />
            ))}
          </nav>

          {/* Right — user + actions (desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            <NotificationBell count={notificationCount} />

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 py-1.5 pl-1.5 pr-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-xs font-bold text-primary-foreground">
                {getInitials(displayName)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="max-w-[140px] truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span
                  className={`mt-0.5 inline-flex w-fit items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-sm font-semibold text-foreground transition-smooth hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>

          {/* Mobile right cluster */}
          <div className="flex items-center gap-1 md:hidden">
            <NotificationBell count={notificationCount} />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted transition-smooth"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden border-t border-border/40 bg-background md:hidden"
            >
              <div className="container-page space-y-3 py-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-mist p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {getInitials(displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {displayName}
                    </p>
                    <span
                      className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {links.map((l) => {
                    const active = isActive(location.pathname, l.to);
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-smooth ${
                          active
                            ? "bg-gradient-primary text-primary-foreground shadow-cta"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <l.icon className="h-4 w-4" />
                        {l.label}
                      </Link>
                    );
                  })}
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile bottom tab bar (only when menu is closed and there are 2+ links) */}
      {links.length > 1 && (
        <nav className="fixed bottom-3 left-3 right-3 z-30 md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-around rounded-3xl border border-border/60 bg-white/95 p-2 shadow-elevated backdrop-blur-xl">
            {links.map((l) => {
              const active = isActive(location.pathname, l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition-smooth ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <l.icon className={`h-5 w-5 ${active ? "" : ""}`} />
                  <span className="text-[10px] font-semibold">{l.label}</span>
                  {active && (
                    <motion.span
                      layoutId="bottom-active-dot"
                      className="absolute -top-1 h-1 w-6 rounded-full bg-gradient-primary"
                    />
                  )}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-muted-foreground transition-smooth hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Logout</span>
            </button>
          </div>
        </nav>
      )}

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of WellCare AI?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* -------------------- Sub-components -------------------- */

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      to={link.to} 
      className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-smooth ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <link.icon className="h-4 w-4" />
      {link.label}
      {active && (
        <motion.span
          layoutId="navbar-active-pill"
          className="absolute inset-0 -z-10 rounded-xl bg-accent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
    </Link>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      to="/reminders"
      aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

/* -------------------- Helpers -------------------- */

function isActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === to || pathname.startsWith("/dashboard/");
  return pathname === to || pathname.startsWith(to + "/");
}

/* Re-export role icons for consumers if needed */
export { Pill, Stethoscope, User };