export interface PageSpeedResult {
  performance: number;
  firstContentfulPaint: number;
  speedIndex: number;
}

export interface PageSpeedStatus {
  success: boolean;
  domainsProcessed?: number;
  duration?: string;
  results: Array<{
    domain: string;
    status: string;
    mobile?: PageSpeedResult;
    desktop?: PageSpeedResult;
    error?: string;
  }>;
}
