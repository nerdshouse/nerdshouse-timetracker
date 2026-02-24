export type Project = {
  id: string;
  name: string;
  totalHoursBought: number;
  hourlyRate: number;
  boughtDate?: string | null;
  client?: { name: string };
  tasks?: Array<{
    timeLogs?: Array<{ durationMs: number }>;
  }>;
};

export type TimeLog = {
  id: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  task?: { title?: string };
  user?: { name?: string };
};

export type HoursTopUp = {
  hours: number;
  ratePerHour: number;
  boughtDate?: string | null;
};
