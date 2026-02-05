export interface ApiEndpoint {
  href: string;
  label: string;
  disabled?: boolean;
}

export interface Vendor {
  label: string;
  endpoints: ApiEndpoint[];
}

export const vendors: Vendor[] = [];

// リスク評価ページのパス
export const RISK_ASSESSMENT_PATH = "/risk-assessment";

// BOM一覧ページのパス
export const BOM_PATH = "/bom";
