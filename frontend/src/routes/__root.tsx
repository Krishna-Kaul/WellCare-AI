import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Toaster } from "@/components/ui/sonner";
import { MedicationAlarmSystem } from "@/components/MedicationAlarmSystem";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WellCare AI — Smarter Care, Every Day" },
      {
        name: "description",
        content:
          "AI-powered medication reminders, prescription scanning, caregiver alerts and doctor insights.",
      },
      { name: "author", content: "WellCare AI" },
      { property: "og:title", content: "WellCare AI — Smarter Care, Every Day" },
      {
        property: "og:description",
        content:
          "AI-powered medication reminders, prescription scanning, caregiver alerts and doctor insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
  {
    rel: "stylesheet",
    href: appCss,
  },
  {
    rel: "manifest",
    href: "/manifest.json",
  },
  {
    rel: "apple-touch-icon",
    href: "/icon-192.png",
  },
],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.error("SW registration failed:", err));
      });
    }
  }, []);

  return (
    <>
      <Outlet />
      <MedicationAlarmSystem />
      <VoiceAssistant />
      <Toaster position="top-center" richColors />
    </>
  );
}