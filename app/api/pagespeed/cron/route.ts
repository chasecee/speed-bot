import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

// Set longer timeout for cron job
export const maxDuration = 300; // 5 minutes, max allowed on hobby tier

export async function GET() {
  const startTime = Date.now();
  const results = [];

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    console.log(`📊 Processing ${domains.length} domains...`);

    // Process domains sequentially to avoid rate limits
    for (const domain of domains) {
      try {
        console.log(`Testing ${domain}...`);
        const [mobileResults, desktopResults] = await Promise.all([
          runPageSpeedTest(domain, "mobile"),
          runPageSpeedTest(domain, "desktop"),
        ]);

        // Write results immediately after each test
        await sheets.writeResults(
          domain,
          {
            mobile: mobileResults,
            desktop: desktopResults,
          },
          new Date().toISOString().split("T")[0]
        );

        results.push({
          domain,
          status: "success",
          mobile: mobileResults,
          desktop: desktopResults,
        });
      } catch (error) {
        console.error(`Error processing ${domain}:`, error);
        results.push({
          domain,
          status: "error",
          error: String(error),
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      domainsProcessed: domains.length,
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Failed after ${duration}s:`, error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
