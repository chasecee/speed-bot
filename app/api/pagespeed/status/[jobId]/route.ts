import { NextResponse } from "next/server";
import { jobStatus } from "../../queue/route"; // Updated import path

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // Await the params
    const { jobId } = await Promise.resolve(params);
    const status = jobStatus[jobId];

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    const duration = ((Date.now() - status.startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      progress: `${status.completed}/${status.total}`,
      percentComplete: Math.round((status.completed / status.total) * 100),
      duration: `${duration}s`,
      results: status.results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
