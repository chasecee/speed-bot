import * as chromeLauncher from "chrome-launcher";
import { writeFileSync } from "fs";
import { GoogleSheetsHelper } from "../lib/google-sheets";

// Remove the lighthouse import and add it dynamically
const lighthouse = (await import("lighthouse")).default;

interface LighthouseResult {
  performance: number;
  firstContentfulPaint: number;
  speedIndex: number;
}

async function runLighthouseTest(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<LighthouseResult> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });

  const options = {
    logLevel: "info" as "info" | "silent" | "error" | "warn" | "verbose",
    output: "json" as const,
    port: chrome.port,
    formFactor: strategy,
    screenEmulation:
      strategy === "mobile"
        ? { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 }
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
  };

  try {
    const runnerResult = await lighthouse(`https://${url}`, options);
    if (!runnerResult) throw new Error("Lighthouse audit failed");
    const lhr = runnerResult.lhr;

    // Save the report
    const reportPath = `lighthouse-results/${url}-${strategy}.json`;
    writeFileSync(reportPath, JSON.stringify(lhr, null, 2));

    return {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      firstContentfulPaint:
        Math.round(
          lhr.audits["first-contentful-paint"]?.numericValue ?? 0 / 10
        ) / 100,
      speedIndex:
        Math.round((lhr.audits["speed-index"]?.numericValue ?? 0) / 10) / 100,
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const results = [];

    console.log(`📊 Processing ${domains.length} domains...`);

    // Process domains in batches of 3
    const batchSize = 3;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1}: ${batch.join(", ")}`);

      // Process this batch sequentially to avoid memory issues
      for (const domain of batch) {
        try {
          const [mobileResults, desktopResults] = await Promise.all([
            runLighthouseTest(domain, "mobile"),
            runLighthouseTest(domain, "desktop"),
          ]);

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
