"use client";

import { useCallback, useState } from "react";
import { ArrowRevealOverlay } from "./effects/ScrollArrowFrame";
import { PortfolioPreloader } from "./PortfolioPreloader";

export function PortfolioRuntime() {
  const [isPreloaderComplete, setPreloaderComplete] = useState(false);
  const completePreloader = useCallback(() => setPreloaderComplete(true), []);

  return <>
    {!isPreloaderComplete && <PortfolioPreloader onComplete={completePreloader} />}
    <ArrowRevealOverlay />
  </>;
}
