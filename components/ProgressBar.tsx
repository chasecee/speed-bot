"use client";

import { PageSpeedStatus } from "@/types";

interface ProgressBarProps {
  status: PageSpeedStatus;
  loading: boolean;
  stage: "idle" | "reading-sheet" | "running-tests";
  domains: string[];
}

export default function ProgressBar({
  status,
  loading,
  stage,
  domains,
}: ProgressBarProps) {
  const hasResults = status.results.length > 0;

  return (
    <div className="bg-gray-100/10 p-4 rounded">
      <h2 className="font-semibold">Progress</h2>
      <div className="mt-2">
        <p className="text-sm text-gray-600 flex items-center gap-2">
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          )}
          {stage === "reading-sheet"
            ? "Reading Google Sheet..."
            : stage === "running-tests"
            ? `Running PageSpeed tests (${status.results.length}/${domains.length})`
            : hasResults
            ? `Completed ${status.results.length} domains`
            : "Ready to run tests"}
        </p>
        {domains.length > 0 && stage === "running-tests" && (
          <ul className="mt-1 text-sm text-gray-500 font-mono">
            {domains.map((domain) => {
              const result = status.results.find((r) => r.domain === domain);
              return (
                <li key={domain} className="flex items-center gap-2">
                  <span>•</span>
                  {domain}
                  {result && (
                    <span
                      className={
                        result.status === "success"
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {result.status === "success" ? "✓" : "✗"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {status.duration && (
          <p className="mt-2 text-sm text-gray-600">
            Duration: {status.duration}
          </p>
        )}
      </div>
    </div>
  );
}
