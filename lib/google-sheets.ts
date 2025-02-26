import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { PageSpeedResult } from "@/types";

// interface MetricResult {
//   mobile: {
//     performance: number;
//     firstContentfulPaint: number;
//     speedIndex: number;
//   };
//   desktop: {
//     performance: number;
//     firstContentfulPaint: number;
//     speedIndex: number;
//   };
// }

// Define color thresholds for metrics
const thresholds = {
  performance: { good: 90, medium: 50 },
  firstContentfulPaint: { good: 1.8, medium: 3.0 }, // seconds
  speedIndex: { good: 3.4, medium: 5.8 }, // seconds
};

// Define colors for good, medium, poor
const colors = {
  good: { red: 0.7, green: 0.9, blue: 0.7 }, // Light green
  medium: { red: 1.0, green: 0.9, blue: 0.6 }, // Light yellow
  poor: { red: 1.0, green: 0.7, blue: 0.7 }, // Light red
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

interface SheetProperties {
  properties: {
    title: string;
    sheetId: number;
  };
}

// Define a type for the Google Sheets API
interface GoogleSheetsAPI {
  spreadsheets: {
    get: (params: { spreadsheetId: string }) => Promise<{
      data: {
        sheets: Array<{
          properties: {
            title: string;
            sheetId: number;
          };
        }>;
      };
    }>;
    values: {
      get: (params: { spreadsheetId: string; range: string }) => Promise<{
        data: {
          values?: string[][];
        };
      }>;
      update: (params: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        resource: { values: unknown[][] };
      }) => Promise<unknown>;
    };
    batchUpdate: (params: {
      spreadsheetId: string;
      resource: { requests: unknown[] };
    }) => Promise<unknown>;
  };
}

export class GoogleSheetsHelper {
  private client: JWT;
  private sheets: GoogleSheetsAPI;
  private spreadsheetId: string;

  constructor() {
    console.log("Email:", process.env.GOOGLE_SHEETS_CLIENT_EMAIL);
    console.log("Key exists:", !!process.env.GOOGLE_SHEETS_PRIVATE_KEY);
    console.log("Sheet ID:", process.env.GOOGLE_SHEETS_SHEET_ID);

    // Create a JWT client using the service account credentials
    this.client = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Use type assertion here
    this.sheets = google.sheets({
      version: "v4",
      auth: this.client,
    }) as GoogleSheetsAPI;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SHEET_ID || "";
  }

  async getDomains(): Promise<string[]> {
    try {
      // Get all sheet names - these are your domains
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      // Extract sheet names (excluding the first sheet which appears to be a metrics sheet)
      const domains = sheetsResponse.data.sheets
        .map((sheet: SheetProperties) => sheet.properties.title)
        .filter(
          (title: string) => !title.includes("Sheet") && title !== "Metrics"
        );

      console.log("Found domains:", domains);
      return domains;
    } catch (error) {
      console.error("Error fetching domains:", error);
      throw error;
    }
  }

  async writeResults(
    domain: string,
    results: {
      mobile: PageSpeedResult;
      desktop: PageSpeedResult;
    },
    date: string
  ) {
    try {
      // Find the next empty column in the domain's sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${domain}!A1:Z1`, // Get the header row
      });

      // Find the next empty column or create a new one
      const headerRow = response.data.values?.[0] || [];
      const columnIndex = headerRow.length + 1; // Next empty column (A=1, B=2, etc.)
      const columnLetter = String.fromCharCode(64 + columnIndex); // Convert to letter (A, B, C...)

      // Write the date in the header
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${domain}!${columnLetter}1`,
        valueInputOption: "RAW",
        resource: {
          values: [[date]],
        },
      });

      // Write the results in the column
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${domain}!${columnLetter}2:${columnLetter}7`,
        valueInputOption: "RAW",
        resource: {
          values: [
            [results.mobile.performance],
            [results.mobile.firstContentfulPaint],
            [results.mobile.speedIndex],
            [results.desktop.performance],
            [results.desktop.firstContentfulPaint],
            [results.desktop.speedIndex],
          ],
        },
      });

      // Get the sheet ID for formatting
      const sheetId = await this.getSheetIdByName(domain);

      // Apply color formatting based on metric values
      const requests = [
        // Mobile Performance
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.mobile.performance,
                        "performance"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Mobile FCP
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.mobile.firstContentfulPaint,
                        "firstContentfulPaint"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Mobile Speed Index
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 3,
              endRowIndex: 4,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.mobile.speedIndex,
                        "speedIndex"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Desktop Performance
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.desktop.performance,
                        "performance"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Desktop FCP
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 5,
              endRowIndex: 6,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.desktop.firstContentfulPaint,
                        "firstContentfulPaint"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Desktop Speed Index
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: columnIndex - 1,
              endColumnIndex: columnIndex,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredFormat: {
                      backgroundColor: getColorForMetric(
                        results.desktop.speedIndex,
                        "speedIndex"
                      ),
                    },
                  },
                ],
              },
            ],
            fields: "userEnteredFormat.backgroundColor",
          },
        },
      ];

      // Apply formatting
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: { requests },
      });

      return true;
    } catch (error) {
      console.error(`Error writing results for ${domain}:`, error);
      throw error;
    }
  }

  // Helper method to get sheet ID by name
  private async getSheetIdByName(sheetName: string): Promise<number> {
    try {
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetsResponse.data.sheets.find(
        (s: SheetProperties) => s.properties.title === sheetName
      );

      return sheet?.properties.sheetId || 0;
    } catch (error) {
      console.error(`Error getting sheet ID for ${sheetName}:`, error);
      return 0;
    }
  }
}
