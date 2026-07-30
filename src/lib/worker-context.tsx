"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDays,
  applyWageHysteresis,
  estimateDailyWageP10,
  hashSeed,
  simulateSolvency,
  type DayCashflow,
} from "@/lib/solvency";
import type { WorkerIndexEntry, WorkerPayload } from "@/lib/types";

const STORAGE_KEY = "runway-worker-id";
/** Stressed rideshare worker: short funded-until window, advances, clear gap story */
const DEFAULT_WORKER = "W-0080";

type LiveState = {
  balance: number;
  earned14: number;
  cash14: number;
  pendingCash: number;
  pendingArrivesBy: string | null;
  history: DayCashflow[];
  asOfDate: string;
  p10Days: number | null;
  p50Days: number | null;
  p90Days: number | null;
  p10Date: string | null;
  p50Date: string | null;
  p90Date: string | null;
  dailyWage: number;
  wageStreak: number;
  lastMoveReason: string | null;
};

type WorkerContextValue = {
  index: WorkerIndexEntry[];
  workerId: string;
  setWorkerId: (id: string) => void;
  payload: WorkerPayload | null;
  live: LiveState | null;
  loading: boolean;
  logEarnings: (amount: number) => void;
};

const WorkerContext = createContext<WorkerContextValue | null>(null);

function toHistory(p: WorkerPayload): DayCashflow[] {
  return p.history.map((d) => ({
    earned: d.earned,
    cashReceived: d.cashReceived,
    essentialSpend: d.essentialSpend,
  }));
}

function buildLive(p: WorkerPayload): LiveState {
  return {
    balance: p.balance,
    earned14: p.earned14,
    cash14: p.cash14,
    pendingCash: p.pendingCash,
    pendingArrivesBy: p.pendingArrivesBy,
    history: toHistory(p),
    asOfDate: p.asOfDate,
    p10Days: p.solvency.p10Days,
    p50Days: p.solvency.p50Days,
    p90Days: p.solvency.p90Days,
    p10Date: p.solvency.p10Date,
    p50Date: p.solvency.p50Date,
    p90Date: p.solvency.p90Date,
    dailyWage: p.dailyWageP10,
    wageStreak: 0,
    lastMoveReason: null,
  };
}

function recompute(
  history: DayCashflow[],
  balance: number,
  asOfDate: string,
  workerId: string,
  prevWage: number,
  prevStreak: number
): Omit<LiveState, "earned14" | "cash14" | "pendingCash" | "pendingArrivesBy" | "lastMoveReason"> {
  const seed = hashSeed(workerId + "|" + asOfDate + "|" + history.length);
  const result = simulateSolvency({
    history,
    startingBalance: balance,
    runs: 800,
    horizon: 120,
    seed,
  });
  const wageCandidate = estimateDailyWageP10(history, seed ^ 0xabc, 200);
  const hyst = applyWageHysteresis(prevWage, wageCandidate, prevStreak);
  return {
    balance,
    history,
    asOfDate,
    p10Days: result.p10,
    p50Days: result.p50,
    p90Days: result.p90,
    p10Date: result.p10 !== null ? addDays(asOfDate, result.p10) : null,
    p50Date: result.p50 !== null ? addDays(asOfDate, result.p50) : null,
    p90Date: result.p90 !== null ? addDays(asOfDate, result.p90) : null,
    dailyWage: hyst.wage,
    wageStreak: hyst.streak,
  };
}

export function WorkerProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<WorkerIndexEntry[]>([]);
  const [workerId, setWorkerIdState] = useState(DEFAULT_WORKER);
  const [payload, setPayload] = useState<WorkerPayload | null>(null);
  const [live, setLive] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setWorkerIdState(stored);
    fetch("/data/index.json")
      .then((r) => r.json())
      .then((data: { workers: WorkerIndexEntry[] }) => {
        setIndex(data.workers);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/data/workers/${workerId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Worker not found");
        return r.json();
      })
      .then((data: WorkerPayload) => {
        if (cancelled) return;
        setPayload(data);
        setLive(buildLive(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  const setWorkerId = useCallback((id: string) => {
    setWorkerIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const logEarnings = useCallback(
    (amount: number) => {
      if (!live || !payload || amount <= 0) return;
      const t0 = performance.now();
      const prevP10 = live.p10Days;

      // Same-day pay for logged shifts in the demo
      const nextHistory = [
        ...live.history,
        { earned: amount, cashReceived: amount, essentialSpend: 0 },
      ];
      const nextBalance = live.balance + amount;
      const nextAsOf = addDays(live.asOfDate, 1);

      const recomputed = recompute(
        nextHistory,
        nextBalance,
        nextAsOf,
        payload.workerId,
        live.dailyWage,
        live.wageStreak
      );

      let reason: string | null = null;
      if (prevP10 !== null && recomputed.p10Days !== null) {
        const delta = recomputed.p10Days - prevP10;
        if (delta > 0) {
          reason = `Good day — pushed your date forward ${delta} day${delta === 1 ? "" : "s"}`;
        } else if (delta < 0) {
          reason = `Date moved in ${Math.abs(delta)} day${Math.abs(delta) === 1 ? "" : "s"} — cash still tight`;
        } else {
          reason = "Logged — funded-until date held steady";
        }
      } else if (prevP10 !== null && recomputed.p10Days === null) {
        reason = "Good day — you're funded past the forecast window";
      } else if (prevP10 === null && recomputed.p10Days !== null) {
        reason = "Date is now in range — cash outlook tightened";
      } else {
        reason = "Logged — still funded past the forecast window";
      }

      setLive({
        ...recomputed,
        earned14: live.earned14 + amount,
        cash14: live.cash14 + amount,
        pendingCash: live.pendingCash,
        pendingArrivesBy: live.pendingArrivesBy,
        lastMoveReason: reason,
      });

      const elapsed = performance.now() - t0;
      if (elapsed > 200) {
        console.warn(`logEarnings took ${elapsed.toFixed(0)}ms`);
      }
    },
    [live, payload]
  );

  const value = useMemo(
    () => ({
      index,
      workerId,
      setWorkerId,
      payload,
      live,
      loading,
      logEarnings,
    }),
    [index, workerId, setWorkerId, payload, live, loading, logEarnings]
  );

  return (
    <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>
  );
}

export function useWorker() {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error("useWorker must be used within WorkerProvider");
  return ctx;
}
