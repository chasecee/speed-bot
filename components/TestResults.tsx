"use client";

import { PageSpeedResult } from "@/types";

interface TestResult {
  domain: string;
  status: string;
  error?: string;
  mobile?: PageSpeedResult;
  desktop?: PageSpeedResult;
}

interface TestResultsProps {
  results?: TestResult[];
}

export default function TestResults({ results = [] }: TestResultsProps) {
  return (
    <div className="bg-gray-100/10 p-4 rounded">
      <h2 className="font-semibold mb-4">Results</h2>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded ${
              result.status === "success" ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            <h3 className="font-medium">{result.domain}</h3>
            {result.status === "success" ? (
              <div className="mt-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Mobile</h4>
                    <p>Performance: {result.mobile?.performance}%</p>
                    <p>First Paint: {result.mobile?.firstContentfulPaint}s</p>
                    <p>Speed Index: {result.mobile?.speedIndex}s</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Desktop</h4>
                    <p>Performance: {result.desktop?.performance}%</p>
                    <p>First Paint: {result.desktop?.firstContentfulPaint}s</p>
                    <p>Speed Index: {result.desktop?.speedIndex}s</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-red-600 mt-2">{result.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
