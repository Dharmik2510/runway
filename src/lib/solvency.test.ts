import { describe, expect, it } from "vitest";
import {
  mulberry32,
  percentile,
  simulateSolvency,
  type DayCashflow,
} from "./solvency";

function constantHistory(
  n: number,
  earned: number,
  cashReceived: number,
  essentialSpend: number
): DayCashflow[] {
  return Array.from({ length: n }, () => ({
    earned,
    cashReceived,
    essentialSpend,
  }));
}

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("simulateSolvency", () => {
  it("constant $100/day history with $80/day burn matches hand arithmetic", () => {
    // Net +$20/day. Starting at $0, balance after d days = 20d ≥ 0.
    // Never crosses negative within the horizon — hand arithmetic says "survives".
    const history = constantHistory(56, 100, 100, 80);
    const result = simulateSolvency({
      history,
      startingBalance: 0,
      runs: 200,
      horizon: 120,
      seed: 1,
    });
    expect(result.p10).toBeNull();
    expect(result.p50).toBeNull();
    expect(result.p90).toBeNull();
  });

  it("constant drain hits negative on the exact hand-computed day", () => {
    // Earn $100 (unpaid), receive $0, burn $80. Start $240.
    // Day1:160 Day2:80 Day3:0 Day4:-80 → first negative day = 4
    const history = constantHistory(56, 100, 0, 80);
    const result = simulateSolvency({
      history,
      startingBalance: 240,
      runs: 200,
      horizon: 120,
      seed: 7,
    });
    expect(result.p10).toBe(4);
    expect(result.p50).toBe(4);
    expect(result.p90).toBe(4);
  });

  it("identical seeds produce identical percentiles", () => {
    const history = constantHistory(28, 100, 50, 90);
    const a = simulateSolvency({
      history,
      startingBalance: 200,
      runs: 500,
      horizon: 60,
      seed: 99,
    });
    const b = simulateSolvency({
      history,
      startingBalance: 200,
      runs: 500,
      horizon: 60,
      seed: 99,
    });
    expect(a).toEqual(b);
  });

  it("tracks earned and cash-in-hand as separate curves", () => {
    const history = constantHistory(14, 100, 40, 50);
    const result = simulateSolvency({
      history,
      startingBalance: 100,
      runs: 50,
      horizon: 14,
      seed: 3,
    });
    // After 14 days of +100 earned each: earned-to-date = 1400 on surviving paths
    // cash-in-hand change: +40 - 50 = -10/day from start 100 → end 100 - 140 = -40
    expect(result.meanEarnedToDate).toBeCloseTo(1400, 0);
    expect(result.meanCashInHandToDate).toBeCloseTo(-40, 0);
    expect(result.meanEarnedToDate - result.meanCashInHandToDate).toBeGreaterThan(
      1000
    );
  });
});

describe("percentile", () => {
  it("returns nearest-rank percentiles", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 0.1)).toBe(1);
    expect(percentile(values, 0.5)).toBe(5);
    expect(percentile(values, 0.9)).toBe(9);
  });
});
