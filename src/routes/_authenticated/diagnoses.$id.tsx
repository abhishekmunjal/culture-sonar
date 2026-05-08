import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileDown, RefreshCw, Sparkles, Star, Trash2 } from "lucide-react";
import { exportDiagnosisPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/diagnoses/$id")({
  head: () => ({ meta: [{ title: "Diagnosis — OrgPulse" }] }),
  component: DiagnosisPage,
});

type Risk = {
  title: string;
  severity: "critical" | "elevated" | "watch";
  cohort: string;
  evidence: string;
  plain_english_explanation: string;
  confidence: "high" | "medium" | "low";
  interventions: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    effort: "low" | "medium" | "high";
    expected_impact: string;
    do_first?: boolean;
  }[];
};

type Result = {
  verdict: string;
  health_score: number;
  kpis: {
    headcount: number;
    attrition_pct: number;
    avg_tenure_yrs: number | null;
    overall: {
      avg_engagement: number | null;
      avg_manager_effectiveness: number | null;
      avg_enps: number | null;
      avg_career_growth: number | null;
      avg_work_life: number | null;
      avg_recognition: number | null;
      avg_belonging: number | null;
    };
    one_line?: string;
    one_on_one_signals?: { high_attrition_risk: number; looking_elsewhere: number; total: number };
  };
  cohorts: {
    tenure: { band: string; headcount: number; attrition_pct: number }[];
    department: { department: string; headcount: number; attrition_pct: number; avg_engagement: number | null }[];
    managers: { manager: string; responses: number; avg_engagement: number | null; avg_manager_effectiveness: number | null; avg_enps: number | null }[];
  };
  risks: Risk[];
};

type Diag = { id: string; client_name: string; status: string; notes: string | null };

function DiagnosisPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [diag, setDiag] = useState<Diag | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const [{ data: d }, { data: r }] = await Promise.all([
        supabase.from("diagnoses").select("id, client_name, status, notes").eq("id", id).maybeSingle(),
        supabase.from("diagnosis_results").select("*").eq("diagnosis_id", id).maybeSingle(),
      ]);
      if (cancelled) return;
      setDiag(d as Diag | null);
      if (r) setResult(r as unknown as Result);
      if (d?.status === "ready" || d?.status === "failed") {
        setPolling(false);
      } else {
        timer = setTimeout(tick, 2500);
      }
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  const rerun = async () => {
    setPolling(true);
    await supabase.from("diagnoses").update({ status: "analyzing", notes: null }).eq("id", id);
    setDiag((d) => (d ? { ...d, status: "analyzing", notes: null } : d));
    const { analyzeDiagnosis } = await import("@/lib/analyze.functions");
    analyzeDiagnosis({ data: { diagnosisId: id } }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
    // Re-poll
    const tick = async () => {
      const { data: d } = await supabase.from("diagnoses").select("id, client_name, status, notes").eq("id", id).maybeSingle();
      const { data: r } = await supabase.from("diagnosis_results").select("*").eq("diagnosis_id", id).maybeSingle();
      setDiag(d as Diag | null);
      if (r) setResult(r as unknown as Result);
      if (d?.status === "ready" || d?.status === "failed") setPolling(false);
      else setTimeout(tick, 2500);
    };
    tick();
  };

  const remove = async () => {
    if (!confirm("Delete this diagnosis? This cannot be undone.")) return;
    await supabase.from("diagnoses").delete().eq("id", id);
    navigate({ to: "/diagnoses" });
  };

  if (!diag) {
    return <main className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link to="/diagnoses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> All diagnoses
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
          <Button variant="outline" size="sm" onClick={rerun} disabled={polling}>
            <RefreshCw className={"mr-1.5 h-4 w-4 " + (polling ? "animate-spin" : "")} /> Re-run
          </Button>
          {result && (
            <Button size="sm" onClick={() => exportDiagnosisPdf(diag.client_name, result)}>
              <FileDown className="mr-1.5 h-4 w-4" /> Generate client-ready summary
            </Button>
          )}
        </div>
      </div>

      <h1 className="mt-4 font-display text-3xl font-semibold">{diag.client_name}</h1>

      {diag.status === "analyzing" && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-surface p-6">
          <Sparkles className="h-5 w-5 animate-pulse text-accent" />
          <div>
            <div className="font-medium">Analyzing your data…</div>
            <div className="text-sm text-muted-foreground">Computing cohorts, calling AI, generating interventions. ~15–30s.</div>
          </div>
        </div>
      )}

      {diag.status === "failed" && (
        <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-6">
          <div className="font-medium text-destructive">Analysis failed</div>
          <div className="mt-1 text-sm">{diag.notes ?? "Unknown error"}</div>
          <Button className="mt-3" variant="outline" size="sm" onClick={rerun}>Try again</Button>
        </div>
      )}

      {result && diag.status === "ready" && <Dashboard result={result} />}
    </main>
  );
}

const sevStyles: Record<string, string> = {
  critical: "bg-critical text-critical-foreground",
  elevated: "bg-elevated text-elevated-foreground",
  watch: "bg-watch text-watch-foreground",
};
const verdictStyles: Record<string, string> = {
  Critical: "bg-critical text-critical-foreground",
  "At Risk": "bg-elevated text-elevated-foreground",
  Watch: "bg-watch text-watch-foreground",
  Healthy: "bg-positive text-positive-foreground",
};

