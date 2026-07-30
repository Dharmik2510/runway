"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, annualizedFeeRate } from "@/lib/solvency";
import { useWorker } from "@/lib/worker-context";
import { formatShortDate, money, moneyExact } from "@/lib/types";

const ADVANCE = 150;
const FEE_RATE = 0.05;
const FEE = Math.round(ADVANCE * FEE_RATE * 100) / 100;

export default function DecidePage() {
  const { live, payload, loading } = useWorker();
  const [taken, setTaken] = useState(false);

  const analysis = useMemo(() => {
    if (!live || !payload) return null;

    const trueShortfall = Math.min(
      ADVANCE,
      Math.max(
        25,
        live.balance < 0
          ? Math.ceil(Math.abs(live.balance))
          : live.balance < 80
            ? Math.ceil(80 - live.balance)
            : 40
      )
    );

    const partial = trueShortfall;
    const partialFee = Math.round(partial * FEE_RATE * 100) / 100;

    const payoutDate =
      live.pendingArrivesBy ??
      addDays(live.asOfDate, Math.min(4, live.p10Days ?? 4));

    const termDays = Math.max(
      1,
      Math.round(
        (new Date(payoutDate + "T12:00:00Z").getTime() -
          new Date(live.asOfDate + "T12:00:00Z").getTime()) /
          86400000
      )
    );

    const apr = annualizedFeeRate(FEE, ADVANCE, termDays);
    const hoursOfWork =
      payload.medianNetHourly > 0 ? FEE / payload.medianNetHourly : 0;

    const sortedBills = [...payload.obligations].sort(
      (a, b) => a.amount - b.amount
    );
    const deferBill =
      sortedBills.find((o) => o.essential) ?? sortedBills[0] ?? null;

    return {
      shortfall: trueShortfall,
      shortfallDate: live.p10Date,
      payoutDate,
      apr,
      hoursOfWork,
      deferBill,
      partial,
      partialFee,
      termDays,
    };
  }, [live, payload]);

  if (loading || !live || !payload || !analysis) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  if (taken) {
    return (
      <div className="space-y-6">
        <h1 className="text-[28px] font-medium tracking-tight">Advance taken</h1>
        <p style={{ color: "var(--muted)" }}>
          {moneyExact(ADVANCE)} is on the way. Fee {moneyExact(FEE)}. No judgment
          — Runway will keep watching your funded-until date.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-medium tracking-tight">The intercept</h1>
        <p className="mt-1" style={{ color: "var(--muted)" }}>
          Before you take {money(ADVANCE)}, here is what the numbers say — in
          dollars and in hours of your work.
        </p>
      </div>

      <section className="card space-y-4 px-4 py-5">
        <div>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Shortfall
          </p>
          <p
            className="tabular text-[32px] font-medium"
            style={{ color: "var(--danger)" }}
          >
            {money(analysis.shortfall)}
          </p>
          {analysis.shortfallDate && (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              Pressure around {formatShortDate(analysis.shortfallDate)}
            </p>
          )}
        </div>

        <div>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Pending payout lands
          </p>
          <p className="tabular text-[22px] font-medium">
            {formatShortDate(analysis.payoutDate)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Fee
            </p>
            <p
              className="tabular text-[22px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              {moneyExact(FEE)}
            </p>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              {(analysis.apr * 100).toFixed(0)}% annualized · {analysis.termDays}d
            </p>
          </div>
          <div>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              In hours of work
            </p>
            <p
              className="tabular text-[22px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              {analysis.hoursOfWork.toFixed(1)} hrs
            </p>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              at {moneyExact(payload.medianNetHourly)}/hr
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-medium">Two alternatives</h2>

        {analysis.deferBill && (
          <div className="card space-y-1 px-4 py-4">
            <p className="font-medium">Defer {analysis.deferBill.name}</p>
            <p style={{ color: "var(--muted)" }}>
              {moneyExact(analysis.deferBill.amount)} due day{" "}
              {analysis.deferBill.dueDay} — push it past{" "}
              {formatShortDate(analysis.payoutDate)} and skip the fee.
            </p>
          </div>
        )}

        <div className="card space-y-1 px-4 py-4">
          <p className="font-medium">
            Partial advance of {money(analysis.partial)}
          </p>
          <p style={{ color: "var(--muted)" }}>
            Covers the true shortfall. Fee drops to{" "}
            {moneyExact(analysis.partialFee)} instead of {moneyExact(FEE)}.
          </p>
        </div>
      </section>

      <section className="space-y-3 pt-2">
        <button type="button" onClick={() => setTaken(true)} className="btn-ghost">
          Take it anyway
        </button>
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-[15px]"
          style={{ color: "var(--muted)" }}
        >
          Not now
        </Link>
      </section>
    </div>
  );
}
