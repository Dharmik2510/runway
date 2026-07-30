import Link from "next/link";

const SECTIONS = [
  {
    title: "What Runway is",
    body: "Runway answers one question: how long until your money runs out? It shows a funded-until date — like a runway for a plane — with the worst case first so the risky date is never hidden behind a rosy average.",
  },
  {
    title: "Who it’s for",
    body: "People paid by the day or by the shift: gig drivers, tipped workers, day labor. Income jumps around, and pay often lands days after the work was done.",
  },
  {
    title: "What an advance is",
    body: "An earned-wage advance is early access to money you’ve already worked for but haven’t been paid yet. A company fronts you cash (often $50–$150), then takes it back from your next deposit — usually plus a fee. It’s closer to a tiny payday loan against your wages than a credit card.",
  },
  {
    title: "How to use Today",
    body: "Read the worst-case funded-until date first, then the likely case. Check daily wage and the earned vs in-hand line — that gap is money you’ve earned that hasn’t arrived yet. Log today’s earnings to see the date move, with one plain sentence explaining why.",
  },
  {
    title: "How Decide works",
    body: "When you’re about to take a $150 advance, Decide shows the real shortfall, when pending pay lands, the fee in dollars and as hours of work, plus two softer options (defer a small bill, or borrow only what you need). You can still take the advance. Runway never blocks you and never scolds.",
  },
  {
    title: "What Proof shows",
    body: "Proof shows, on fake worker histories, how much was paid in advance fees, how much might have been skipped by waiting a few days, and whether the worst-case funded-until date is roughly trustworthy (only about 1 in 10 should run out by that day). It is labeled as synthetic — not real-world proof.",
  },
  {
    title: "About this demo",
    body: "Everything runs offline from precomputed JSON. No bank login, no API calls, no database. Switch workers in the header to explore different cash stories. Use the sun/moon control to switch light and dark mode.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p
          className="text-[13px] uppercase tracking-[0.08em]"
          style={{ color: "var(--muted)" }}
        >
          Manual
        </p>
        <h1 className="text-[28px] font-medium tracking-tight">How Runway works</h1>
        <p style={{ color: "var(--muted)" }}>
          A short guide to the funded-until date, advances, and the three main
          screens.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section key={section.title} className="card space-y-2 px-4 py-4">
            <h2 className="text-[16px] font-medium">{section.title}</h2>
            <p style={{ color: "var(--muted)" }}>{section.body}</p>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary inline-flex justify-center text-center">
          Back to today
        </Link>
        <Link href="/decide" className="btn-ghost sm:w-auto">
          See the intercept
        </Link>
      </div>
    </div>
  );
}
