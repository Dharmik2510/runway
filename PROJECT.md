Build "Runway" — a Next.js app for daily-wage workers that predicts cash
shortfalls and intercepts predatory earned-wage advances. This is a hackathon
demo: it must run fully offline with no API calls, no auth, and no database.

## DATA
Six CSVs in /data (synthetic, ~220 workers, 14 weeks each):
- workers.csv (220 rows) — occupation, pay_type, income_volatility,
  banking_access, rent_burden, dependents
- daily_earnings.csv (12,204) — per-shift gross, tips, deductions, net_pay,
  and same-day vs lagged payout timing
- recurring_obligations.csv (849) — rent, phone, utilities, childcare, debt
  with due days
- transactions.csv (31,726) — credits/debits with channel, essential flag,
  running balance
- advances.csv (535) — amount, fee, reason, repayment status
- weekly_cashflow.csv (3,072) — pre-aggregated weekly income, essential
  spend, ending balance

First, inspect the actual column names and print a schema summary. Do not
assume my names above are exact — read the headers and adapt.

## STEP 1 — ETL + precompute script (scripts/build-data.ts)
Run at build time via `npm run precompute`. Output static JSON to /public/data.
Nothing expensive may run in the browser.

a) Per worker, build a daily series: date, earned, cash_received (respect the
   payout lag), essential_spend, balance.
b) Simulator (lib/solvency.ts):
   - BLOCK bootstrap: resample contiguous 7-day blocks from the worker's
     history, NOT individual days — bad weeks cluster and iid resampling
     produces dishonest tails.
   - Seeded PRNG (mulberry32) so the date never jitters between reloads.
   - 2,000 runs × 120-day horizon. Return the day cash first goes negative
     at p10 / p50 / p90.
   - Track earned-to-date and cash-in-hand-to-date as SEPARATE curves. The
     gap between them is the entire premise of the product.
c) Replay harness: for each worker, fit on their first 8 weeks, walk forward
   through the remainder. For every advance they actually took, decide whether
   a 4-day buffer would have covered the shortfall. Emit:
   - total fees paid, fees classified avoidable, count of each
   - calibration: what fraction of workers breached their own p10 date
     (should land near 10%)
   Write to /public/data/backtest.json.
d) Unit test the simulator first: feed it a constant $100/day history with
   $80/day burn and assert the funded date matches hand arithmetic exactly.

## STEP 2 — THREE SCREENS
Client-side, reading the precomputed JSON. Simulate only the active worker live.

1. /  "Today"
   - Hero: funded-until DATE as the largest element on screen. Show worst case
     FIRST and prominently, likely case secondary. Never show the median alone.
   - Daily wage: p10 of simulated 30-day average. Apply hysteresis — only
     change the displayed wage if the new value differs by >8% for 5
     consecutive days, otherwise it flickers and feels broken.
   - Earned vs in-hand: "$610 earned · $290 in hand · $320 arrives by Thu"
   - One input: log today's earnings. On submit, recompute and animate the
     date, then show ONE plain sentence explaining why it moved
     ("Good day — pushed your date forward 2 days"). No dashboard of charts.
   - Worker switcher in the header, populated from real worker IDs.

2. /decide  "The intercept"
   - Entered by tapping "Take a $150 advance" on the home screen.
   - Show: shortfall amount and date, when the pending payout lands, the fee
     in dollars AND as an annualized rate, and the fee expressed as hours of
     work at this worker's median net hourly.
   - Two concrete alternatives, generated from their own obligations data:
     the smallest bill that could be deferred past the payout date, and a
     partial advance that covers only the true shortfall rather than $150.
   - A clear "take it anyway" path. Never block the user, never scold.

3. /proof  "Does this work?"
   - Fees avoidable vs fees paid across all 220 workers, as one horizontal
     bar. Big dollar figures.
   - Calibration: one sentence plus a simple chart of predicted vs actual
     breach rate.
   - Label prominently: "Backtested on 220 synthetic worker histories."
     Do not imply real-world validation.

## DESIGN — this is judged, treat it as a requirement
- Dark, near-black background (#0A0A0B). Warm off-white text (#EDEBE6).
  Muted gray for secondary (#8A8880).
- Exactly ONE accent: amber (#E0A030) for money and positive movement. Red
  (#D9534F) ONLY for a shortfall. No other colors anywhere.
- Typography carries the design. Hero numbers 56-64px, weight 500, tabular
  figures (font-variant-numeric: tabular-nums) so digits don't shift when
  values animate. Body 15px, line-height 1.6.
- Generous whitespace. Cards: subtle 1px border at 8% white, 12px radius,
  no shadows, no gradients, no glow.
- Max one chart per screen. No pie charts, no donuts, no 12-metric grids.
- Animate the funded-until date changing (300ms) — it's the emotional core.
- Mobile-first, 390px viewport, but must not break on a projector at 1920px.
- Sentence case everywhere. No emoji.

## DO NOT BUILD
No bank linking, no OAuth, no voice input, no LLM calls, no spend-category
breakdowns, no retrospective shaming ("you overspent on food"), no
multi-field entry forms, no onboarding flow, no settings page, no seasonality
or annualization (14 weeks of data can't support it).

## ACCEPTANCE CRITERIA
- `npm run precompute && npm run dev` works from a clean clone, offline.
- Switching workers updates every number on screen.
- Logging a shift visibly moves the funded-until date in under 200ms.
- /proof shows a real computed dollar figure, not a hardcoded one.
- The simulator unit test passes.

Start by reading the CSV headers and printing the schema. Then write and test
lib/solvency.ts before touching any UI.