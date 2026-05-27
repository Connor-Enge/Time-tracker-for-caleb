export type Role = "employee" | "admin";

export type Shift = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  notes?: string;
  job?: string;
};

export type ScheduledShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  job?: string;
  notes?: string;
};

export type PayPeriodType = "weekly" | "biweekly" | "semimonthly" | "monthly";

export type OvertimeRule = "none" | "daily8" | "weekly40" | "both";

export type Settings = {
  employeeName: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  overtimeRule: OvertimeRule;
  payPeriodType: PayPeriodType;
  payPeriodAnchor: string;
  weekStartsOn: 0 | 1;
  taxWithholdingPercent: number;
  currency: string;
};

export type ClientUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  settings: Settings;
};

export const defaultSettings: Settings = {
  employeeName: "",
  hourlyRate: 20,
  overtimeMultiplier: 1.5,
  overtimeRule: "weekly40",
  payPeriodType: "biweekly",
  payPeriodAnchor: new Date().toISOString().slice(0, 10),
  weekStartsOn: 0,
  taxWithholdingPercent: 0,
  currency: "USD",
};
