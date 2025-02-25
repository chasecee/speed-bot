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

  const runTests = async () => {
    try {
      setLoading(true);
      // Use test endpoint in development
      const endpoint =
        process.env.NODE_ENV === "development"
          ? "/api/pagespeed/test"
          : "/api/pagespeed/cron";

      const response = await fetch(endpoint);
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  return { status, loading, runTests };
};
