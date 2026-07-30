"use client";

import { useEffect, useState } from "react";
import type { BacktestData } from "@/lib/types";
import { money } from "@/lib/types";

const BIN_COPY: Record<string, string> = {
  "≤14d": "Worst-case date within 2 weeks",
  "15–30d": "Worst-case date in 2–4 weeks",
  "31–60d": "Worst-case date in 1–2 months",
  "61–120d": "Worst-case date in 2–4 months",
};

export default function ProofPage() {
  const [data, setData] = useState<BacktestData | null>(null);

  useEffect(() => {
    fetch("/data/backtest.json")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return <p style={{ color: "var(--muted)" }}>Loading results…</p>;
  }

  const paid = data.totalFeesPaid;
  const avoidable = data.totalFeesAvoidable;
  const max = Math.max(paid, avoidable, 1);
  const chart = data.calibration.chart;
  const actualPct = Math.round(data.calibration.actualBreachRate * 100);
  const { workersWithP10, workersBreachedP10 } = data.calibration;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px] font-medium tracking-tight">Does this work?</h1>
        <p
          className="card mt-3 px-3 py-2 text-[14px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          {data.label}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-[16px] font-medium">
          Advance fees across {data.workerCount} workers
        </h2>

        <div className="space-y-4">
          <BarRow
            label="Fees people actually paid"
            value={paid}
            widthPct={(paid / max) * 100}
            color="var(--danger)"
          />
          <BarRow
            label="Fees they might have skipped"
            value={avoidable}
            widthPct={(avoidable / max) * 100}
            color="var(--accent)"
          />
        </div>

        <p className="text-[15px]" style={{ color: "var(--muted)" }}>
          In this test, {data.advancesAvoidableCount} of {data.advancesPaidCount}{" "}
          advances looked skippable — the money they needed was already earned and
          due within about four days.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[16px] font-medium">
          Are the worst-case dates honest?
        </h2>
        <p style={{ color: "var(--muted)" }}>
          Runway’s “worst case” date is meant to be cautious: only about{" "}
          <span style={{ color: "var(--text)" }}>1 in 10</span> people should run
          out of cash by that day. If far more (or far fewer) do, the date isn’t
          trustworthy.
        </p>

        <div className="card space-y-3 px-4 py-5">
          <p
            className="tabular text-[40px] font-medium leading-none"
            style={{ color: "var(--accent)" }}
          >
            {actualPct}%
          </p>
          <p style={{ color: "var(--text)" }}>
            {workersBreachedP10} of {workersWithP10} people with a worst-case date
            ran out of cash by that day — about {actualPct}%, close to the 10%
            goal.
          </p>
        </div>

        <div className="card space-y-5 px-4 py-5">
          <div>
            <p className="text-[14px] font-medium">By how soon the date was</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
              Gray mark = the 10% goal. Bars show who actually ran out.
            </p>
          </div>

          {chart.map((bin) => {
            const ranOut = Math.round(bin.actualRate * bin.n);
            const pct = Math.round(bin.actualRate * 100);
            const title = BIN_COPY[bin.label] ?? bin.label;
            return (
              <div key={bin.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px]">{title}</p>
                  <p
                    className="shrink-0 tabular text-[13px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {bin.n} people
                  </p>
                </div>
                <div className="track relative h-3 w-full rounded-full">
                  <div
                    className="absolute left-0 top-0 h-3 rounded-full"
                    style={{
                      width: `${Math.min(100, bin.actualRate * 100 * 2)}%`,
                      background: "var(--accent)",
                    }}
                  />
                  <div
                    className="marker absolute top-[-2px] h-[16px] w-px"
                    style={{ left: "20%" }}
                    title="About 1 in 10"
                  />
                </div>
                <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                  {bin.n === 0 ? (
                    "No one in this group"
                  ) : pct === 0 ? (
                    <>
                      None of them ran out by that date{" "}
                      <span style={{ color: "var(--accent)" }}>(0%)</span>
                    </>
                  ) : (
                    <>
                      {ranOut} ran out by that date{" "}
                      <span
                        className="tabular"
                        style={{ color: "var(--accent)" }}
                      >
                        ({pct}%)
                      </span>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BarRow({
  label,
  value,
  widthPct,
  color,
}: {
  label: string;
  value: number;
  widthPct: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px]" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="tabular text-[28px] font-medium" style={{ color }}>
          {money(value)}
        </p>
      </div>
      <div className="track h-4 w-full rounded-full">
        <div
          className="h-4 rounded-full transition-[width] duration-300"
          style={{ width: `${Math.max(2, widthPct)}%`, background: color }}
        />
      </div>
    </div>
  );
}
