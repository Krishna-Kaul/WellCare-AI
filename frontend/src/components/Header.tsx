import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Dashboard", href: "#dashboard" },
  // { label: "Pricing", href: "#pricing" },  
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between md:h-20">
        <Link to="/" className="flex items-center">
          <Logo className="h-8 md:h-9" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-foreground hover:bg-muted transition-smooth"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-cta hover:opacity-95 transition-smooth"
          >
            Get Started
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 px-1">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-cta"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
