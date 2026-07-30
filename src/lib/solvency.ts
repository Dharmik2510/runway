/**
 * Block-bootstrap cash solvency simulator.
 * Resamples contiguous 7-day blocks so bad weeks stay clustered.
 */

export type DayCashflow = {
  earned: number;
  cashReceived: number;
  essentialSpend: number;
};

export type SolvencyResult = {
  /** Day index (1-based) when cash first goes negative; null if survives horizon */
  p10: number | null;
  p50: number | null;
  p90: number | null;
  meanEarnedToDate: number;
  meanCashInHandToDate: number;
  breachRate: number;
};

export type SimulateOptions = {
  history: DayCashflow[];
  startingBalance: number;
  runs?: number;
  horizon?: number;
  seed: number;
};

/** Seeded PRNG — same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nearest-rank percentile on a sorted ascending array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1];
}

/**
 * Run block-bootstrap solvency simulations.
 * Tracks earned-to-date and cash-in-hand separately — the gap is the product premise.
 */
export function simulateSolvency(opts: SimulateOptions): SolvencyResult {
  const runs = opts.runs ?? 2000;
  const horizon = opts.horizon ?? 120;
  const { history, startingBalance, seed } = opts;

  if (history.length < 7) {
    throw new Error("Need at least 7 days of history for block bootstrap");
  }

  const rng = mulberry32(seed);
  const maxStart = history.length - 7;
  const firstNegativeDays: number[] = [];
  let sumEarned = 0;
  let sumCash = 0;
  let breaches = 0;

  for (let run = 0; run < runs; run++) {
    let balance = startingBalance;
    let earnedToDate = 0;
    let day = 0;
    let hit: number | null = null;

    while (day < horizon) {
      const blockStart = Math.floor(rng() * (maxStart + 1));
      for (let i = 0; i < 7 && day < horizon; i++) {
        const d = history[blockStart + i];
        day += 1;
        earnedToDate += d.earned;
        balance += d.cashReceived - d.essentialSpend;
        if (hit === null && balance < 0) {
          hit = day;
        }
      }
      if (hit !== null && day >= hit) {
        // Continue filling horizon for earned/cash curves on this run
        // but we already recorded first negative day
      }
    }

    sumEarned += earnedToDate;
    sumCash += balance;

    if (hit !== null) {
      firstNegativeDays.push(hit);
      breaches += 1;
    }
  }

  // Pad survivors with horizon+1 so percentiles reflect overall risk,
  // not only paths that already breached.
  const padded = firstNegativeDays.slice();
  while (padded.length < runs) padded.push(horizon + 1);
  padded.sort((a, b) => a - b);

  const toNullable = (v: number): number | null =>
    v > horizon ? null : v;

  return {
    p10: toNullable(percentile(padded, 0.1)),
    p50: toNullable(percentile(padded, 0.5)),
    p90: toNullable(percentile(padded, 0.9)),
    meanEarnedToDate: sumEarned / runs,
    meanCashInHandToDate: sumCash / runs,
    breachRate: breaches / runs,
  };
}

/** Hash a string into a uint32 seed (stable across sessions). */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Add calendar days to an ISO date string (YYYY-MM-DD). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Format a date for display: "Thu, Jul 31" */
export function formatFundedDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Hysteresis for displayed daily wage: only flip when the candidate
 * differs by >8% from the displayed value for 5 consecutive observations.
 */
export function applyWageHysteresis(
  displayed: number,
  candidate: number,
  streak: number
): { wage: number; streak: number } {
  if (displayed <= 0) return { wage: candidate, streak: 0 };
  const rel = Math.abs(candidate - displayed) / displayed;
  if (rel > 0.08) {
    const next = streak + 1;
    if (next >= 5) return { wage: candidate, streak: 0 };
    return { wage: displayed, streak: next };
  }
  return { wage: displayed, streak: 0 };
}

/** p10 of simulated 30-day average daily wage from block bootstrap. */
export function estimateDailyWageP10(
  history: DayCashflow[],
  seed: number,
  runs = 400
): number {
  if (history.length < 7) {
    const mean =
      history.reduce((s, d) => s + d.earned, 0) / Math.max(1, history.length);
    return mean;
  }
  const rng = mulberry32(seed);
  const maxStart = history.length - 7;
  const avgs: number[] = [];

  for (let run = 0; run < runs; run++) {
    let earned = 0;
    let day = 0;
    while (day < 30) {
      const blockStart = Math.floor(rng() * (maxStart + 1));
      for (let i = 0; i < 7 && day < 30; i++) {
        earned += history[blockStart + i].earned;
        day += 1;
      }
    }
    avgs.push(earned / 30);
  }
  avgs.sort((a, b) => a - b);
  return percentile(avgs, 0.1);
}

/** Annualized fee rate for a short-term advance (simple, not APY compounding). */
export function annualizedFeeRate(
  fee: number,
  principal: number,
  termDays: number
): number {
  if (principal <= 0 || termDays <= 0) return 0;
  return (fee / principal) * (365 / termDays);
}
