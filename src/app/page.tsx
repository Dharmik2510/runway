"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AnimatedDate } from "@/components/AnimatedDate";
import { useWorker } from "@/lib/worker-context";
import { formatShortDate, formatWeekday, money } from "@/lib/types";

export default function TodayPage() {
  const { live, payload, loading, logEarnings } = useWorker();
  const [amount, setAmount] = useState("");

  if (loading || !live || !payload) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-3 w-24 rounded bg-[var(--track)]" />
        <div className="h-14 w-48 rounded bg-[var(--track)]" />
        <div className="h-8 w-32 rounded bg-[var(--track)]" />
        <p className="pt-4" style={{ color: "var(--muted)" }}>
          Loading worker…
        </p>
      </div>
    );
  }

  const worstDate = live.p10Date;
  const likelyDate = live.p50Date;
  const pendingGap =
    live.pendingCash > 0
      ? live.pendingCash
      : Math.max(0, live.earned14 - live.cash14);
  const arrivesLabel = live.pendingArrivesBy
    ? formatWeekday(live.pendingArrivesBy)
    : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    logEarnings(n);
    setAmount("");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p
          className="text-[13px] uppercase tracking-[0.08em]"
          style={{ color: "var(--muted)" }}
        >
          Funded until
        </p>
        <div className="space-y-1">
          <p className="text-[14px] font-medium" style={{ color: "var(--danger)" }}>
            Worst case
          </p>
          {worstDate ? (
            <AnimatedDate
              value={formatShortDate(worstDate)}
              className="hero-num"
              style={{ color: "var(--danger)" }}
            />
          ) : (
            <p className="hero-num" style={{ color: "var(--accent)" }}>
              Beyond 120 days
            </p>
          )}
        </div>
        <div className="flex items-baseline gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            Likely
          </p>
          {likelyDate ? (
            <p
              className="tabular text-[22px] font-medium"
              style={{ color: "var(--text)" }}
            >
              {formatShortDate(likelyDate)}
            </p>
          ) : (
            <p
              className="tabular text-[22px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Beyond 120 days
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="card space-y-1 px-4 py-4">
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Daily wage
          </p>
          <p
            className="tabular text-[28px] font-medium"
            style={{ color: "var(--accent)" }}
          >
            {money(live.dailyWage)}
          </p>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>
            Cautious estimate
          </p>
        </section>

        <section className="card space-y-1 px-4 py-4">
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Cash on hand
          </p>
          <p
            className="tabular text-[28px] font-medium"
            style={{ color: "var(--text)" }}
          >
            {money(live.balance)}
          </p>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>
            After essentials so far
          </p>
        </section>
      </div>

      <section className="card space-y-2 px-4 py-4">
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Earned vs in hand
        </p>
        <p className="tabular text-[16px] leading-relaxed" style={{ color: "var(--text)" }}>
          <span style={{ color: "var(--accent)" }}>{money(live.earned14)}</span>
          {" earned · "}
          <span style={{ color: "var(--accent)" }}>{money(live.cash14)}</span>
          {" in hand"}
          {pendingGap > 0 && arrivesLabel ? (
            <>
              {" · "}
              <span style={{ color: "var(--accent)" }}>{money(pendingGap)}</span>
              {` arrives by ${arrivesLabel}`}
            </>
          ) : null}
        </p>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          That gap is why advances feel necessary — even when the work is already
          done.
        </p>
      </section>

      <section className="card space-y-3 px-4 py-4">
        <p className="text-[14px] font-medium">Log today&apos;s earnings</p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <label className="sr-only" htmlFor="log-earn">
            Today&apos;s earnings
          </label>
          <input
            id="log-earn"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            placeholder="Amount earned today"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field"
          />
          <button type="submit" className="btn-primary">
            Log
          </button>
        </form>
        {live.lastMoveReason && (
          <p className="text-[15px]" style={{ color: "var(--accent)" }}>
            {live.lastMoveReason}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <Link href="/decide" className="btn-ghost">
          Take a $150 advance
        </Link>
        <p className="text-center text-[13px]" style={{ color: "var(--muted)" }}>
          See the fee clearly before you decide
        </p>
      </section>
    </div>
  );
}
