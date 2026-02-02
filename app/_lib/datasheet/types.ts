/**
 * データシートパラメーターの型定義
 * 
 * このファイルは `docs/datasheet/params/params-schema.yaml` に対応するTypeScript型定義です。
 * バックエンドAPIとフロントエンドの両方で型安全にデータシートデータを扱うために使用します。
 */

/**
 * パラメーターカテゴリ
 */
export type DatasheetParameterCategory =
  | "dimensions"
  | "rated_values"
  | "packaging"
  | "test_specs";

/**
 * パラメーターID（リテラル型でオートコンプリート対応）
 * params-schema.yaml の全64パラメーターに対応
 */
export type DatasheetParameterId =
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
 * 個別パラメーターの値
 * JSONファイル内の各パラメーターの構造
 */
export interface DatasheetParameterValue {
  description: string;
  value: string | null;
}

/**
 * データシートJSONファイル全体の型
 * `<datasheet-id>.json` ファイルの構造に対応
 */
export interface DatasheetData {
  datasheet_id: string;
  version: string;
  parameters: Record<DatasheetParameterId, DatasheetParameterValue>;
}

/**
 * パラメータースキーマ定義（YAMLに対応）
 * params-schema.yaml の構造に対応
 */
export interface DatasheetParameterSchema {
  id: DatasheetParameterId;
  description: string;
  category: DatasheetParameterCategory;
  extraction_hint: string;
}

/**
 * データシートスキーマ全体の型
 * params-schema.yaml ファイルの構造に対応
 */
export interface DatasheetSchema {
  version: string;
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
