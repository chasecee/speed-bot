import { PageSpeedResult } from "@/types";

export async function runPageSpeedTest(
  domain: string,
  strategy: "mobile" | "desktop"
): Promise<PageSpeedResult> {
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=${strategy}&key=${process.env.PAGESPEED_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  // Check if the response contains the expected data structure
  if (
    !data.lighthouseResult ||
    !data.lighthouseResult.categories ||
    !data.lighthouseResult.categories.performance
  ) {
    throw new Error(`PageSpeed API returned incomplete data for ${domain}`);
  }

  return {
    performance: Math.round(
      data.lighthouseResult.categories.performance.score * 100
    ),
    firstContentfulPaint:
      Math.round(
        data.lighthouseResult.audits["first-contentful-paint"].numericValue / 10
      ) / 100,
    speedIndex:
      Math.round(
        data.lighthouseResult.audits["speed-index"].numericValue / 10
      ) / 100,
  };
}
