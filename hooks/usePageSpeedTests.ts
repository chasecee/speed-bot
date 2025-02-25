"use client";
import { useState } from "react";

interface PageSpeedStatus {
  success: boolean;
  domainsProcessed?: number;
  duration?: string;
  results: Array<{
    domain: string;
    status: string;
    error?: string;
    mobile?: {
      performance: number;
      firstContentfulPaint: number;
      speedIndex: number;
    };
    desktop?: {
      performance: number;
      firstContentfulPaint: number;
      speedIndex: number;
    };
  }>;
}

// Make sure to export as a named export
export const usePageSpeedTests = () => {
  const [status, setStatus] = useState<PageSpeedStatus>({
    success: false,
    results: [],
  });
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<
    "idle" | "reading-sheet" | "running-tests"
  >("idle");

  const runTests = async () => {
    try {
      setLoading(true);
      setStage("reading-sheet");

      // Use test endpoint in development
      const endpoint =
        process.env.NODE_ENV === "development"
          ? "/api/pagespeed/test"
          : "/api/pagespeed/cron";

      const response = await fetch(endpoint);

      if (response.ok) {
        setStage("running-tests");
      }

      const data = await response.json();
      setStatus(data);
      setStage("idle");
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setStage("idle");
      setLoading(false);
    }
  };

  return { status, loading, stage, runTests };
};
