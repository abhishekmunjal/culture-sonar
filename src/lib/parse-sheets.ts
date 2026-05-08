import * as XLSX from "xlsx";

export type EmployeeRow = {
  employee_code: string | null;
  full_name: string | null;
  gender: string | null;
  department: string | null;
  job_level: string | null;
  manager: string | null;
  location: string | null;
  date_of_joining: string | null;
  tenure_years: number | null;
  annual_ctc: number | null;
  last_perf_rating: number | null;
  employment_status: string | null;
};

export type EngagementRow = {
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
  would_recommend: string | null;
  submitted_on: string | null;
};

export type OneOnOneRow = {
  manager_name: string | null;
  report_name: string | null;
  report_code: string | null;
  last_one_on_one: string | null;
  feeling_score: number | null;
  attrition_risk: string | null;
  looking_elsewhere: string | null;
  top_concern: string | null;
  action_committed: string | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  const map = new Map<string, unknown>();
  for (const k of Object.keys(row)) map.set(norm(k), row[k]);
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const date = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
};

export type ParsedSheet<T> = {
  rows: T[];
  detected: boolean;
  rawHeaders: string[];
};

function readFirstSheet(file: ArrayBuffer): { rows: Record<string, unknown>[]; headers: string[] } {
  const wb = XLSX.read(file, { type: "array", cellDates: true });
  // Pick the first sheet that looks like data (has > 1 row and many columns)
  let bestName = wb.SheetNames[0];
  let bestRows: Record<string, unknown>[] = [];
  let bestHeaders: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    if (rows.length > bestRows.length && headers.length >= 4) {
      bestName = name;
      bestRows = rows;
      bestHeaders = headers;
    }
  }
  void bestName;
  return { rows: bestRows, headers: bestHeaders };
}

export async function parseEmployees(file: File): Promise<ParsedSheet<EmployeeRow>> {
  const buf = await file.arrayBuffer();
  const { rows, headers } = readFirstSheet(buf);
  const detected = headers.some((h) => /employee\s*id|emp.*id/i.test(h));
  const out: EmployeeRow[] = rows.map((r) => ({
    employee_code: str(pick(r, ["Employee ID", "Emp ID", "employee_code", "EmpID"])),
    full_name: str(pick(r, ["Full Name", "Name", "Employee Name"])),
    gender: str(pick(r, ["Gender"])),
    department: str(pick(r, ["Department", "Dept", "Function"])),
    job_level: str(pick(r, ["Job Level", "Level", "Band", "Grade"])),
    manager: str(pick(r, ["Manager", "Reporting Manager", "Manager Name"])),
    location: str(pick(r, ["Work Location", "Location", "Office"])),
    date_of_joining: date(pick(r, ["Date of Joining", "DOJ", "Joining Date", "Hire Date"])),
    tenure_years: num(pick(r, ["Tenure (Years)", "Tenure Years", "Tenure"])),
    annual_ctc: num(pick(r, ["Annual CTC (INR Lakhs)", "CTC", "Annual CTC", "Salary"])),
    last_perf_rating: num(pick(r, ["Last Perf Rating", "Performance Rating", "Rating"])),
    employment_status: str(pick(r, ["Employment Status", "Status"])),
  }));
  return { rows: out.filter((r) => r.employee_code), detected, rawHeaders: headers };
}

export async function parseEngagement(file: File): Promise<ParsedSheet<EngagementRow>> {
  const buf = await file.arrayBuffer();
  const { rows, headers } = readFirstSheet(buf);
  const detected = headers.some((h) => /engagement|enps|pulse/i.test(h));
  const out: EngagementRow[] = rows.map((r) => ({
    employee_code: str(pick(r, ["Employee ID", "Emp ID"])),
    department: str(pick(r, ["Department", "Function"])),
    manager: str(pick(r, ["Manager"])),
    engagement_score: num(pick(r, ["Engagement Score", "Engagement"])),
    manager_effectiveness: num(pick(r, ["Manager Effectiveness"])),
    career_growth: num(pick(r, ["Career Growth"])),
    work_life_balance: num(pick(r, ["Work-Life Balance", "Work Life Balance"])),
    recognition: num(pick(r, ["Recognition"])),
    belonging: num(pick(r, ["Belonging & Inclusion", "Belonging"])),
    enps: num(pick(r, ["eNPS (-100 to 100)", "eNPS"])),
    would_recommend: str(pick(r, ["Would Recommend as Workplace?", "Would Recommend"])),
    submitted_on: date(pick(r, ["Survey Submitted On", "Submitted On"])),
  }));
  return { rows: out.filter((r) => r.engagement_score !== null), detected, rawHeaders: headers };
}

export async function parseOneOnOnes(file: File): Promise<ParsedSheet<OneOnOneRow>> {
  const buf = await file.arrayBuffer();
  const { rows, headers } = readFirstSheet(buf);
  const detected = headers.some((h) => /1.?1|one.?on.?one|attrition risk/i.test(h));
  const out: OneOnOneRow[] = rows.map((r) => ({
    manager_name: str(pick(r, ["Manager Name (you)", "Manager Name", "Manager"])),
    report_name: str(pick(r, ["Report's Name", "Report Name", "Direct Report"])),
    report_code: str(pick(r, ["Report's Emp ID", "Report Emp ID", "Employee ID"])),
    last_one_on_one: date(pick(r, ["Last 1:1 Date", "Last 1on1 Date"])),
    feeling_score: num(pick(r, [
      "How is your report feeling? (1=struggling, 5=thriving)",
      "How is your report feeling?",
      "Feeling Score",
    ])),
    attrition_risk: str(pick(r, ["Attrition risk in next 6 months?", "Attrition Risk"])),
    looking_elsewhere: str(pick(r, ["Has report mentioned looking elsewhere?", "Looking Elsewhere"])),
    top_concern: str(pick(r, ["Top concern raised (free text)", "Top Concern"])),
    action_committed: str(pick(r, ["Action committed (free text)", "Action Committed"])),
  }));
  return { rows: out.filter((r) => r.report_code || r.report_name), detected, rawHeaders: headers };
}
