import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, TimeLog } from "./pdf-types";

const FOOTER_NOTE = "This report has been generated via Nerdshouse Time Tracker";
const PRESENTED_BY = "Nerdshouse Technologies LLP";

function formatDurationHoursMinutes(ms: number): string {
  if (ms < 0) return "0 Hours 0 Minutes";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} Hour${hours !== 1 ? "s" : ""}`);
  parts.push(`${minutes} Minute${minutes !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function drawWatermark(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  logoUrl?: string
) {
  try {
    if (logoUrl) {
      doc.addImage(logoUrl, "PNG", pageWidth / 2 - 30, pageHeight / 2 - 30, 60, 60, undefined, "NONE", 0.15);
    } else {
      doc.setFontSize(36);
      doc.setTextColor(200, 200, 200);
      doc.text("Nerd's House", pageWidth / 2, pageHeight / 2, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }
  } catch {
    doc.setFontSize(36);
    doc.setTextColor(200, 200, 200);
    doc.text("Nerd's House", pageWidth / 2, pageHeight / 2, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }
}

export async function downloadProjectReportPdf(
  project: Project,
  timeLogs: TimeLog[],
  logoUrl?: string,
  clientName?: string
) {
  const doc = new jsPDF();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal?.pageSize?.getWidth?.() ?? 210;
  const pageHeight = (doc as unknown as { internal: { pageSize: { getHeight: () => number } } }).internal?.pageSize?.getHeight?.() ?? 297;
  let y = 20;

  drawWatermark(doc, pageWidth, pageHeight, logoUrl);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Presented by: ${PRESENTED_BY}`, 14, y);
  y += 6;
  doc.text(`Client Name: ${clientName ?? project.client?.name ?? ""}`, 14, y);
  y += 6;
  doc.text(`Date Of Report Generation: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 14, y);
  y += 10;

  doc.setFontSize(14);
  doc.text(`Project: ${project.name}`, 14, y);
  y += 10;

  const usedMs = timeLogs.reduce((s: number, l: TimeLog) => s + l.durationMs, 0);
  const totalHours = usedMs / (1000 * 60 * 60);
  doc.setFontSize(10);
  doc.text(`Total number of hours: ${totalHours.toFixed(2)}`, 14, y);
  y += 12;

  if (timeLogs.length > 0) {
    doc.setFontSize(11);
    doc.text("List of tasks", 14, y);
    y += 8;
    const headers = ["Task", "Developer", "Date", "Duration (Hours, Minutes)"];
    const rows = timeLogs.map((l) => [
      (l.task as { title?: string })?.title ?? "",
      (l.user as { name?: string })?.name ?? "",
      new Date(l.startTime).toLocaleDateString(),
      formatDurationHoursMinutes(l.durationMs),
    ]);
    doc.setFontSize(9);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: y,
      margin: { left: 14 },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y;
  }
  y += 15;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(FOOTER_NOTE, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.save(`${project.name.replace(/\s+/g, "-")}-report.pdf`);
}

export async function downloadClientTimeReportPdf(
  projects: Array<{
    name: string;
    totalHoursBought: number;
    hourlyRate: number;
    boughtDate?: string | null;
    hoursTopUps?: Array<{ hours: number; ratePerHour: number; boughtDate?: string | null }>;
  }>,
  logoUrl?: string,
  clientName?: string
) {
  const doc = new jsPDF();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal?.pageSize?.getWidth?.() ?? 210;
  const pageHeight = (doc as unknown as { internal: { pageSize: { getHeight: () => number } } }).internal?.pageSize?.getHeight?.() ?? 297;

  drawWatermark(doc, pageWidth, pageHeight, logoUrl);

  let y = 20;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Presented by: ${PRESENTED_BY}`, 14, y);
  y += 6;
  doc.text(`Client Name: ${clientName ?? ""}`, 14, y);
  y += 6;
  doc.text(`Date Of Report Generation: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 14, y);
  y += 10;

  doc.setFontSize(14);
  doc.text("Time report", 14, y);
  y += 10;

  type ProjectItem = (typeof projects)[number];
  type TopUpItem = { hours: number; ratePerHour?: number; boughtDate?: string | null };
  const totalHours = projects.reduce((s: number, p: ProjectItem) => {
    const topUps: TopUpItem[] = p.hoursTopUps && p.hoursTopUps.length > 0 ? p.hoursTopUps : [{ hours: p.totalHoursBought }];
    return s + topUps.reduce((a: number, t: TopUpItem) => a + t.hours, 0);
  }, 0);
  doc.setFontSize(10);
  doc.text(`Total number of hours: ${totalHours.toFixed(2)}`, 14, y);
  y += 12;

  const headers = ["Project", "Hours bought", "Bought date"];
  const rows = projects.flatMap((p) => {
    const topUps = p.hoursTopUps && p.hoursTopUps.length > 0 ? p.hoursTopUps : [{ hours: p.totalHoursBought, boughtDate: p.boughtDate }];
    return topUps.map((t, i) => [
      i === 0 ? p.name : "",
      String(t.hours),
      t.boughtDate ? new Date(t.boughtDate).toLocaleDateString() : "—",
    ]);
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: y,
    margin: { left: 14 },
    theme: "grid",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 15;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(FOOTER_NOTE, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.save("client-time-report.pdf");
}
