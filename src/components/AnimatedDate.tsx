"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Animate funded-until date text with a 300ms crossfade when it changes. */
export function AnimatedDate({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    setPhase("out");
    const t = window.setTimeout(() => {
      setDisplay(value);
      prev.current = value;
      setPhase("in");
    }, 150);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        transition: "opacity 150ms ease, transform 150ms ease",
        opacity: phase === "out" ? 0 : 1,
        transform: phase === "out" ? "translateY(4px)" : "translateY(0)",
        ...style,
      }}
    >
      {display}
    </span>
  );
}
