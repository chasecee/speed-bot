import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

// Maximum duration for Hobby tier is 60 seconds
export const maxDuration = 60;

export async function GET() {
  const startTime = Date.now();

  try {
    const sheets = new GoogleSheetsHelper();
    const domains = await sheets.getDomains();
    const batchDomains =
      process.env.NODE_ENV === "development" ? domains : domains.slice(0, 10);

    console.log(`📊 Processing ${batchDomains.length} domains...`);

    const results = await Promise.all(
      batchDomains.map(async (domain) => {
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
