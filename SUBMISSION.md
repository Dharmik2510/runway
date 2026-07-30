# Hackathon submission kit

Copy these into **Hackathon → My Team → Submit Project**. Update the GitHub and Hosted URL once you push/deploy.

---

## Project name

**Runway**

---

## Short description (paste into the form)

Runway is a cash-survival tool for daily-wage and gig workers. It answers one personal question — *how long until my money runs out?* — by showing a worst-case funded-until date first, surfacing the gap between wages already earned and cash still in hand, and intercepting predatory earned-wage advances with plain fee math and softer alternatives. Fully offline Next.js demo with a block-bootstrap solvency simulator, 220 synthetic worker histories, light/dark themes, and a plain-language in-app guide.

---

## Longer description (if the form allows more space)

**Personal pain point.** If you get paid by the shift, you often hit this trap: the work is done, the money isn’t in your account yet, a bill is due now, and an app offers “take $150 now” against your next deposit. The fee looks small until you measure it in hours of work. Panic makes the advance feel inevitable.

**What Runway does.**  
1. **Today** — worst-case and likely funded-until dates, daily wage, earned vs in-hand, log a shift and watch the date move.  
2. **Decide** — intercept a $150 advance: true shortfall, when pay lands, fee in dollars / annualized / hours of work, plus defer-a-bill and partial-advance alternatives. Never blocks, never scolds.  
3. **Proof** — backtest on 220 synthetic histories: fees paid vs fees that looked avoidable, and whether the worst-case date is roughly trustworthy (~1 in 10 should run out by then).  
4. **Guide** — plain-language manual for non-technical users.

**Technical ambition.** Build-time ETL + seeded block-bootstrap simulations (not day-iid), wage hysteresis, walk-forward advance replay, unit-tested solvency core, static JSON so the browser stays fast and offline.

---

## Public GitHub repo URL

```
https://github.com/Dharmik2510/runway
```

## Hosted URL

```
https://dharmik-cursor-hackathon.vercel.app
```
---

## Screenshots to upload (exactly 5)

Use files in `/screenshots` (generated at 390×844 mobile viewport):

| # | File | Why judges see it |
|---|------|-------------------|
| 1 | `01-today-funded-until.png` | Hero product moment — worst-case date |
| 2 | `02-today-log-shift.png` | Interaction — logging earnings |
| 3 | `03-decide-intercept.png` | Innovation — advance intercept + fee clarity |
| 4 | `04-proof-results.png` | Completeness — backtest / proof |
| 5 | `05-guide-dark.png` | UX — guide + dark mode |

---

## How this maps to scoring

| Criterion | Weight | Where it’s evidenced |
|-----------|--------|----------------------|
| Innovation | 25% | Earned vs in-hand gap; worst-case-first date; fee-as-hours; block bootstrap; non-judgmental intercept |
| Technical execution | 25% | `src/lib/solvency.ts` + tests; `scripts/build-data.ts`; seeded sims; clean Next.js structure |
| Functional completeness | 20% | Today / Decide / Proof / Guide; theme; worker switcher; offline demo |
| Problem–solution fit | 20% | Personal payday-lag + advance trap; README + Guide + Decide copy |
| UX | 5% | Light/dark tokens; typography; plain language; mobile-first |
| Ambition | 5% | 220-worker backtest; 120-day horizon sims; honest synthetic labeling |

---

## Pre-submit checklist

- [ ] `npm test` passes  
- [ ] `npm run precompute && npm run dev` works from a clean clone  
- [ ] Repo is **public** on GitHub  
- [ ] Hosted URL loads (optional but recommended)  
- [ ] 5 screenshots uploaded  
- [ ] Description pasted from this file  
