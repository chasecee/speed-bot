import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";
import { PageSpeedResult } from "@/types";

// Helper function for timeout
const timeoutPromise = (ms: number) =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );

// For testing, process domains in batches
export async function GET() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const testDomains = domains; // No slice, use all domains
    const results = [];

    console.log(`🧪 Testing with domains: ${testDomains.join(", ")}`);

    // Process domains in batches of 3
    const batchSize = 3;
    for (let i = 0; i < testDomains.length; i += batchSize) {
      const batch = testDomains.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}: ${batch.join(", ")}`);

      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (domain) => {
          try {
            // Set a timeout of 30 seconds per domain test
            const result = (await Promise.race([
              Promise.all([
                runPageSpeedTest(domain, "mobile"),
                runPageSpeedTest(domain, "desktop"),
              ]),
              timeoutPromise(30000), // 30 second timeout per domain
            ])) as [PageSpeedResult, PageSpeedResult];

            const [mobileResults, desktopResults] = result;

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

      results.push(...batchResults);
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
