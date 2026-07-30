/**
 * Capture 5 mobile screenshots for hackathon AI visual review.
 * Usage: npm run dev (separate terminal) → npm run screenshots
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function waitForReady(page: import("playwright").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Ensure light theme for first shots
  await page.addInitScript(() => {
    localStorage.setItem("runway-theme", "light");
    localStorage.setItem("runway-worker-id", "W-0080");
  });

  // 1 — Today hero
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await waitForReady(page);
  await page.screenshot({
    path: path.join(OUT, "01-today-funded-until.png"),
    fullPage: false,
  });

  // 2 — Log shift interaction filled + submitted (date move story)
  await page.fill("#log-earn", "95");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, "02-today-log-shift.png"),
    fullPage: false,
  });

  // 3 — Decide
  await page.goto(BASE + "/decide", { waitUntil: "networkidle" });
  await waitForReady(page);
  await page.screenshot({
    path: path.join(OUT, "03-decide-intercept.png"),
    fullPage: true,
  });

  // 4 — Proof
  await page.goto(BASE + "/proof", { waitUntil: "networkidle" });
  await waitForReady(page);
  await page.screenshot({
    path: path.join(OUT, "04-proof-results.png"),
    fullPage: true,
  });

  // 5 — Guide in dark mode
  await page.evaluate(() => {
    localStorage.setItem("runway-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.goto(BASE + "/guide", { waitUntil: "networkidle" });
  await waitForReady(page);
  await page.screenshot({
    path: path.join(OUT, "05-guide-dark.png"),
    fullPage: true,
  });

  await browser.close();
  console.log(`Wrote 5 screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
