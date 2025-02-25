import { NextResponse } from "next/server";
import { GoogleSheetsHelper } from "@/lib/google-sheets";
import { runPageSpeedTest } from "@/lib/pagespeed";

export const runtime = "nodejs";
export const maxDuration = 10;

async function processAllDomains(domains: string[]) {
  const sheets = new GoogleSheetsHelper();
  const today = new Date().toISOString().split("T")[0];

  console.log(`🚀 Processing ${domains.length} domains concurrently...`);

  // Process all domains concurrently
  const promises = domains.map(async (domain, index) => {
    const startTime = Date.now();
    try {
      console.log(`[${index + 1}/${domains.length}] Starting ${domain}...`);

      // Run both mobile and desktop tests concurrently
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
        today
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `✅ [${index + 1}/${
          domains.length
        }] Completed ${domain} in ${duration}s`
      );

      return {
        domain,
        status: "success",
        duration: `${duration}s`,
        mobile: mobileResults,
        desktop: desktopResults,
      };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(
        `❌ [${index + 1}/${
          domains.length
        }] Failed ${domain} after ${duration}s:`,
        error
      );
      return {
        domain,
        status: "error",
        duration: `${duration}s`,
        error: String(error),
      };
    }
  });

  return Promise.all(promises);
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log("📋 Initializing PageSpeed tests...");
    const sheets = new GoogleSheetsHelper();

    const domains = await sheets.getDomains();
    console.log(`📊 Found ${domains.length} domains`);

    const results = await processAllDomains(domains);

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n📈 Final Results:");
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⏱️ Total Duration: ${totalDuration}s`);

    return NextResponse.json({
      success: true,
      totalDomains: domains.length,
      successCount,
      errorCount,
      totalDuration: `${totalDuration}s`,
      results,
    });
  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(
      `❌ Error in PageSpeed API route after ${totalDuration}s:`,
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        duration: `${totalDuration}s`,
      },
      { status: 500 }
    );
  }
}
