import { createFileRoute, Link,Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Activity, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";



export const Route = createFileRoute("/_authenticated/diagnoses/")({
  component: () => <Outlet />,
});

// export const Route = createFileRoute("/_authenticated/diagnoses")({
//   head: () => ({ meta: [{ title: "Diagnoses — OrgPulse" }] }),
//   component: DiagnosesPage,
// });

type Row = {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
};

function DiagnosesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("diagnoses")
      .select("id, client_name, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your diagnoses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each diagnosis represents one client engagement.</p>
        </div>
        <Link to="/diagnoses/new">
          <Button><Plus className="mr-1.5 h-4 w-4" /> New diagnosis</Button>
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        {rows === null ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="rounded-full bg-surface-2 p-3"><Activity className="h-5 w-5 text-accent" /></div>
            <h2 className="font-display text-xl font-semibold">No diagnoses yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">Start a new diagnosis by uploading client HRMS, engagement and 1:1 data — or use the bundled NeoBank sample.</p>
            <Link to="/diagnoses/new"><Button className="mt-2"><Plus className="mr-1.5 h-4 w-4" /> New diagnosis</Button></Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/diagnoses/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div>
                    <div className="font-medium">{r.client_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} · {r.status}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
