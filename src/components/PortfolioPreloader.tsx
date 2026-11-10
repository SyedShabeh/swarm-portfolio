"use client";

import { useEffect } from "react";

export function PortfolioPreloader({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const completionTimer = window.setTimeout(onComplete, 3000);
    return () => {
      window.clearTimeout(completionTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  return <div className="portfolio-preloader" role="status" aria-live="polite" aria-label="Loading portfolio">
    <div className="preloader-center">
      <p>LOADING PORTFOLIO</p>
    </div>
  </div>;
}
