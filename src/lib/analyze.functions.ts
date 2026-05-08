import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ diagnosisId: z.string().uuid() });

type Employee = {
  employee_code: string | null;
  department: string | null;
  job_level: string | null;
  manager: string | null;
  tenure_years: number | null;
  last_perf_rating: number | null;
  employment_status: string | null;
};
type Engagement = {
  employee_code: string | null;
  department: string | null;
  manager: string | null;
  engagement_score: number | null;
  manager_effectiveness: number | null;
  career_growth: number | null;
  work_life_balance: number | null;
  recognition: number | null;
  belonging: number | null;
  enps: number | null;
};
type OneOnOne = {
  manager_name: string | null;
  report_code: string | null;
  feeling_score: number | null;
  attrition_risk: string | null;
  looking_elsewhere: string | null;
  top_concern: string | null;
};

const tenureBand = (y: number | null): string => {
  if (y === null) return "unknown";
  if (y < 1) return "0-1 yr";
  if (y < 2) return "1-2 yr";
  if (y < 5) return "2-5 yr";
  return "5+ yr";
};

function avg(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function groupBy<T>(rows: T[], key: (r: T) => string | null): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const k = key(r) ?? "Unknown";
    (out[k] ||= []).push(r);
  }
  return out;
}

function buildStats(emps: Employee[], eng: Engagement[], oneOnOnes: OneOnOne[]) {
  const headcount = emps.length;
  const active = emps.filter((e) => (e.employment_status ?? "").toLowerCase() === "active").length;
  const left = emps.filter((e) => {
    const s = (e.employment_status ?? "").toLowerCase();
    return s === "left" || s === "exited" || s === "terminated" || s === "resigned";
  }).length;
  const attritionPct = headcount ? (left / headcount) * 100 : 0;

  const byTenure = groupBy(emps, (e) => tenureBand(e.tenure_years));
  const tenureBreakdown = Object.entries(byTenure)
    .map(([band, rows]) => {
      const total = rows.length;
      const exited = rows.filter((r) => {
        const s = (r.employment_status ?? "").toLowerCase();
        return s === "left" || s === "exited" || s === "terminated" || s === "resigned";
      }).length;
      return { band, headcount: total, attrition_pct: total ? (exited / total) * 100 : 0 };
    })
    .sort((a, b) => a.band.localeCompare(b.band));

  const byDept = groupBy(emps, (e) => e.department);
  const deptBreakdown = Object.entries(byDept).map(([dept, rows]) => {
    const total = rows.length;
    const exited = rows.filter((r) => {
      const s = (r.employment_status ?? "").toLowerCase();
      return s === "left" || s === "exited" || s === "terminated" || s === "resigned";
    }).length;
    const eRows = eng.filter((x) => x.department === dept);
    return {
      department: dept,
      headcount: total,
      attrition_pct: total ? (exited / total) * 100 : 0,
      avg_engagement: avg(eRows.map((x) => x.engagement_score)),
      avg_manager_effectiveness: avg(eRows.map((x) => x.manager_effectiveness)),
      avg_enps: avg(eRows.map((x) => x.enps)),
    };
  }).sort((a, b) => b.headcount - a.headcount);

  const byManager = groupBy(eng, (e) => e.manager);
  const managerBreakdown = Object.entries(byManager)
    .map(([mgr, rows]) => ({
      manager: mgr,
      responses: rows.length,
      avg_engagement: avg(rows.map((r) => r.engagement_score)),
      avg_manager_effectiveness: avg(rows.map((r) => r.manager_effectiveness)),
      avg_enps: avg(rows.map((r) => r.enps)),
    }))
    .filter((r) => r.responses >= 3)
    .sort((a, b) => (a.avg_manager_effectiveness ?? 99) - (b.avg_manager_effectiveness ?? 99));

  const overall = {
    avg_engagement: avg(eng.map((e) => e.engagement_score)),
    avg_manager_effectiveness: avg(eng.map((e) => e.manager_effectiveness)),
    avg_career_growth: avg(eng.map((e) => e.career_growth)),
    avg_work_life: avg(eng.map((e) => e.work_life_balance)),
    avg_recognition: avg(eng.map((e) => e.recognition)),
    avg_belonging: avg(eng.map((e) => e.belonging)),
    avg_enps: avg(eng.map((e) => e.enps)),
  };

  const highRisk1on1 = oneOnOnes.filter((o) => (o.attrition_risk ?? "").toLowerCase() === "high").length;
  const lookingElsewhere = oneOnOnes.filter((o) => /yes|suspect/i.test(o.looking_elsewhere ?? "")).length;

  return {
    headcount,
    active,
    left,
    attrition_pct: Number(attritionPct.toFixed(1)),
    avg_tenure_yrs: avg(emps.map((e) => e.tenure_years)),
    overall,
    tenure_breakdown: tenureBreakdown,
    department_breakdown: deptBreakdown,
    manager_breakdown_bottom5: managerBreakdown.slice(0, 5),
    one_on_one_signals: {
      total: oneOnOnes.length,
      high_attrition_risk: highRisk1on1,
      looking_elsewhere: lookingElsewhere,
      top_concerns_sample: oneOnOnes
        .filter((o) => o.top_concern)
        .slice(0, 12)
        .map((o) => o.top_concern),
    },
  };
}

