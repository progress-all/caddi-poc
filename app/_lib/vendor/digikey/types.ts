/**
 * DigiKey API 型定義
 */

// SortOptions
export type DigiKeySortField =
  | "None"
  | "DigiKeyProductNumber"
  | "ManufacturerProductNumber"
  | "Manufacturer"
  | "MinimumQuantity"
  | "QuantityAvailable"
  | "Price"
  | "Packaging"
  | "ProductStatus"
  | "Supplier"
  | "PriceManufacturerStandardPackage";

export type DigiKeySortOrder = "Ascending" | "Descending";

export interface DigiKeySortOptions {
  Field?: DigiKeySortField;
  SortOrder?: DigiKeySortOrder;
}

// FilterOptionsRequest
export interface DigiKeyFilterOptionsRequest {
  ManufacturerFilter?: Array<{ Id: string }>;
  CategoryFilter?: Array<{ Id: string }>;
  StatusFilter?: Array<{ Id: string }>;
  MinimumQuantityAvailable?: number;
}

// 入力型
export interface KeywordSearchInput {
  keywords: string;
  limit?: number;
  offset?: number;
  sortField?: DigiKeySortField | ""; // フォームからの空文字列を許容
  sortOrder?: DigiKeySortOrder | ""; // フォームからの空文字列を許容
  manufacturerIds?: string; // カンマ区切りテキスト
  categoryIds?: string;
  statusIds?: string;
  minimumQuantityAvailable?: number;
}

// レスポンス型
export interface DigiKeyDescription {
  ProductDescription?: string;
  DetailedDescription?: string;
}

export interface DigiKeyManufacturer {
  Id?: number;
  Name?: string;
}

export interface DigiKeyProductStatus {
  Id?: number;
  Status?: string;
}

export interface DigiKeyPackageType {
  Id?: number;
  Name?: string;
}

export interface DigiKeyProductVariation {
  DigiKeyProductNumber?: string;
  PackageType?: DigiKeyPackageType;
  BreakQuantity?: number;
  UnitPrice?: number;
  TotalPrice?: number;
  QuantityAvailableforPackageType?: number;
  MaxQuantityForDistribution?: number;
  MinimumOrderQuantity?: number;
  DigiReelFee?: number;
}

export interface DigiKeyParameter {
  ParameterId?: number;
  ParameterText?: string;
  ParameterType?: string;
  ValueId?: string;
  ValueText?: string;
}

export interface DigiKeyCategory {
  CategoryId?: number;
  ParentId?: number;
  Name?: string;
  ProductCount?: number;
  NewProductCount?: number;
  ImageUrl?: string;
  SeoDescription?: string;
  ChildCategories?: DigiKeyCategory[];
}

export interface DigiKeyProduct {
  Description?: DigiKeyDescription;
  Manufacturer?: DigiKeyManufacturer;
  ManufacturerProductNumber?: string;
  UnitPrice?: number;
  ProductUrl?: string;
  DatasheetUrl?: string;
  PhotoUrl?: string;
  ProductVariations?: DigiKeyProductVariation[];
  QuantityAvailable?: number;
  ProductStatus?: DigiKeyProductStatus;
  BackOrderNotAllowed?: boolean | null;
  NormallyStocking?: boolean;
  Discontinued?: boolean;
  EndOfLife?: boolean | null;
  Ncnr?: boolean;
  PrimaryVideoUrl?: string | null;
  Parameters?: DigiKeyParameter[];
  BaseProductNumber?: string | null;
  Category?: DigiKeyCategory;
  DateLastBuyChance?: string;
  ManufacturerLeadWeeks?: string;
  ManufacturerPublicQuantity?: number;
  Series?: {
    Id?: number;
    Name?: string;
  };
  ShippingInfo?: unknown;
  Classifications?: {
    ExportControlClassNumber?: string;
    HTSUSCode?: string;
  };
  [key: string]: unknown;
}

export interface DigiKeyKeywordSearchResults {
  Products?: DigiKeyProduct[];
  ProductsCount?: number;
  ExactMatches?: DigiKeyProduct[];
  FilterOptions?: {
    Manufacturers?: Array<{
      Id?: number;
      Name?: string;
      ProductCount?: number;
    }>;
    Categories?: unknown[];
    Series?: unknown[];
  };
}
