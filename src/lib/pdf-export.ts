import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Risk = {
  title: string;
  severity: string;
  cohort: string;
  evidence: string;
  plain_english_explanation: string;
  confidence: string;
  interventions: {
    title: string;
    description: string;
    priority: string;
    effort: string;
    expected_impact: string;
    do_first?: boolean;
  }[];
};

type Result = {
  verdict: string;
  health_score: number;
  one_line?: string;
  kpis: {
    headcount: number;
    attrition_pct: number;
    avg_tenure_yrs: number | null;
    overall: { avg_engagement: number | null; avg_enps: number | null };
    one_line?: string;
  };
  risks: Risk[];
};

export function exportDiagnosisPdf(clientName: string, result: Result, consultantName?: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  // Header band
  doc.setFillColor(40, 47, 88);
  doc.rect(0, 0, W, 12, "F");

  doc.setTextColor(20, 24, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("OrgPulse — Client Diagnostic", M, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 130);
  doc.text(`${clientName} · ${new Date().toLocaleDateString()}${consultantName ? " · " + consultantName : ""}`, M, y);
  y += 24;

  // Verdict box
  const verdictColor: Record<string, [number, number, number]> = {
    Critical: [200, 50, 50],
    "At Risk": [220, 130, 40],
    Watch: [80, 120, 200],
    Healthy: [60, 150, 100],
  };
  const vc = verdictColor[result.verdict] ?? [80, 80, 100];
  doc.setFillColor(vc[0], vc[1], vc[2]);
  doc.roundedRect(M, y, W - M * 2, 60, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`VERDICT: ${result.verdict.toUpperCase()}  ·  Score ${Math.round(result.health_score)}/100`, M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const oneLine = result.kpis.one_line ?? result.one_line ?? "";
  const wrapped = doc.splitTextToSize(oneLine, W - M * 2 - 28);
  doc.text(wrapped, M + 14, y + 40);
  y += 80;

  // KPI strip
  doc.setTextColor(20, 24, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Key Metrics", M, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [240, 240, 245], textColor: [50, 50, 70] },
    head: [["Headcount", "Attrition", "Avg Tenure", "Engagement", "eNPS"]],
    body: [[
      String(result.kpis.headcount),
      `${result.kpis.attrition_pct.toFixed(1)}%`,
      result.kpis.avg_tenure_yrs ? `${result.kpis.avg_tenure_yrs.toFixed(1)} yrs` : "—",
      result.kpis.overall.avg_engagement ? result.kpis.overall.avg_engagement.toFixed(2) : "—",
      result.kpis.overall.avg_enps !== null ? result.kpis.overall.avg_enps.toFixed(0) : "—",
    ]],
  });
  // @ts-expect-error - autotable adds lastAutoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 18;

  // Risks
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Risk Signals", M, y);
  y += 8;

  for (const risk of result.risks) {
    if (y > 720) { doc.addPage(); y = 50; }
    const sevColor: Record<string, [number, number, number]> = {
      critical: [200, 50, 50],
      elevated: [220, 130, 40],
      watch: [80, 120, 200],
    };
    const c = sevColor[risk.severity] ?? [80, 80, 100];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(M, y, 6, 14, 2, 2, "F");
    doc.setTextColor(20, 24, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${risk.title}  [${risk.severity.toUpperCase()} · ${risk.confidence} confidence]`, M + 12, y + 11);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 90);
    const cohort = doc.splitTextToSize(`Cohort: ${risk.cohort}  ·  Evidence: ${risk.evidence}`, W - M * 2);
    doc.text(cohort, M + 12, y);
    y += cohort.length * 11;
    const expl = doc.splitTextToSize(risk.plain_english_explanation, W - M * 2 - 12);
    doc.text(expl, M + 12, y);
    y += expl.length * 11 + 4;

    autoTable(doc, {
      startY: y,
      margin: { left: M + 12, right: M },
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [248, 248, 252], textColor: [80, 80, 100], fontStyle: "bold" },
      head: [["Intervention", "Priority", "Effort", "Expected impact"]],
      body: risk.interventions.map((i) => [
        (i.do_first ? "★ DO FIRST  " : "") + i.title + "\n" + i.description,
        i.priority.toUpperCase(),
        i.effort.toUpperCase(),
        i.expected_impact,
      ]),
      columnStyles: { 0: { cellWidth: 270 }, 1: { cellWidth: 60 }, 2: { cellWidth: 60 }, 3: { cellWidth: "auto" } },
    });
    // @ts-expect-error - autotable adds lastAutoTable
    y = (doc.lastAutoTable?.finalY ?? y) + 16;
  }

  // Footer
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 160);
    doc.text(
      `Prepared with OrgPulse · ${new Date().toISOString().slice(0, 10)} · Page ${p} of ${total}`,
      M,
      doc.internal.pageSize.getHeight() - 24,
    );
  }

  doc.save(`OrgPulse_${clientName.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
