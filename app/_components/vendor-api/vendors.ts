export interface ApiEndpoint {
  href: string;
  label: string;
  disabled?: boolean;
}

export interface Vendor {
  label: string;
  endpoints: ApiEndpoint[];
}

export const vendors: Vendor[] = [
  {
    label: "Mouser",
    endpoints: [
      {
        href: "/vendor/mouser/keyword",
        label: "Keyword Search",
      },
      {
        href: "/vendor/mouser/partnumber",
        label: "Part Number Search",
      },
    ],
  },
  {
    label: "DigiKey",
    endpoints: [
      {
        href: "/vendor/digikey/keyword",
        label: "Keyword Search",
      },
      {
        href: "/vendor/digikey/recommended",
        label: "Recommended Products",
      },
      {
        href: "/vendor/digikey/substitutions",
        label: "Substitutions",
      },
    ],
  },
];

// リスク評価ページのパス
export const RISK_ASSESSMENT_PATH = "/risk-assessment";
