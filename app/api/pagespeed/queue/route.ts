import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

export const runtime = "nodejs";
export const maxDuration = 10; // Hobby plan limit

export const jobStatus: Record<
  string,
  {
    startTime: number;
    completed: number;
    total: number;
    results: Array<{
      domain: string;
      status: string;
      error?: string;
      mobile?: {
        performance: number;
        firstContentfulPaint: number;
        speedIndex: number;
      };
      desktop?: {
        performance: number;
        firstContentfulPaint: number;
        speedIndex: number;
      };
    }>;
  }
> = {};

export async function GET() {
  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const jobId = Date.now().toString();

    jobStatus[jobId] = {
      startTime: Date.now(),
      completed: 0,
      total: domains.length,
      results: [],
    };

    // Start processing in background
    (async () => {
      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        try {
          console.log(`[${i + 1}/${domains.length}] Testing ${domain}...`);
          const [mobileResults, desktopResults] = await Promise.all([
            runPageSpeedTest(domain, "mobile"),
            runPageSpeedTest(domain, "desktop"),
          ]);

          jobStatus[jobId].results.push({
            domain,
            status: "success",
            mobile: mobileResults,
            desktop: desktopResults,
          });
        } catch (error) {
          console.error(`Error processing ${domain}:`, error);
          jobStatus[jobId].results.push({
            domain,
            status: "error",
            error: String(error),
          });
        }
        jobStatus[jobId].completed++;
      }
    })();

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      progress: "0/" + domains.length,
      percentComplete: 0,
      duration: "0s",
      results: [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
