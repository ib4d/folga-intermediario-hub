"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function MarketingScrollTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 420);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="ori-scroll-top"
      aria-label={label}
      title={label}
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
      }}
    >
      <ArrowUp size={19} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
