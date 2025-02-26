"use client";
import { useState } from "react";

interface PageSpeedResult {
  performance: number;
  firstContentfulPaint: number;
  speedIndex: number;
}

interface PageSpeedStatus {
  success: boolean;
  domainsProcessed?: number;
  duration?: string;
  results: Array<{
    domain: string;
    status: string;
    mobile?: PageSpeedResult;
    desktop?: PageSpeedResult;
    error?: string;
  }>;
}

export const usePageSpeedTests = () => {
  const [status, setStatus] = useState<PageSpeedStatus>({
    success: false,
    results: [],
  });
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<
    "idle" | "reading-sheet" | "running-tests"
  >("idle");
  const [domains, setDomains] = useState<string[]>([]);

  const runTests = async () => {
    try {
      setLoading(true);
      setStage("reading-sheet");
      setStatus({ success: false, results: [] });
      setDomains([]);

      const eventSource = new EventSource("/api/pagespeed/stream");

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "domains":
            setDomains(data.domains);
            setStage("running-tests");
            break;

          case "result":
            setStatus((prev) => ({
              ...prev,
              success: true,
              duration: data.duration,
              results: [...prev.results, data.result],
            }));
            break;

          case "complete":
            eventSource.close();
            setLoading(false);
            setStage("idle");
            setStatus((prev) => ({
              ...prev,
              success: true,
              duration: data.duration,
              domainsProcessed: data.domainsProcessed,
            }));
            break;

          case "error":
            console.error("Error:", data.error);
            setStatus((prev) => ({
              ...prev,
              success: false,
              duration: data.duration,
            }));
            eventSource.close();
            setLoading(false);
            setStage("idle");
            break;
        }
      };

      eventSource.onerror = () => {
        console.error("SSE error");
        eventSource.close();
        setLoading(false);
        setStage("idle");
      };
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
      setStage("idle");
    }
  };

  return { status, loading, stage, domains, runTests };
};
