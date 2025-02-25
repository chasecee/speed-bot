import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

interface MetricResult {
  mobile: {
    performance: number;
    firstContentfulPaint: number;
    speedIndex: number;
  };
  desktop: {
    performance: number;
    firstContentfulPaint: number;
    speedIndex: number;
  };
}

const thresholds = {
  performance: {
    good: 90,
    medium: 50,
  },
  firstContentfulPaint: {
    good: 1.8,
    medium: 3.0,
  },
  speedIndex: {
    good: 3.4,
    medium: 5.8,
  },
};

// Define colors
const colors = {
  good: { red: 0.8, green: 0.9, blue: 0.8 },
  medium: { red: 0.9, green: 0.9, blue: 0.8 },
  poor: { red: 0.9, green: 0.8, blue: 0.8 },
};

function getColorForMetric(
  value: number,
  metricType: "performance" | "firstContentfulPaint" | "speedIndex"
): { red: number; green: number; blue: number } {
  const threshold = thresholds[metricType];

  if (metricType === "performance") {
    if (value >= threshold.good) return colors.good;
    if (value >= threshold.medium) return colors.medium;
    return colors.poor;
  } else {
    // For timing metrics, lower is better
    if (value <= threshold.good) return colors.good;
    if (value <= threshold.medium) return colors.medium;
    return colors.poor;
  }
}

export class GoogleSheetsHelper {
  private doc: GoogleSpreadsheet;
  private jwt: JWT;

  constructor() {
    this.jwt = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEETS_SHEET_ID as string,
      this.jwt
    );
  }

  async getDomains(): Promise<string[]> {
    try {
      await this.doc.loadInfo();
      return this.doc.sheetsByIndex.map((sheet) => sheet.title);
    } catch (error) {
      console.error("Error getting domains:", error);
      throw error;
    }
  }

  async writeResults(domain: string, results: MetricResult, date: string) {
    try {
      await this.doc.loadInfo();
      const sheet = this.doc.sheetsByTitle[domain];

      await sheet.loadHeaderRow();
      const headers = sheet.headerValues;
      const columnTitle = `${date} Results`;

      if (!headers.includes(columnTitle)) {
        await sheet.setHeaderRow([...headers, columnTitle]);
        await sheet.loadHeaderRow();
      }

      const dateColumnIndex = headers.findIndex(
        (header) => header === columnTitle
      );

      const values = [
        { value: results.mobile.performance, type: "performance" },
        {
          value: results.mobile.firstContentfulPaint,
          type: "firstContentfulPaint",
        },
        { value: results.mobile.speedIndex, type: "speedIndex" },
        { value: results.desktop.performance, type: "performance" },
        {
          value: results.desktop.firstContentfulPaint,
          type: "firstContentfulPaint",
        },
        { value: results.desktop.speedIndex, type: "speedIndex" },
      ];

      await sheet.loadCells();

      const rows = await sheet.getRows();
      for (let i = 0; i < values.length; i++) {
        const row = rows[i];
        const { value, type } = values[i];

        // Set the value
        row.set(columnTitle, value);
        await row.save();

        // Apply color formatting - add 1 to skip header row
        const cell = sheet.getCell(i + 1, dateColumnIndex);
        cell.backgroundColor = getColorForMetric(
          value,
          type as "performance" | "firstContentfulPaint" | "speedIndex"
        );
      }

      await sheet.saveUpdatedCells();
    } catch (error) {
      console.error(`Error writing results for ${domain}:`, error);
      throw error;
    }
  }
}
