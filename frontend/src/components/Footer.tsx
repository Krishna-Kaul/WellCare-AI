import { Twitter, Linkedin, Instagram, Github } from "lucide-react";
import { Logo } from "@/components/Logo";

const groups = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Mobile App", "Doctor Dashboard"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Support", "Help Center", "Blog", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Compliance"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-white">
      <div className="container-page py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo className="h-9" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Smarter Care, Every Day. AI-powered medication management for patients, families &
              clinics.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition-smooth hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <div className="text-sm font-semibold text-foreground">{g.title}</div>
              <ul className="mt-4 space-y-3">
                {g.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WellCare AI. All rights reserved.
          </div>
          <div className="text-xs text-muted-foreground">Made with care in India 🇮🇳</div>
        </div>
      </div>
    </footer>
  );
}
