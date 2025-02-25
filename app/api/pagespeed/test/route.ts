import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

// For testing, process just 1-2 domains
export async function GET() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    // Take first two domains for testing
    const testDomains = domains.slice(0, 2);

    console.log(`🧪 Testing with domains: ${testDomains.join(", ")}`);

    const results = [];
    for (const domain of testDomains) {
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
