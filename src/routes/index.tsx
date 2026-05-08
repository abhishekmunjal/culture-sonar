import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Layers, FileDown, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrgPulse — Diagnose org health in minutes, not weeks" },
      { name: "description", content: "AI-native diagnostic for People & Organisation consultants. Upload HRMS, engagement and 1:1 data — get risk signals, plain-English explanations, and ready-to-action interventions." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/login" search={{ mode: "signup" }}>
              <Button size="sm">Get started <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 md:pt-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> For People & Organisation consultants
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Diagnose org health <span className="italic text-accent">in minutes</span>, not weeks.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              OrgPulse turns raw HRMS, engagement and 1:1 data into a partner-grade diagnostic — with plain-English risk signals and interventions you can defend in the room.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" search={{ mode: "signup" }}>
                <Button size="lg">Start a diagnosis <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </Link>
              <Link to="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-4">
            {[
              { k: "60s", v: "from upload to verdict" },
              { k: "3", v: "data sources joined automatically" },
              { k: "Plain English", v: "no jargon, no hedging" },
              { k: "1-page PDF", v: "ready for the C-suite" },
            ].map((s) => (
              <div key={s.k} className="bg-surface p-6">
                <div className="font-display text-2xl font-semibold">{s.k}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold">Built for the workshop, not the back office.</h2>
              <p className="mt-4 text-muted-foreground">
                Every signal comes with a severity, the cohort it lives in, evidence, and 2+ interventions tagged by priority and effort. The "Do this first" flag tells the room where to start.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { icon: Layers, t: "Multi-source", d: "HRMS · Engagement · 1:1 tracker — joined by Employee ID." },
                { icon: Activity, t: "Risk signals", d: "Three concrete diagnoses with evidence and confidence." },
                { icon: ShieldCheck, t: "Interventions", d: "Tagged by priority × effort, with an ROI-first 'Do this first'." },
                { icon: FileDown, t: "One-page PDF", d: "Generate a client-ready summary in a click." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-4 rounded-lg border border-border bg-surface p-4">
                  <Icon className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <Logo className="text-sm" />
          <span>Prototype · OrgPulse</span>
        </div>
      </footer>
    </div>
  );
}
