/**
 * データシートパラメーターの型定義
 *
 * あらゆる部品種別のデータシートに対応する汎用型定義。
 * 各部品ごとに生成されるスキーマ (<datasheet-id>.schema.yaml) と
 * 抽出結果JSON (<datasheet-id>.json) の両方に対応します。
 */

// ============================================================================
// MLCC 後方互換用 (レガシー)
// ============================================================================

/**
 * MLCC 用パラメーターカテゴリ（後方互換のため残置）
 */
export type DatasheetParameterCategory =
  | "dimensions"
  | "rated_values"
  | "packaging"
  | "test_specs";

/**
 * MLCC 用パラメーターID（後方互換のため残置）
 * 新規コードでは使用せず、string 型を使用してください。
 * @deprecated 新規コードでは string を使用
 */
export type MlccParameterId =
  | "L_Dimensions"
  | "W_Dimensions"
  | "T_Dimensions"
  | "e_Dimensions"
  | "g_Dimensions"
  | "TemperatureCharacteristics_PublicSTD"
  | "TemperatureCharacteristics_CapChange"
  | "TemperatureCharacteristics_TempRange"
  | "RatedVoltage"
  | "NominalCapacitance"
  | "CapacitanceTolerance"
  | "Packaging_180mmReel"
  | "Packaging_330mmReel"
  | "RatedVoltage_Spec"
  | "OperatingTempRange_Spec"
  | "Appearance_Spec"
  | "Dimension_Spec"
  | "VoltageProof_Spec"
  | "VoltageProof_TestVoltage"
  | "VoltageProof_AppliedTime"
  | "InsulationResistance_Spec"
  | "InsulationResistance_ChargingTime"
  | "Capacitance_Frequency"
  | "Capacitance_Voltage"
  | "DissipationFactor_Spec"
  | "TemperatureCharacteristics_CapChange_Spec"
  | "AdhesiveStrength_AppliedForce"
  | "AdhesiveStrength_HoldingTime"
  | "Vibration_Appearance_Spec"
  | "Vibration_Capacitance_Spec"
  | "Vibration_DF_Spec"
  | "Vibration_TotalAmplitude"
  | "Vibration_Time"
  | "SubstrateBendingTest_Appearance_Spec"
  | "SubstrateBendingTest_CapChange_Spec"
  | "SubstrateBendingTest_Flexure"
  | "SubstrateBendingTest_HoldingTime"
  | "Solderability_Spec"
  | "Solderability_SolderTemp"
  | "Solderability_ImmersionTime"
  | "ResistanceToSolderingHeat_Appearance_Spec"
  | "ResistanceToSolderingHeat_CapChange_Spec"
  | "ResistanceToSolderingHeat_DF_Spec"
  | "ResistanceToSolderingHeat_IR_Spec"
  | "ResistanceToSolderingHeat_VoltageProof_Spec"
  | "ResistanceToSolderingHeat_SolderTemp"
  | "ResistanceToSolderingHeat_ImmersionTime"
  | "TemperatureSuddenChange_Appearance_Spec"
  | "TemperatureSuddenChange_CapChange_Spec"
  | "TemperatureSuddenChange_Cycle"
  | "HighTemperatureHighHumidity_Appearance_Spec"
  | "HighTemperatureHighHumidity_CapChange_Spec"
  | "HighTemperatureHighHumidity_DF_Spec"
  | "HighTemperatureHighHumidity_IR_Spec"
  | "HighTemperatureHighHumidity_TestTemp"
  | "HighTemperatureHighHumidity_TestHumidity"
  | "HighTemperatureHighHumidity_TestTime"
  | "Durability_Appearance_Spec"
  | "Durability_CapChange_Spec"
  | "Durability_DF_Spec"
  | "Durability_IR_Spec"
  | "Durability_TestTemperature"
  | "Durability_AppliedVoltage"
  | "Durability_TestTime";

/**
 * @deprecated MlccParameterId のエイリアス（後方互換のため残置）
 */
export type DatasheetParameterId = MlccParameterId;

// ============================================================================
// 汎用型定義 (全部品種別対応)
// ============================================================================

/**
 * パラメータの抽出ステータス
 * - "extracted": データシートから値を抽出できた
 * - "not_available": データシートに記載がなかった (value は "N/A")
 */
export type DatasheetParameterStatus = "extracted" | "not_available";

/**
 * 個別パラメーターの値
 * JSONファイル内の各パラメーターの構造
 */
export interface DatasheetParameterValue {
  description: string;
  value: string | null;
  /** 抽出ステータス（optional: 既存JSONとの後方互換のため） */
  status?: DatasheetParameterStatus;
}

/**
 * 表抽出結果（表構造保持）
 * extract_tables.py が出力する tables.json 内の各テーブルに対応
 */
export interface ExtractedTableData {
  /** ページ番号 (1-indexed) */
  page: number;
  /** テーブルタイトル（検出できた場合） */
  title?: string;
  /** ヘッダー行（正規化済み） */
  headers: string[];
  /** 各行のデータ（{ヘッダー名: 値} の配列） */
  rows: Array<Record<string, string>>;
  /** 品質スコア (0.0〜1.0) */
  quality_score: number;
  /** 使用した抽出方式 ("pdfplumber" | "pymupdf") */
  method: string;
}

/**
 * データシートJSONファイル全体の型
 * `<datasheet-id>.json` ファイルの構造に対応
 *
 * parameters のキーは部品ごとに異なる任意の文字列ID。
 */
export interface DatasheetData {
  datasheet_id: string;
  version: string;
  /** 使用したスキーマID（= datasheet-id。optional: 既存JSONとの後方互換のため） */
  schema_id?: string;
  /** LLMが推定した部品カテゴリ（optional: 既存JSONとの後方互換のため） */
  inferred_category?: string;
  parameters: Record<string, DatasheetParameterValue>;
  /** 表抽出結果（optional: 表抽出モジュール導入後に追加。後方互換のためoptional） */
  tables?: ExtractedTableData[];
}

/**
 * パラメータースキーマ定義（<datasheet-id>.schema.yaml の各パラメータに対応）
 * generic-schema.template.yaml のフォーマットに準拠
 */
export interface DatasheetParameterSchema {
  /** パラメータID (PascalCase_Snake形式) */
  id: string;
  /** 日本語ラベル */
  label: string;
  /** パラメータの説明 */
  description: string;
  /** 単位 (該当なしは空文字) */
  unit: string;
  /** データシート内の抽出場所・方法のヒント */
  extraction_hint: string;
  /** true=必須, false=任意 */
  required: boolean;
}

/**
 * データシートスキーマ全体の型
 * <datasheet-id>.schema.yaml ファイルの構造に対応
 */
export interface DatasheetSchema {
  schema_version: string;
  schema_id: string;
  inferred_category: string;
  parameters: DatasheetParameterSchema[];
}

/**
 * 統合 product JSON（DigiKey + Datasheet をマージしたローカル保存用）
 * 格納先: app/_lib/datasheet/products/{partId}.json
 */
export interface UnifiedProduct {
  partId: string;
  digiKeyParameters: Array<{ name: string; value: string }>;
  datasheetParameters: Record<string, { description: string; value: string | null }>;
  manufacturerProductNumber?: string;
  digiKeyProductNumber?: string;
  updatedAt?: string;
}
