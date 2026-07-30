export type DayPoint = {
  date: string;
  earned: number;
  cashReceived: number;
  essentialSpend: number;
  balance: number;
};

export type Obligation = {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  dueDay: number;
  essential: boolean;
};

export type Advance = {
  id: string;
  requestedAt: string;
  amount: number;
  fee: number;
  status: string;
  reason: string;
};

export type WorkerPayload = {
  workerId: string;
  city: string;
  occupation: string;
  payType: string;
  incomeVolatility: number;
  dependents: number;
  rentBurden: string;
  bankingAccess: boolean;
  asOfDate: string;
  balance: number;
  history: DayPoint[];
  solvency: {
    p10Days: number | null;
    p50Days: number | null;
    p90Days: number | null;
    p10Date: string | null;
    p50Date: string | null;
    p90Date: string | null;
    breachRate: number;
    meanEarnedToDate: number;
    meanCashInHandToDate: number;
  };
  earned14: number;
  cash14: number;
  pendingCash: number;
  pendingArrivesBy: string | null;
  pendingItems: { date: string; amount: number }[];
  dailyWageP10: number;
  medianNetHourly: number;
  typicalDailyNet: number;
  obligations: Obligation[];
  advances: Advance[];
  seed: number;
};

export type WorkerIndexEntry = {
  workerId: string;
  occupation: string;
  city: string;
  payType: string;
};

export type BacktestData = {
  label: string;
  workerCount: number;
  totalFeesPaid: number;
  totalFeesAvoidable: number;
  advancesPaidCount: number;
  advancesAvoidableCount: number;
  calibration: {
    predictedBreachRate: number;
    actualBreachRate: number;
    workersWithP10: number;
    workersBreachedP10: number;
    sentence: string;
    chart: {
      label: string;
      predictedRate: number;
      actualRate: number;
      n: number;
    }[];
  };
};

export function money(n: number): string {
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function moneyExact(n: number): string {
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekday(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}
