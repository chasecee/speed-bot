"use client";

interface RunTestButtonProps {
  loading: boolean;
  onRun: () => void;
}

export default function RunTestButton({ loading, onRun }: RunTestButtonProps) {
  return (
    <button
      onClick={onRun}
      disabled={loading}
      className={`px-4 py-2 rounded ${
        loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
      } text-white mb-8`}
    >
      {loading ? "Processing..." : "Run PageSpeed Tests"}
    </button>
  );
}
