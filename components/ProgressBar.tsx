"use client";

interface ProgressBarProps {
  status: {
    domainsProcessed?: number;
    duration?: string;
    results: Array<{
      domain: string;
      status: string;
    }>;
  };
  loading: boolean;
  stage: "idle" | "reading-sheet" | "running-tests";
}

export default function ProgressBar({
  status,
  loading,
  stage,
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
            ? "Running PageSpeed tests..."
            : hasResults
            ? `Loaded ${status.results.length} domains`
            : "Ready to run tests"}
        </p>
        {hasResults && (
          <ul className="mt-1 text-sm text-gray-500 font-mono">
            {status.results.map((result) => (
              <li key={result.domain}>• {result.domain}</li>
            ))}
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
