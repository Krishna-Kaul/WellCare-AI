import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Hero } from "@/components/sections/Hero";
import { TrustMetrics } from "@/components/sections/TrustMetrics";
import { ProblemStory } from "@/components/sections/ProblemStory";
import { Solution } from "@/components/sections/Solution";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { AppShowcase } from "@/components/sections/AppShowcase";
import { DashboardSection } from "@/components/sections/DashboardSection";
import { WhyWellCare } from "@/components/sections/WhyWellCare";
import { Testimonials } from "@/components/sections/Testimonials";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WellCare AI — Smarter Care, Every Day" },
      {
        name: "description",
        content:
          "AI-powered medication reminders, prescription scanning, caregiver alerts, and doctor insights. Never miss a dose again with WellCare.",
      },
      { property: "og:title", content: "WellCare AI — Smarter Care, Every Day" },
      {
        property: "og:description",
        content:
          "AI-powered medication reminders, prescription scanning, caregiver alerts & doctor insights — all in one platform.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-24 md:pb-0">
        <Hero />
        <TrustMetrics />
        <ProblemStory />
        <Solution />
        <HowItWorks />
        <AppShowcase />
        <DashboardSection />
        <WhyWellCare />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
