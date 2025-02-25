"use client";
import ProgressBar from "@/components/ProgressBar";
import TestResults from "@/components/TestResults";
import RunTestButton from "@/components/RunTestButton";
import { usePageSpeedTests } from "@/hooks/usePageSpeedTests";

export default function PageSpeedMonitor() {
  const { status, loading, runTests } = usePageSpeedTests();

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PageSpeed Monitor</h1>
      <RunTestButton loading={loading} onRun={runTests} />
      {status && (
        <div className="space-y-4">
          <ProgressBar status={status} />
          <TestResults results={status.results} />
        </div>
      )}
    </main>
  );
}
