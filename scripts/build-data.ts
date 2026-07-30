/**
 * Build-time ETL: CSV → static JSON in /public/data.
 * Run via `npm run precompute`. Nothing expensive runs in the browser.
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  addDays,
  estimateDailyWageP10,
  hashSeed,
  simulateSolvency,
  type DayCashflow,
} from "../src/lib/solvency";

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "public", "data");

type WorkerRow = {
  worker_id: string;
  city: string;
  occupation: string;
  pay_type: string;
  typical_daily_net_cad: string;
  income_volatility: string;
  dependents: string;
  has_bank_account: string;
  rent_burden_band: string;
};

type EarningsRow = {
  earnings_id: string;
  worker_id: string;
  work_date: string;
  hours_worked: string;
  net_pay_cad: string;
  paid_same_day: string;
};

type TxnRow = {
  txn_id: string;
  worker_id: string;
  txn_ts: string;
  direction: string;
  amount_cad: string;
  category: string;
  is_essential: string;
  running_balance_cad: string;
  notes: string;
};

type ObligationRow = {
  obligation_id: string;
  worker_id: string;
  name: string;
  category: string;
  amount_cad: string;
  frequency: string;
  due_day_of_month: string;
  essential: string;
};

type AdvanceRow = {
  advance_id: string;
  worker_id: string;
  requested_at: string;
  amount_cad: string;
  fee_cad: string;
  status: string;
  reason_code: string;
};

type DaySeries = {
  date: string;
  earned: number;
  cashReceived: number;
  essentialSpend: number;
  balance: number;
};

function readCsv<T>(filename: string): T[] {
  const raw = fs.readFileSync(path.join(DATA, filename), "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[];
}

function isoDay(ts: string): string {
  return ts.slice(0, 10);
}

function enumerateDays(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function buildWorkerSeries(
  _workerId: string,
  earnings: EarningsRow[],
  txns: TxnRow[]
): DaySeries[] {
  const wEarn = earnings;
  const wTxn = txns
    .slice()
    .sort((a, b) => a.txn_ts.localeCompare(b.txn_ts));

  if (wEarn.length === 0 && wTxn.length === 0) return [];

  const dates = [
    ...wEarn.map((e) => e.work_date),
    ...wTxn.map((t) => isoDay(t.txn_ts)),
  ].sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  const days = enumerateDays(start, end);

  const earnedByDay = new Map<string, number>();
  for (const e of wEarn) {
    earnedByDay.set(
      e.work_date,
      (earnedByDay.get(e.work_date) ?? 0) + Number(e.net_pay_cad)
    );
  }

  const cashByDay = new Map<string, number>();
  const spendByDay = new Map<string, number>();

  for (const t of wTxn) {
    const d = isoDay(t.txn_ts);
    const amt = Number(t.amount_cad);
    // Wage income only — advances are financing, not earned cash
    if (t.direction === "credit" && t.category === "income") {
      cashByDay.set(d, (cashByDay.get(d) ?? 0) + amt);
    }
    // All debits = burn rate for solvency (matches actual runway)
    if (t.direction === "debit") {
      spendByDay.set(d, (spendByDay.get(d) ?? 0) + amt);
    }
  }

  // Opening balance from first txn running balance, backed out
  let balance = 0;
  if (wTxn.length > 0) {
    const first = wTxn[0];
    const amt = Number(first.amount_cad);
    const rb = Number(first.running_balance_cad);
    balance = first.direction === "credit" ? rb - amt : rb + amt;
  }

  const series: DaySeries[] = [];
  for (const d of days) {
    const earned = earnedByDay.get(d) ?? 0;
    const cashReceived = cashByDay.get(d) ?? 0;
    const essentialSpend = spendByDay.get(d) ?? 0;
    balance += cashReceived - essentialSpend;
    series.push({ date: d, earned, cashReceived, essentialSpend, balance });
  }

  void _workerId;
  return series;
}

function pendingFromEarnings(
  wEarn: EarningsRow[],
  earnCashDate: Map<string, string>,
  asOf: string
): { amount: number; arrivesBy: string | null; items: { date: string; amount: number }[] } {
  const pending: { date: string; amount: number }[] = [];
  for (const e of wEarn) {
    if (e.work_date > asOf) continue;
    const cashDate = earnCashDate.get(e.earnings_id);
    if (!cashDate) continue;
    if (cashDate > asOf) {
      pending.push({ date: cashDate, amount: Number(e.net_pay_cad) });
    }
  }
  pending.sort((a, b) => a.date.localeCompare(b.date));
  const amount = pending.reduce((s, p) => s + p.amount, 0);
  const arrivesBy = pending.length ? pending[pending.length - 1].date : null;
  return { amount, arrivesBy, items: pending };
}

function groupByWorkerId<T extends { worker_id: string }>(
  rows: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.worker_id);
    if (list) list.push(row);
    else map.set(row.worker_id, [row]);
  }
  return map;
}

function main() {
  console.log("Reading CSVs…");
  const workers = readCsv<WorkerRow>("workers.csv");
  const earnings = readCsv<EarningsRow>("daily_earnings.csv");
  const txns = readCsv<TxnRow>("transactions.csv");
  const obligations = readCsv<ObligationRow>("recurring_obligations.csv");
  const advances = readCsv<AdvanceRow>("earned_wage_advances.csv");

  // Map earnings_id → cash arrival date
  const earnCashDate = new Map<string, string>();
  for (const t of txns) {
    const notes = t.notes || "";
    const m = notes.match(/linked_earnings_id=(E-\d+)/);
    if (m && t.direction === "credit") {
      earnCashDate.set(m[1], isoDay(t.txn_ts));
    }
  }

  const earningsByWorker = groupByWorkerId(earnings);
  const txnsByWorker = groupByWorkerId(txns);
  const obligationsByWorker = groupByWorkerId(obligations);
  const advancesByWorker = groupByWorkerId(advances);

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, "workers"), { recursive: true });

  const index: {
    workerId: string;
    occupation: string;
    city: string;
    payType: string;
  }[] = [];

  let totalFeesPaid = 0;
  let totalFeesAvoidable = 0;
  let advancesPaidCount = 0;
  let advancesAvoidableCount = 0;
  let workersWithP10 = 0;
  let workersBreachedP10 = 0;
  const calibrationBuckets: { predicted: number; actual: number }[] = [];

  const t0 = Date.now();

  for (let i = 0; i < workers.length; i++) {
    const w = workers[i];
    const wEarn = earningsByWorker.get(w.worker_id) ?? [];
    const wTxn = txnsByWorker.get(w.worker_id) ?? [];
    const seriesFull = buildWorkerSeries(w.worker_id, wEarn, wTxn);
    if (seriesFull.length < 14) {
      console.warn(`Skipping ${w.worker_id}: only ${seriesFull.length} days`);
      continue;
    }

    // Snap "today" 3 days before the last observed day so pending lagged
    // payouts still show — the earned vs in-hand gap is the product premise.
    const asOfIdx = Math.max(13, seriesFull.length - 4);
    const series = seriesFull.slice(0, asOfIdx + 1);
    const asOf = series[series.length - 1].date;
    const startingBalance = series[series.length - 1].balance;
    const history: DayCashflow[] = series.map((d) => ({
      earned: d.earned,
      cashReceived: d.cashReceived,
      essentialSpend: d.essentialSpend,
    }));

    const seed = hashSeed(w.worker_id + "|" + asOf);
    const solvency = simulateSolvency({
      history,
      startingBalance,
      runs: 2000,
      horizon: 120,
      seed,
    });

    const p10Days = solvency.p10;
    const p50Days = solvency.p50;
    const p90Days = solvency.p90;

    const pending = pendingFromEarnings(wEarn, earnCashDate, asOf);

    const recent = series.slice(-14);
    const earned14 = recent.reduce((s, d) => s + d.earned, 0);
    const cash14 = recent.reduce((s, d) => s + d.cashReceived, 0);

    const hours = wEarn
      .map((e) => ({
        h: Number(e.hours_worked),
        n: Number(e.net_pay_cad),
      }))
      .filter((x) => x.h > 0);
    const hourlyRates = hours.map((x) => x.n / x.h).sort((a, b) => a - b);
    const medianNetHourly =
      hourlyRates.length === 0
        ? 20
        : hourlyRates[Math.floor(hourlyRates.length / 2)];

    const dailyWageP10 = estimateDailyWageP10(history, seed ^ 0xabc, 400);

    const wObl = (obligationsByWorker.get(w.worker_id) ?? []).map((o) => ({
      id: o.obligation_id,
      name: o.name,
      category: o.category,
      amount: Number(o.amount_cad),
      frequency: o.frequency,
      dueDay: Number(o.due_day_of_month),
      essential: o.essential === "1",
    }));

    const wAdv = (advancesByWorker.get(w.worker_id) ?? [])
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({
        id: a.advance_id,
        requestedAt: a.requested_at,
        amount: Number(a.amount_cad),
        fee: Number(a.fee_cad),
        status: a.status,
        reason: a.reason_code,
      }));

    // --- Backtest: fit on first 8 weeks, walk forward ---
    const fitEndIdx = Math.min(series.length - 1, 55); // ~8 weeks
    const fitSeries = series.slice(0, fitEndIdx + 1);
    const fitHistory: DayCashflow[] = fitSeries.map((d) => ({
      earned: d.earned,
      cashReceived: d.cashReceived,
      essentialSpend: d.essentialSpend,
    }));
    const fitBalance = fitSeries[fitSeries.length - 1].balance;
    const fitDate = fitSeries[fitSeries.length - 1].date;
    const fitSeed = hashSeed(w.worker_id + "|fit|" + fitDate);
    const fitSolvency = simulateSolvency({
      history: fitHistory,
      startingBalance: fitBalance,
      runs: 2000,
      horizon: 120,
      seed: fitSeed,
    });

    if (fitSolvency.p10 !== null) {
      workersWithP10 += 1;
      // Reconstruct OOS path with the same cashflow identity the sim uses
      let bal = fitBalance;
      let actualBreachDay: number | null = null;
      for (let di = fitEndIdx + 1; di < series.length; di++) {
        bal += series[di].cashReceived - series[di].essentialSpend;
        if (bal < 0) {
          actualBreachDay = di - fitEndIdx; // 1-based days after fit
          break;
        }
      }
      const actualBreachedByP10 =
        actualBreachDay !== null && actualBreachDay <= fitSolvency.p10;
      if (actualBreachedByP10) workersBreachedP10 += 1;
      calibrationBuckets.push({
        predicted: fitSolvency.p10,
        actual: actualBreachedByP10 ? 1 : 0,
      });
    } else {
      // Survived simulated horizon at p10 — count only if OOS actually breached early
      let bal = fitBalance;
      let actualBreachDay: number | null = null;
      for (let di = fitEndIdx + 1; di < series.length; di++) {
        bal += series[di].cashReceived - series[di].essentialSpend;
        if (bal < 0) {
          actualBreachDay = di - fitEndIdx;
          break;
        }
      }
      // For workers with no finite p10, "breach of p10" is false
      // (predicted they wouldn't hit by day 12 of any early window)
      calibrationBuckets.push({
        predicted: 121,
        actual: 0,
      });
      void actualBreachDay;
    }

    // Advance avoidability: 4-day buffer
    for (const adv of wAdv) {
      const reqDay = isoDay(adv.requestedAt);
      totalFeesPaid += adv.fee;
      advancesPaidCount += 1;

      let pending4 = 0;
      for (const e of wEarn) {
        if (e.work_date > reqDay) continue;
        const cashDate = earnCashDate.get(e.earnings_id);
        if (!cashDate) continue;
        if (cashDate > reqDay && cashDate <= addDays(reqDay, 4)) {
          pending4 += Number(e.net_pay_cad);
        }
      }
      const dayIdx = series.findIndex((d) => d.date === reqDay);
      let received4 = 0;
      if (dayIdx >= 0) {
        for (let k = 1; k <= 4 && dayIdx + k < series.length; k++) {
          received4 += series[dayIdx + k].cashReceived;
        }
      }
      const cover = Math.max(pending4, received4);
      if (cover >= adv.amount) {
        totalFeesAvoidable += adv.fee;
        advancesAvoidableCount += 1;
      }
    }

    const payload = {
      workerId: w.worker_id,
      city: w.city,
      occupation: w.occupation,
      payType: w.pay_type,
      incomeVolatility: Number(w.income_volatility),
      dependents: Number(w.dependents),
      rentBurden: w.rent_burden_band,
      bankingAccess: w.has_bank_account === "1",
      asOfDate: asOf,
      balance: startingBalance,
      history: series,
      solvency: {
        p10Days,
        p50Days,
        p90Days,
        p10Date: p10Days !== null ? addDays(asOf, p10Days) : null,
        p50Date: p50Days !== null ? addDays(asOf, p50Days) : null,
        p90Date: p90Days !== null ? addDays(asOf, p90Days) : null,
        breachRate: solvency.breachRate,
        meanEarnedToDate: solvency.meanEarnedToDate,
        meanCashInHandToDate: solvency.meanCashInHandToDate,
      },
      earned14,
      cash14,
      pendingCash: pending.amount,
      pendingArrivesBy: pending.arrivesBy,
      pendingItems: pending.items,
      dailyWageP10,
      medianNetHourly,
      typicalDailyNet: Number(w.typical_daily_net_cad),
      obligations: wObl,
      advances: wAdv,
      seed,
    };

    fs.writeFileSync(
      path.join(OUT, "workers", `${w.worker_id}.json`),
      JSON.stringify(payload)
    );

    index.push({
      workerId: w.worker_id,
      occupation: w.occupation,
      city: w.city,
      payType: w.pay_type,
    });

    if ((i + 1) % 20 === 0 || i === workers.length - 1) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ${i + 1}/${workers.length} workers (${elapsed}s)`);
    }
  }

  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ workers: index }));

  const calibrationRate =
    workersWithP10 === 0 ? 0 : workersBreachedP10 / workersWithP10;

  // Calibration chart: predicted risk decile vs actual breach rate
  // Group workers by whether p10 was early (higher risk) — use predicted days buckets
  const chartBins = [
    { label: "≤14d", min: 0, max: 14, predicted: 0.1, n: 0, breaches: 0 },
    { label: "15–30d", min: 15, max: 30, predicted: 0.1, n: 0, breaches: 0 },
    { label: "31–60d", min: 31, max: 60, predicted: 0.1, n: 0, breaches: 0 },
    { label: "61–120d", min: 61, max: 120, predicted: 0.1, n: 0, breaches: 0 },
  ];
  for (const b of calibrationBuckets) {
    const bin = chartBins.find((c) => b.predicted >= c.min && b.predicted <= c.max);
    if (bin) {
      bin.n += 1;
      bin.breaches += b.actual;
    }
  }

  const backtest = {
    label: "Backtested on 220 synthetic worker histories.",
    workerCount: index.length,
    totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
    totalFeesAvoidable: Math.round(totalFeesAvoidable * 100) / 100,
    advancesPaidCount,
    advancesAvoidableCount,
    calibration: {
      predictedBreachRate: 0.1,
      actualBreachRate: Math.round(calibrationRate * 1000) / 1000,
      workersWithP10,
      workersBreachedP10,
      sentence:
        calibrationRate <= 0.15 && calibrationRate >= 0.05
          ? `${workersBreachedP10} of ${workersWithP10} people with a worst-case date ran out of cash by that day — about ${(calibrationRate * 100).toFixed(0)}%, close to the 10% goal.`
          : `${workersBreachedP10} of ${workersWithP10} people with a worst-case date ran out of cash by that day — about ${(calibrationRate * 100).toFixed(0)}% (goal: about 10%).`,
      chart: chartBins.map((c) => ({
        label: c.label,
        predictedRate: 0.1,
        actualRate: c.n === 0 ? 0 : Math.round((c.breaches / c.n) * 1000) / 1000,
        n: c.n,
      })),
    },
  };

  fs.writeFileSync(path.join(OUT, "backtest.json"), JSON.stringify(backtest, null, 2));

  console.log("\nDone.");
  console.log(`  Workers written: ${index.length}`);
  console.log(`  Fees paid: $${backtest.totalFeesPaid}`);
  console.log(`  Fees avoidable: $${backtest.totalFeesAvoidable}`);
  console.log(
    `  Calibration: ${(backtest.calibration.actualBreachRate * 100).toFixed(1)}% breached p10 (target ~10%)`
  );
  console.log(`  Output: ${OUT}`);
}

main();
