import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import {
  parseEmployees,
  parseEngagement,
  parseOneOnOnes,
  type EmployeeRow,
  type EngagementRow,
  type OneOnOneRow,
} from "@/lib/parse-sheets";
import { loadSampleData } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/diagnoses/new")({
  head: () => ({ meta: [{ title: "New diagnosis — OrgPulse" }] }),
  component: NewDiagnosisPage,
});

type Bag = {
  employees: EmployeeRow[];
  engagement: EngagementRow[];
  oneOnOnes: OneOnOneRow[];
};

function NewDiagnosisPage() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [bag, setBag] = useState<Bag>({ employees: [], engagement: [], oneOnOnes: [] });
  const [running, setRunning] = useState(false);

  const onPick = async (
    file: File | null,
    kind: "employees" | "engagement" | "oneOnOnes",
  ) => {
    if (!file) return;
    try {
      if (kind === "employees") {
        const { rows } = await parseEmployees(file);
        setBag((b) => ({ ...b, employees: rows }));
        toast.success(`Parsed ${rows.length} employee rows`);
      } else if (kind === "engagement") {
        const { rows } = await parseEngagement(file);
        setBag((b) => ({ ...b, engagement: rows }));
        toast.success(`Parsed ${rows.length} engagement responses`);
      } else {
        const { rows } = await parseOneOnOnes(file);
        setBag((b) => ({ ...b, oneOnOnes: rows }));
        toast.success(`Parsed ${rows.length} 1:1 entries`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not parse file");
    }
  };

  const useSample = async () => {
    try {
      const data = await loadSampleData();
      setBag(data);
      if (!clientName) setClientName("NeoBank (sample)");
      toast.success("Loaded NeoBank sample data");
    } catch (e) {
      toast.error("Could not load sample");
      console.error(e);
    }
  };

  const submit = async () => {
    if (!clientName.trim()) { toast.error("Please name the client"); return; }
    if (bag.employees.length === 0) { toast.error("Upload an HRMS file (employees)"); return; }

    setRunning(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { data: created, error } = await supabase
        .from("diagnoses")
        .insert({ client_name: clientName.trim(), status: "analyzing", user_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      const id = created!.id;

      // Insert raw rows in chunks
      const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

      for (const c of chunk(bag.employees.map((r) => ({ ...r, diagnosis_id: id })), 200)) {
        const { error: e } = await supabase.from("employees").insert(c);
        if (e) throw e;
      }
      if (bag.engagement.length) {
        for (const c of chunk(bag.engagement.map((r) => ({ ...r, diagnosis_id: id })), 200)) {
          const { error: e } = await supabase.from("engagement_responses").insert(c);
          if (e) throw e;
        }
      }
      if (bag.oneOnOnes.length) {
        for (const c of chunk(bag.oneOnOnes.map((r) => ({ ...r, diagnosis_id: id })), 200)) {
          const { error: e } = await supabase.from("one_on_ones").insert(c);
          if (e) throw e;
        }
      }

      // Trigger AI analysis (server fn). Navigate immediately; dashboard polls
      // and surfaces errors via the diagnoses.notes field.
      const { analyzeDiagnosis } = await import("@/lib/analyze.functions");
      analyzeDiagnosis({ data: { diagnosisId: id } }).catch((e: unknown) => {
        console.error("analyzeDiagnosis failed", e);
        toast.error(e instanceof Error ? e.message : "Analysis failed to start");
      });

      navigate({ to: "/diagnoses/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create diagnosis");
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">New diagnosis</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload up to three sources. We'll join them by Employee ID.</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            placeholder="e.g. Acme Bank"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            maxLength={120}
            className="mt-2"
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Data sources</h2>
              <p className="text-sm text-muted-foreground">HRMS is required. Engagement and 1:1 data sharpen the diagnosis.</p>
            </div>
            <Button variant="outline" size="sm" onClick={useSample}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Use NeoBank sample
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SourceCard
              required
              title="HRMS export"
              hint="Employees, tenure, departments"
              count={bag.employees.length}
              onPick={(f) => onPick(f, "employees")}
            />
            <SourceCard
              title="Engagement pulse"
              hint="Survey scores, eNPS"
              count={bag.engagement.length}
              onPick={(f) => onPick(f, "engagement")}
            />
            <SourceCard
              title="1:1 tracker"
              hint="Manager notes, attrition risk"
              count={bag.oneOnOnes.length}
              onPick={(f) => onPick(f, "oneOnOnes")}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-6 py-4">
          <div className="text-sm">
            <div className="font-medium">Ready when you are.</div>
            <div className="text-muted-foreground">Analysis takes ~15–30 seconds.</div>
          </div>
          <Button onClick={submit} disabled={running} size="lg">
            {running ? "Starting…" : "Run diagnosis"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function SourceCard({
  title,
  hint,
  count,
  required,
  onPick,
}: {
  title: string;
  hint: string;
  count: number;
  required?: boolean;
  onPick: (f: File | null) => void;
}) {
  const id = `f-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const has = count > 0;
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-border bg-background p-4 transition-colors hover:border-accent hover:bg-surface-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileSpreadsheet className="h-4 w-4" /> {title}
          {required && <span className="text-xs font-normal text-accent">required</span>}
        </div>
        {has ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="text-xs text-muted-foreground">{hint}</div>
      <div className="mt-1 text-xs">
        {has ? <span className="text-positive">{count} rows loaded</span> : <span className="text-muted-foreground">XLSX or CSV</span>}
      </div>
      <input
        id={id}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {required && !has && (
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-elevated"><AlertCircle className="h-3 w-3" /> needed</div>
      )}
    </label>
  );
}
