/** Convert milliseconds to hours (decimal) */
export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

/** Format duration as H:MM:SS or M:SS */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Format duration as "X Hours Y Minutes" for PDFs */
export function formatDurationHoursMinutes(ms: number): string {
  if (ms < 0) return "0 Hours 0 Minutes";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} Hour${hours !== 1 ? "s" : ""}`);
  parts.push(`${minutes} Minute${minutes !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

/** Indian numbering for currency: Rs. 1,20,000 */
export function formatCurrency(amount: number): string {
  const abs = Math.round(Math.abs(amount));
  const str = abs.toString();
  let result = "";
  let count = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = "," + result;
    }
    result = str[i] + result;
    count++;
  }
  return `Rs. ${amount < 0 ? "-" : ""}${result}`;
}

/** Percent with one decimal */
export function formatPercent(value: number): string {
  return `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;
}
