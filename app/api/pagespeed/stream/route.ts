import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";
import { PageSpeedResult } from "@/types";

// Maximum duration for Hobby tier is 60 seconds
export const maxDuration = 60;

// Add this helper function at the top level
const timeoutPromise = (ms: number) =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), ms)
  );

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const startTime = Date.now();

  const write = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const processTests = async () => {
    try {
      const sheets = new GoogleSheetsHelper();
      const domains = await sheets.getDomains();
      const testDomains = domains;

      await write({ type: "domains", domains: testDomains });

      // Process domains sequentially instead of all at once
      for (const domain of testDomains) {
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

          // Write results to sheet if needed
          await sheets.writeResults(
            domain,
            { mobile: mobileResults, desktop: desktopResults },
            new Date().toISOString().split("T")[0]
          );

          const resultObj = {
            domain,
            status: "success",
            mobile: mobileResults,
            desktop: desktopResults,
          };

          await write({
            type: "result",
            result: resultObj,
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          });
        } catch (error) {
          console.error(`Error processing ${domain}:`, error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          const errorResult = {
            domain,
            status: "error",
            error: errorMessage,
          };

          await write({
            type: "result",
            result: errorResult,
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          });
        }
      }

      // Complete the stream
      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      await write({
        type: "complete",
        duration,
        domainsProcessed: testDomains.length,
      });
    } catch (error) {
      console.error("Error processing tests:", error);
      await write({
        type: "error",
        error: String(error),
      });
    } finally {
      writer.close();
    }
  };

  processTests();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
