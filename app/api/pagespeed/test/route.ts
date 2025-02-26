import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

// For testing, process just 1-2 domains
export async function GET() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const testDomains = domains; // No slice, use all domains

    console.log(`🧪 Testing with domains: ${testDomains.join(", ")}`);

    // Process all domains in parallel
    const results = await Promise.all(
      testDomains.map(async (domain) => {
        try {
          const [mobileResults, desktopResults] = await Promise.all([
            runPageSpeedTest(domain, "mobile"),
            runPageSpeedTest(domain, "desktop"),
          ]);

          // Write results to sheet
          await sheets.writeResults(
            domain,
            {
              mobile: mobileResults,
              desktop: desktopResults,
            },
            new Date().toISOString().split("T")[0]
          );

          return {
            domain,
            status: "success",
            mobile: mobileResults,
            desktop: desktopResults,
          };
        } catch (error) {
          console.error(`Error processing ${domain}:`, error);
          return {
            domain,
            status: "error",
            error: String(error),
          };
        }
      })
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Test completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      domainsProcessed: testDomains.length,
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Test failed after ${duration}s:`, error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
