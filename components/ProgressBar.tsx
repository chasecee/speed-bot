"use client";

interface ProgressBarProps {
  status: {
    domainsProcessed?: number;
    duration?: string;
  };
}

export default function ProgressBar({ status }: ProgressBarProps) {
  return (
    <div className="bg-gray-100/10 p-4 rounded">
      <h2 className="font-semibold">Progress</h2>
      <div className="mt-2">
        <p className="text-sm text-gray-600">
          {status.domainsProcessed
            ? `${status.domainsProcessed} domains processed`
            : "Ready to run tests"}
        </p>
        {status.duration && (
          <p className="text-sm text-gray-600">Duration: {status.duration}</p>
        )}
      </div>
    </div>
  );
}
