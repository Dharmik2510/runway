# Architecture

How Runway is built — useful for technical review.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** with CSS custom properties for light/dark themes
- **Vitest** for the solvency simulator
- **csv-parse** + **tsx** for build-time ETL (`npm run precompute`)

No API routes, no auth, no database. The browser only fetches static JSON from `/public/data`.

## Data flow

```
/data/*.csv
    │
    ▼
scripts/build-data.ts   (ETL + block-bootstrap + walk-forward backtest)
    │
    ▼
public/data/
  index.json
  backtest.json
  workers/W-XXXX.json
    │
    ▼
Client (WorkerProvider) → Today / Decide / Proof
```

Heavy simulation runs at **build/precompute** time. Live interactions (log earnings, switch worker) re-run a lighter seeded sim for the active worker only.

## Core modules

| Path | Role |
|------|------|
| `src/lib/solvency.ts` | Block-bootstrap simulator, wage hysteresis, fee annualization |
| `src/lib/solvency.test.ts` | Unit tests (constant cashflow arithmetic) |
| `src/lib/worker-context.tsx` | Active worker, live state, log-earnings path |
| `src/lib/theme-context.tsx` | Light/dark with `localStorage` + flash-free boot |
| `scripts/build-data.ts` | Schema-adaptive CSV ETL, per-worker payloads, backtest |

## Why block bootstrap

Daily-wage stress clusters in bad weeks. Resampling individual days as iid understates tail risk and produces dishonest funded-until dates. Contiguous 7-day blocks keep that structure.

## Product premise in the math

The simulator tracks **earned-to-date** and **cash-in-hand-to-date** as separate curves. The gap between them is why workers take advances even when wages are “already earned.”

## Screens

| Route | Job |
|-------|-----|
| `/` | Funded-until date, wage, earned vs in-hand, log shift |
| `/decide` | Advance intercept |
| `/proof` | Backtest results in plain language |
| `/guide` | In-app manual |

## Constraints honored

Offline · no bank linking · no LLM · no spend shaming · no multi-field onboarding · synthetic data labeled as such.
