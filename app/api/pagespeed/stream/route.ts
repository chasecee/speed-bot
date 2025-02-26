import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

// Maximum duration for Hobby tier is 60 seconds
export const maxDuration = 60;

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
      const testDomains = domains.slice(0, 2);

      await write({ type: "domains", domains: testDomains });

      const promises = testDomains.map(async (domain) => {
        try {
          const [mobileResults, desktopResults] = await Promise.all([
            runPageSpeedTest(domain, "mobile"),
            runPageSpeedTest(domain, "desktop"),
          ]);

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
          const errorResult = {
            domain,
            status: "error",
            error: String(error),
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
        success: true,
        domainsProcessed: testDomains.length,
      });

      await writer.close();
    } catch (error) {
      await write({
        type: "error",
        error: String(error),
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
      await writer.close();
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
