import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

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

      const promises = testDomains.map(async (domain) => {
        try {
          // Set a timeout of 30 seconds per domain
          const results = await Promise.race([
            Promise.all([
              runPageSpeedTest(domain, "mobile"),
              runPageSpeedTest(domain, "desktop"),
            ]),
            timeoutPromise(30000), // 30 second timeout per domain
          ]);

          // Destructure the results array
          const [mobileResults, desktopResults] = results;

          await sheets.writeResults(
            domain,
            {
              mobile: mobileResults,
              desktop: desktopResults,
            },
            new Date().toISOString().split("T")[0]
          );

          const result = {
            domain,
            status: "success",
            mobile: mobileResults,
            desktop: desktopResults,
          };

          await write({
            type: "result",
            result,
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          });

          return result;
        } catch (error) {
          console.error(`Error processing ${domain}:`, error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          const errorResult = {
            domain,
            status: "error",
            error: errorMessage,
            errorDetails:
              error instanceof Error && error.stack
                ? error.stack.split("\n").slice(0, 3).join("\n")
                : undefined,
          };

          await write({
            type: "result",
            result: errorResult,
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          });

          return errorResult;
        }
      });

      const results = await Promise.all(promises);
      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

      await write({
        type: "complete",
        results,
        duration,
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
