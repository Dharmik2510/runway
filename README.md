# Runway

**How long until my money runs out — before a $150 advance feels like the only option.**

Runway is an offline Next.js demo for **daily-wage and gig workers**. It forecasts a **funded-until date** (worst case first), shows the gap between wages **earned** and cash **in hand**, and intercepts predatory earned-wage advances with plain fee math — never judgment.

> **Personal pain this solves:** You’ve already worked the hours. Payday hasn’t hit. Rent or a bill is due. An app offers cash against your next deposit. The fee looks tiny until you see it as hours of work. Runway replaces that panic with one honest date and clear alternatives.

[Architecture](docs/ARCHITECTURE.md) · [Submission kit](SUBMISSION.md) · [Product brief](PROJECT.md)

---

## Why this is different

| Innovation | What it means |
|------------|----------------|
| **Worst case first** | The risky funded-until date is the hero — never hide behind a median |
| **Earned ≠ in hand** | Tracks payout lag explicitly; that gap is the product premise |
| **Advance intercept** | Fee in dollars, annualized rate, *and* hours of work at the worker’s wage |
| **Block bootstrap** | Resamples bad *weeks*, not iid days — tails stay honest |
| **Non-judgmental** | “Take it anyway” is always available |
| **Proof, labeled** | Backtest on 220 synthetic histories — not fake real-world claims |

---

## Screens

| Route | Purpose |
|-------|---------|
| `/` **Today** | Funded-until date, daily wage, earned vs in-hand, log a shift |
| `/decide` **Decide** | Intercept a $150 advance with alternatives |
| `/proof` **Proof** | Fees avoidable vs paid; are the dates trustworthy? |
| `/guide` **Guide** | Plain-language manual |

Light/dark theme (default light). Switch workers in the header to explore different cash stories.

---

## Quick start

```bash
npm install
npm run precompute
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
|--------|----------------|
| `npm run precompute` | ETL + simulations → `public/data/` |
| `npm test` | Solvency unit tests |
| `npm run build` | Precompute + production build |
| `npm run screenshots` | Capture 5 mobile screenshots for submission |

---

## How it works (short)

1. CSVs in `/data` (~220 workers × ~14 weeks) are transformed at build time.
2. A seeded **block-bootstrap** solvency sim estimates when cash first goes negative.
3. A walk-forward harness asks: for advances people took, would a short buffer have covered the shortfall?
4. The UI reads static JSON — **no API, auth, or database**.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Scoring map (hackathon)

| Criterion | Evidence in this repo |
|-----------|------------------------|
| **Innovation (25%)** | Gap premise, worst-case-first UX, fee-as-hours, block bootstrap |
| **Technical execution (25%)** | Typed simulator + tests, ETL script, theme system, clean App Router layout |
| **Functional completeness (20%)** | Four screens, theme, worker switcher, guide, offline demo |
| **Problem–solution fit (20%)** | Payday-lag + advance trap framed throughout product + docs |
| **UX (5%)** | Tokenized light/dark, typography hierarchy, plain language |
| **Ambition (5%)** | Multi-worker backtest, 120-day horizon, honest synthetic labeling |

---

## Data disclaimer

Synthetic CSVs and JSON only. Proof figures are **not** real-world validation. Nothing leaves the machine.

---

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Vitest
