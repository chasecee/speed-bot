"use client";

interface ProgressBarProps {
  status: {
    percentComplete?: number;
    progress?: string;
    duration?: string;
  };
}

export default function ProgressBar({ status }: ProgressBarProps) {
  const isIdle = !status.progress || status.progress === "0/0";

  return (
    <div className="bg-gray-100/10 p-4 rounded">
      <h2 className="font-semibold">Progress</h2>
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              isIdle ? "w-0" : "bg-blue-600"
            }`}
            style={{ width: `${status.percentComplete || 0}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {isIdle
            ? "Ready to run tests"
            : `${status.progress} domains processed`}
        </p>
        {!isIdle && (
          <p className="text-sm text-gray-600">
            Duration: {status.duration || "0s"}
          </p>
        )}
      </div>
    </div>
  );
}
