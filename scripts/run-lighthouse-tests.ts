import * as chromeLauncher from "chrome-launcher";
import { writeFileSync } from "fs";
import fsPromises from "fs/promises";
import { GoogleSheetsHelper } from "../lib/google-sheets.js";

// Wrap in async IIFE
(async () => {
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
    // Maximum number of retries
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let chrome = null;

      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${url} (${strategy})...`);
          // Add a small delay between retries
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        chrome = await chromeLauncher.launch({
          chromeFlags: [
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-component-extensions-with-background-pages",
            "--disable-features=TranslateUI,BlinkGenPropertyTrees",
            "--disable-ipc-flooding-protection",
            "--disable-renderer-backgrounding",
            "--mute-audio",
          ],
          chromePath: process.env.CHROME_PATH,
        });

        const options = {
          logLevel: "error" as "info" | "silent" | "error" | "warn" | "verbose",
          output: "json" as const,
          onlyCategories: ["performance"],
          port: chrome.port,
          formFactor: strategy,
          screenEmulation:
            strategy === "mobile"
              ? {
                  mobile: true,
                  width: 375,
                  height: 667,
                  deviceScaleFactor: 2,
                  disabled: false,
                }
              : {
                  mobile: false,
                  width: 1350,
                  height: 940,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
          // Use Lighthouse's built-in timeouts instead of Promise.race
          maxWaitForFcp: 30000,
          maxWaitForLoad: 45000,
          throttlingMethod: "simulate" as "simulate" | "devtools" | "provided",
        };

        const runnerResult = await lighthouse(`https://${url}`, options);
        if (!runnerResult) throw new Error("Lighthouse audit failed");
        const lhr = runnerResult.lhr;

        // Create directory if it doesn't exist
        await fsPromises.mkdir("lighthouse-results", { recursive: true });

        // Save the report
        const reportPath = `lighthouse-results/${url}-${strategy}.json`;
        writeFileSync(reportPath, JSON.stringify(lhr, null, 2));

        console.log(`\n📊 Results for ${url} (${strategy}):`);
        console.log(
          `Performance: ${Math.round(
            (lhr.categories.performance?.score ?? 0) * 100
          )}%`
        );
        console.log(
          `First Contentful Paint: ${
            Math.round(
              lhr.audits["first-contentful-paint"]?.numericValue ?? 0
            ) / 1000
          }s`
        );
        console.log(
          `Speed Index: ${
            Math.round(lhr.audits["speed-index"]?.numericValue ?? 0) / 1000
          }s\n`
        );

        return {
          performance: Math.round(
            (lhr.categories.performance?.score ?? 0) * 100
          ),
          firstContentfulPaint:
            Math.round(
              lhr.audits["first-contentful-paint"]?.numericValue ?? 0
            ) / 1000,
          speedIndex:
            Math.round(lhr.audits["speed-index"]?.numericValue ?? 0) / 1000,
        };
      } catch (error) {
        console.error(`Failed to test ${url} (${strategy}):`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this was our last retry, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
      } finally {
        if (chrome) {
          try {
            await chrome.kill();
          } catch (err) {
            console.error("Error killing Chrome:", err);
          }
        }
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw lastError || new Error(`Unknown error testing ${url}`);
  }

  async function main() {
    const startTime = Date.now();

    try {
      const sheets = new GoogleSheetsHelper();
      const domains = await sheets.getDomains();
      const results = [];

      console.log(`📊 Processing ${domains.length} domains...`);

      // Process domains in batches of 2 instead of 3 to reduce resource contention
      const batchSize = 2;
      for (let i = 0; i < domains.length; i += batchSize) {
        const batch = domains.slice(i, i + batchSize);
        console.log(
          `Processing batch ${i / batchSize + 1}: ${batch.join(", ")}`
        );

        // Process this batch sequentially to avoid memory issues
        for (const domain of batch) {
          try {
            // Run tests sequentially instead of in parallel
            console.log(`Running mobile test for ${domain}...`);
            const mobileResults = await runLighthouseTest(domain, "mobile");

            // Add a delay between tests
            await new Promise((resolve) => setTimeout(resolve, 5000));

            console.log(`Running desktop test for ${domain}...`);
            const desktopResults = await runLighthouseTest(domain, "desktop");

            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];

            await sheets.writeResults(
              domain,
              {
                mobile: mobileResults,
                desktop: desktopResults,
              },
              dateStr
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

          // Add a delay between domains
          await new Promise((resolve) => setTimeout(resolve, 5000));
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

  await main();
})();
