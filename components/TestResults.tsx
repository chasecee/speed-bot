"use client";

import { PageSpeedResult } from "@/types";
import Image from "next/image";
import { useState } from "react";

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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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
            <h3 className="font-medium flex items-center gap-2">
              <div className="w-4 h-4 flex-shrink-0">
                {!imgErrors[result.domain] ? (
                  <Image
                    src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=32`}
                    alt=""
                    width={16}
                    height={16}
                    className="w-4 h-4"
                    unoptimized
                    onError={() =>
                      setImgErrors((prev) => ({
                        ...prev,
                        [result.domain]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                    {result.domain.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {result.domain}
            </h3>
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
