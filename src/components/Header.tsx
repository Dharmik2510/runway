"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWorker } from "@/lib/worker-context";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/decide", label: "Decide" },
  { href: "/proof", label: "Proof" },
];

export function Header() {
  const pathname = usePathname();
  const { index, workerId, setWorkerId, payload } = useWorker();
  const guideActive = pathname === "/guide";

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "var(--header-bg)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-[15px] font-medium tracking-tight text-[var(--text)]"
          >
            Runway
          </Link>
          {payload && (
            <p className="truncate text-[13px] text-[var(--muted)]">
              {payload.occupation} · {payload.city}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/guide"
            className={`rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              guideActive
                ? "bg-[var(--nav-active)] text-[var(--text)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Guide
          </Link>
          <ThemeToggle />
          <label className="sr-only" htmlFor="worker-switcher">
            Worker
          </label>
          <select
            id="worker-switcher"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="max-w-[8.5rem] cursor-pointer truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {index.length === 0 ? (
              <option value={workerId}>{workerId}</option>
            ) : (
              index.map((w) => (
                <option key={w.workerId} value={w.workerId}>
                  {w.workerId}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      <nav className="mx-auto flex max-w-lg gap-1 px-4 pb-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                active
                  ? "bg-[var(--nav-active)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