function Dashboard({ result }: { result: Result }) {
  return (
    <div className="mt-6 space-y-8">
      {/* Verdict band */}
      <div className={`rounded-2xl px-7 py-6 ${verdictStyles[result.verdict] ?? "bg-primary text-primary-foreground"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest opacity-80">Verdict</span>
          <span className="font-display text-2xl font-semibold">{result.verdict}</span>
          <span className="ml-auto rounded-full bg-black/15 px-3 py-1 text-sm font-medium">
            Score {Math.round(result.health_score)}/100
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-lg leading-snug">{result.kpis.one_line}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Headcount" value={String(result.kpis.headcount)} />
        <Kpi label="Attrition" value={`${result.kpis.attrition_pct.toFixed(1)}%`} tone={result.kpis.attrition_pct > 15 ? "bad" : "ok"} />
        <Kpi label="Avg tenure" value={result.kpis.avg_tenure_yrs ? `${result.kpis.avg_tenure_yrs.toFixed(1)} yrs` : "—"} />
        <Kpi label="Engagement" value={result.kpis.overall.avg_engagement ? result.kpis.overall.avg_engagement.toFixed(2) : "—"} sub="of 5" />
        <Kpi label="eNPS" value={result.kpis.overall.avg_enps !== null ? Math.round(result.kpis.overall.avg_enps).toString() : "—"} tone={(result.kpis.overall.avg_enps ?? 0) < 0 ? "bad" : "ok"} />
      </div>

      {/* Risks */}
      <section>
        <h2 className="font-display text-xl font-semibold">Risk signals</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {result.risks.map((r, i) => (
            <RiskCard key={i} risk={r} />
          ))}
        </div>
      </section>

      {/* Cohort tables */}
      <section className="grid gap-6 lg:grid-cols-2">
        <CohortCard
          title="Attrition by tenure"
          rows={result.cohorts.tenure.map((t) => ({
            label: t.band,
            sub: `${t.headcount} people`,
            metric: `${t.attrition_pct.toFixed(1)}% left`,
            warn: t.attrition_pct > 25,
          }))}
        />
        <CohortCard
          title="Manager hot-spots (lowest effectiveness)"
          rows={result.cohorts.managers.map((m) => ({
            label: m.manager,
            sub: `${m.responses} responses`,
            metric: m.avg_manager_effectiveness ? `${m.avg_manager_effectiveness.toFixed(2)} / 5` : "—",
            warn: (m.avg_manager_effectiveness ?? 5) < 3,
          }))}
        />
      </section>

      <section>
        <CohortCard
          title="Department breakdown"
          rows={result.cohorts.department.map((d) => ({
            label: d.department,
            sub: `${d.headcount} people · engagement ${d.avg_engagement ? d.avg_engagement.toFixed(2) : "—"}`,
            metric: `${d.attrition_pct.toFixed(1)}% attrition`,
            warn: d.attrition_pct > 20,
          }))}
        />
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 font-display text-2xl font-semibold " + (tone === "bad" ? "text-critical" : "")}>{value}{sub && <span className="ml-1 text-xs font-normal text-muted-foreground">{sub}</span>}</div>
    </div>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Badge className={sevStyles[risk.severity] + " uppercase tracking-wider"}>{risk.severity}</Badge>
        <span className="text-xs text-muted-foreground">{risk.confidence} confidence</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{risk.title}</h3>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Cohort</div>
      <div className="text-sm">{risk.cohort}</div>
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Evidence</div>
      <div className="text-sm">{risk.evidence}</div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{risk.plain_english_explanation}</p>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recommended interventions</div>
        <ul className="space-y-3">
          {risk.interventions.map((i, idx) => (
            <li key={idx} className={"rounded-lg border p-3 " + (i.do_first ? "border-accent bg-accent/10" : "border-border bg-background")}>
              <div className="flex items-start gap-2">
                {i.do_first && <Star className="mt-0.5 h-4 w-4 flex-shrink-0 fill-accent text-accent" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{i.title}</span>
                    {i.do_first && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Do first</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{i.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
                    <span className={"rounded-full px-2 py-0.5 " + tagPriority(i.priority)}>P: {i.priority}</span>
                    <span className={"rounded-full px-2 py-0.5 " + tagEffort(i.effort)}>E: {i.effort}</span>
                  </div>
                  <div className="mt-1.5 text-xs italic text-muted-foreground">→ {i.expected_impact}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function tagPriority(p: string) {
  if (p === "high") return "bg-critical/15 text-critical";
  if (p === "medium") return "bg-elevated/15 text-elevated";
  return "bg-muted text-muted-foreground";
}
function tagEffort(e: string) {
  if (e === "low") return "bg-positive/15 text-positive";
  if (e === "medium") return "bg-elevated/15 text-elevated";
  return "bg-critical/15 text-critical";
}

function CohortCard({ title, rows }: { title: string; rows: { label: string; sub: string; metric: string; warn?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-sm font-medium">{r.label}</div>
              <div className="text-xs text-muted-foreground">{r.sub}</div>
            </div>
            <div className={"text-sm font-medium tabular-nums " + (r.warn ? "text-critical" : "text-foreground")}>{r.metric}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
