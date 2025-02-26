import { PageSpeedResult } from "@/types";
import { GoogleSheetsHelper } from "../lib/google-sheets";
import { runPageSpeedTest } from "../lib/pagespeed";

// Helper function for timeout
const timeoutPromise = (ms: number) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );

async function main() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    // Process all domains, not just 10
    const results = [];

    console.log(`📊 Processing ${domains.length} domains...`);

    // Process domains in larger batches since we have more time
    const batchSize = 5; // Increased from 3
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}: ${batch.join(", ")}`);

      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (domain) => {
          try {
            // Increased timeout to 60 seconds per domain
            const result = (await Promise.race([
              Promise.all([
                runPageSpeedTest(domain, "mobile"),
                runPageSpeedTest(domain, "desktop"),
              ]),
              timeoutPromise(60000), // 60 second timeout per domain
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
    console.log(`Processed ${domains.length} domains`);

    // Log success and error counts
    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ Failed after ${duration}s:`, error);
    process.exit(1);
  }
}

main();
