"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One IntersectionObserver for every .reveal / .mask / .draw element, re-scanned on navigation and DOM changes. */
export function RevealRoot() {
  const path = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.in), .mask:not(.in), .draw:not(.in)").forEach((el) => io.observe(el));
    // Show whatever is already on screen before enabling the hidden state, so there is no flash.
    document.querySelectorAll(".reveal, .mask, .draw").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
    });
    document.documentElement.classList.add("reveal-ready");
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);
  return null;
}