type AIRisk = {
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

type AIResponse = {
  verdict: string;
  health_score: number;
  one_line: string;
  risks: AIRisk[];
};

async function callLovableAI(stats: unknown): Promise<AIResponse> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `You are a senior People & Organisation consultant. Given org-health statistics, produce a sharp, defensible diagnosis a partner can present live to a CHRO.

Rules:
- Be decisive. No hedging, no "consider", no "may want to". Use direct, plain English.
- Each risk must cite a specific cohort (e.g., "0-1 yr Engineering", "Reports of manager Sandeep Rao") and the numeric evidence.
- Severity: critical (act this week), elevated (act this quarter), watch (monitor next pulse).
- Confidence: high if sample size >30, medium if 10-30, low if <10.
- Each risk MUST have 2-4 interventions tagged priority (high/medium/low) and effort (low/medium/high). Mark exactly ONE intervention across the whole diagnosis as do_first=true — the highest ROI (high priority + low effort).
- health_score: 0-100 single number reflecting overall org health.
- verdict: one of "Healthy", "Watch", "At Risk", "Critical".
- one_line: a single sentence the partner says first in the room. Decisive.`;

  const tool = {
    type: "function",
    function: {
      name: "emit_diagnosis",
      description: "Return the structured org-health diagnosis.",
      parameters: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["Healthy", "Watch", "At Risk", "Critical"] },
          health_score: { type: "number" },
          one_line: { type: "string" },
          risks: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                severity: { type: "string", enum: ["critical", "elevated", "watch"] },
                cohort: { type: "string" },
                evidence: { type: "string" },
                plain_english_explanation: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                interventions: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      effort: { type: "string", enum: ["low", "medium", "high"] },
                      expected_impact: { type: "string" },
                      do_first: { type: "boolean" },
                    },
                    required: ["title", "description", "priority", "effort", "expected_impact"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "severity", "cohort", "evidence", "plain_english_explanation", "confidence", "interventions"],
              additionalProperties: false,
            },
          },
        },
        required: ["verdict", "health_score", "one_line", "risks"],
        additionalProperties: false,
      },
    },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Org statistics (JSON):\n${JSON.stringify(stats, null, 2)}\n\nReturn exactly 3 risks with 2-4 interventions each. Mark exactly one intervention as do_first.`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "emit_diagnosis" } },
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("AI rate limit reached. Try again in a minute.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI gateway error ${resp.status}: ${await resp.text()}`);
  }
  const json = await resp.json() as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no structured output");
  return JSON.parse(args) as AIResponse;
}

export const analyzeDiagnosis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const id = data.diagnosisId;

    const [{ data: emps }, { data: eng }, { data: oo }] = await Promise.all([
      supabase.from("employees").select("employee_code, department, job_level, manager, tenure_years, last_perf_rating, employment_status").eq("diagnosis_id", id),
      supabase.from("engagement_responses").select("employee_code, department, manager, engagement_score, manager_effectiveness, career_growth, work_life_balance, recognition, belonging, enps").eq("diagnosis_id", id),
      supabase.from("one_on_ones").select("manager_name, report_code, feeling_score, attrition_risk, looking_elsewhere, top_concern").eq("diagnosis_id", id),
    ]);

    const stats = buildStats((emps ?? []) as Employee[], (eng ?? []) as Engagement[], (oo ?? []) as OneOnOne[]);

    try {
      const ai = await callLovableAI(stats);

      await supabase.from("diagnosis_results").upsert({
        diagnosis_id: id,
        verdict: ai.verdict,
        health_score: ai.health_score,
        kpis: { ...stats, one_line: ai.one_line },
        cohorts: { tenure: stats.tenure_breakdown, department: stats.department_breakdown, managers: stats.manager_breakdown_bottom5 },
        risks: ai.risks,
      });
      await supabase.from("diagnoses").update({ status: "ready" }).eq("id", id);
      return { ok: true };
    } catch (err) {
      await supabase.from("diagnoses").update({ status: "failed", notes: err instanceof Error ? err.message : "Unknown error" }).eq("id", id);
      throw err;
    }
  });
