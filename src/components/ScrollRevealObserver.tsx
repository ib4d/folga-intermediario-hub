"use client";

import { useEffect } from "react";

export default function ScrollRevealObserver() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ori-landing");
    const revealItems = root?.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    if (!root || !revealItems?.length) return;

    root.classList.add("has-scroll-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      root.classList.remove("has-scroll-reveal");
    };
  }, []);

  return null;
}
