import { parseEmployees, parseEngagement, parseOneOnOnes } from "./parse-sheets";

async function fetchAsFile(url: string, name: string): Promise<File> {
  const r = await fetch(url);
  const blob = await r.blob();
  return new File([blob], name);
}

export async function loadSampleData() {
  const [hrms, eng, oneOnOne] = await Promise.all([
    fetchAsFile("/samples/01_HRMS_Master_Export.xlsx", "01_HRMS_Master_Export.xlsx"),
    fetchAsFile("/samples/02_Engagement_Pulse.xlsx", "02_Engagement_Pulse.xlsx"),
    fetchAsFile("/samples/03_1on1_Tracker.xlsx", "03_1on1_Tracker.xlsx"),
  ]);
  const [employees, engagement, oneOnOnes] = await Promise.all([
    parseEmployees(hrms),
    parseEngagement(eng),
    parseOneOnOnes(oneOnOne),
  ]);
  return {
    employees: employees.rows,
    engagement: engagement.rows,
    oneOnOnes: oneOnOnes.rows,
  };
}
