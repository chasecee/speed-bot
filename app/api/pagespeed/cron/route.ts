import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";
import { PageSpeedResult } from "@/types";

// Helper function for timeout
const timeoutPromise = (ms: number) =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );

// Maximum duration for Hobby tier is 60 seconds
export const maxDuration = 60;

export async function GET() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const batchDomains =
      process.env.NODE_ENV === "development" ? domains : domains.slice(0, 10);
    const results = [];

    console.log(`📊 Processing ${batchDomains.length} domains...`);

    // Process domains in batches of 3
    const batchSize = 3;
    for (let i = 0; i < batchDomains.length; i += batchSize) {
      const batch = batchDomains.slice(i, i + batchSize);
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
    console.log(`✅ Completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      domainsProcessed: batchDomains.length,
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
