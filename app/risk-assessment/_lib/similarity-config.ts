/**
 * 類似度計算のパラメータ設定
 * 
 * 比較対象とするパラメータと、各パラメータに適用するマッチャーを定義します。
 */

export type MatcherType = "exact" | "numeric" | "tolerance" | "range";

/**
 * 比較対象パラメータの定義
 */
export interface ComparisonParameter {
  /** データソース */
  source: "digikey" | "datasheet";
  /** パラメータ識別子（DigiKey: name, Datasheet: id） */
  id: string;
  /** 表示名（モーダル用） */
  displayName: string;
  /** マッチャーの種類 */
  matcher: MatcherType;
  /** 重み（デフォルト: 1） */
  weight?: number;
  /** 数値マッチャーの場合の許容誤差（デフォルト: 0.2 = 20%） */
  tolerance?: number;
  /** 比較対象外とするか（デフォルト: false = 比較対象） */
  excluded?: boolean;
  /** 対象外とする理由（excluded: true の場合に必須） */
  excludeReason?: string;
}

/**
 * 比較対象パラメータのリスト
 * 
 * このリストに定義されたパラメータがすべて比較対象となります。
 * 両方に値がある場合はスコア計算、片方のみの場合は「比較不可」として記録されます。
 */
export const COMPARISON_PARAMETERS: ComparisonParameter[] = [
  // ===== DigiKey Parameters =====
  {
    source: "digikey",
    id: "Capacitance",
    displayName: "静電容量",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2, // 20%許容
  },
  {
    source: "digikey",
    id: "Voltage - Rated",
    displayName: "定格電圧",
    matcher: "tolerance",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Package / Case",
    displayName: "パッケージ",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Temperature Coefficient",
    displayName: "温度特性",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Operating Temperature",
    displayName: "動作温度",
    matcher: "range",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Tolerance",
    displayName: "許容差",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Mounting Type",
    displayName: "実装タイプ",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Size / Dimension",
    displayName: "サイズ",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Thickness (Max)",
    displayName: "厚さ",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "digikey",
    id: "Height - Seated (Max)",
    displayName: "高さ",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "digikey",
    id: "Applications",
    displayName: "用途",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Features",
    displayName: "特徴",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Ratings",
    displayName: "定格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "Lead Spacing",
    displayName: "リード間隔",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "digikey",
    id: "Lead Style",
    displayName: "リード形状",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "digikey",
    id: "ESR (Equivalent Series Resistance)",
    displayName: "ESR",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.3, // 30%許容
  },
  {
    source: "digikey",
    id: "Inductance",
    displayName: "インダクタンス",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "digikey",
    id: "Resistance",
    displayName: "抵抗値",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "digikey",
    id: "Current - Rated",
    displayName: "定格電流",
    matcher: "tolerance",
    weight: 1,
  },

  // ===== Datasheet Parameters =====
  {
    source: "datasheet",
    id: "NominalCapacitance",
    displayName: "公称静電容量",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.2,
  },
  {
    source: "datasheet",
    id: "RatedVoltage",
    displayName: "定格電圧",
    matcher: "tolerance",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "CapacitanceTolerance",
    displayName: "静電容量許容差",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureCharacteristics_PublicSTD",
    displayName: "温度特性（規格コード）",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureCharacteristics_CapChange",
    displayName: "温度特性（容量変化率）",
    matcher: "range",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureCharacteristics_TempRange",
    displayName: "温度特性（温度範囲）",
    matcher: "range",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "L_Dimensions",
    displayName: "長さ (L寸法)",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.1, // 10%許容（寸法は厳密）
  },
  {
    source: "datasheet",
    id: "W_Dimensions",
    displayName: "幅 (W寸法)",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.1,
  },
  {
    source: "datasheet",
    id: "T_Dimensions",
    displayName: "厚さ (T寸法)",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.1,
  },
  {
    source: "datasheet",
    id: "e_Dimensions",
    displayName: "電極寸法 (e)",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.1,
  },
  {
    source: "datasheet",
    id: "g_Dimensions",
    displayName: "電極間隔 (g)",
    matcher: "numeric",
    weight: 1,
    tolerance: 0.1,
  },

  // ===== 比較対象パラメータ（続き） =====
  
  // 梱包情報
  {
    source: "datasheet",
    id: "Packaging_180mmReel",
    displayName: "梱包 (180mmリール)",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Packaging_330mmReel",
    displayName: "梱包 (330mmリール)",
    matcher: "exact",
    weight: 1,
  },

  // 基本情報・規格値
  {
    source: "datasheet",
    id: "RatedVoltage_Spec",
    displayName: "定格電圧 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Appearance_Spec",
    displayName: "外観 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Dimension_Spec",
    displayName: "寸法 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "VoltageProof_Spec",
    displayName: "耐電圧 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "VoltageProof_TestVoltage",
    displayName: "耐電圧 試験電圧",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "VoltageProof_AppliedTime",
    displayName: "耐電圧 印加時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "InsulationResistance_Spec",
    displayName: "絶縁抵抗 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "InsulationResistance_ChargingTime",
    displayName: "絶縁抵抗 充電時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Capacitance_Frequency",
    displayName: "静電容量 測定周波数",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Capacitance_Voltage",
    displayName: "静電容量 測定電圧",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "DissipationFactor_Spec",
    displayName: "誘電正接 規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureCharacteristics_CapChange_Spec",
    displayName: "温度特性 容量変化率 判定規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "AdhesiveStrength_AppliedForce",
    displayName: "終端固着強度 加圧力",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "AdhesiveStrength_HoldingTime",
    displayName: "終端固着強度 保持時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Vibration_Appearance_Spec",
    displayName: "耐振動性 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Vibration_Capacitance_Spec",
    displayName: "耐振動性 静電容量規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Vibration_DF_Spec",
    displayName: "耐振動性 誘電正接規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Vibration_TotalAmplitude",
    displayName: "耐振動性 全振幅",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Vibration_Time",
    displayName: "耐振動性 試験時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "SubstrateBendingTest_Appearance_Spec",
    displayName: "基板曲げテスト 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "SubstrateBendingTest_CapChange_Spec",
    displayName: "基板曲げテスト 容量変化率規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "SubstrateBendingTest_Flexure",
    displayName: "基板曲げテスト たわみ量",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "SubstrateBendingTest_HoldingTime",
    displayName: "基板曲げテスト 保持時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Solderability_Spec",
    displayName: "はんだ付け性 判定規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Solderability_SolderTemp",
    displayName: "はんだ付け性 はんだ温度",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Solderability_ImmersionTime",
    displayName: "はんだ付け性 浸漬時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_Appearance_Spec",
    displayName: "はんだ耐熱 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_CapChange_Spec",
    displayName: "はんだ耐熱 容量変化率規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_DF_Spec",
    displayName: "はんだ耐熱 誘電正接規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_IR_Spec",
    displayName: "はんだ耐熱 絶縁抵抗規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_VoltageProof_Spec",
    displayName: "はんだ耐熱 耐電圧規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_SolderTemp",
    displayName: "はんだ耐熱 はんだ温度",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "ResistanceToSolderingHeat_ImmersionTime",
    displayName: "はんだ耐熱 浸漬時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureSuddenChange_Appearance_Spec",
    displayName: "温度急変 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureSuddenChange_CapChange_Spec",
    displayName: "温度急変 容量変化率規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "TemperatureSuddenChange_Cycle",
    displayName: "温度急変 サイクル数",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_Appearance_Spec",
    displayName: "高温高湿(定常) 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_CapChange_Spec",
    displayName: "高温高湿(定常) 容量変化率規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_DF_Spec",
    displayName: "高温高湿(定常) 誘電正接規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_IR_Spec",
    displayName: "高温高湿(定常) 絶縁抵抗規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_TestTemp",
    displayName: "高温高湿(定常) 試験温度",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_TestHumidity",
    displayName: "高温高湿(定常) 試験湿度",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "HighTemperatureHighHumidity_TestTime",
    displayName: "高温高湿(定常) 試験時間",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_Appearance_Spec",
    displayName: "耐久性 外観規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_CapChange_Spec",
    displayName: "耐久性 容量変化率規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_DF_Spec",
    displayName: "耐久性 誘電正接規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_IR_Spec",
    displayName: "耐久性 絶縁抵抗規格",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_TestTemperature",
    displayName: "耐久性 試験温度",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_AppliedVoltage",
    displayName: "耐久性 印加電圧",
    matcher: "exact",
    weight: 1,
  },
  {
    source: "datasheet",
    id: "Durability_TestTime",
    displayName: "耐久性 試験時間",
    matcher: "exact",
    weight: 1,
  },
];

/**
 * パラメータ設定を取得
 * 
 * @param source データソース
 * @param identifier パラメータ識別子（DigiKey: name, Datasheet: id）
 */
export function getComparisonParameter(
  source: "digikey" | "datasheet",
  identifier: string
): ComparisonParameter | undefined {
  return COMPARISON_PARAMETERS.find((param) => {
    if (param.source !== source) return false;
    return param.id === identifier;
  });
}

/**
 * すべての比較対象パラメータを取得
 */
export function getAllComparisonParameters(): ComparisonParameter[] {
  return COMPARISON_PARAMETERS;
}

/**
 * ソースでフィルタした比較対象パラメータを取得
 * @param source "digikey" または "datasheet"
 */
export function getComparisonParametersBySource(
  source: "digikey" | "datasheet"
): ComparisonParameter[] {
  return COMPARISON_PARAMETERS.filter((p) => p.source === source);
}

/**
 * デフォルト設定（設定が見つからない場合に使用）
 */
export const DEFAULT_CONFIG: ComparisonParameter = {
  source: "digikey",
  id: "",
  displayName: "",
  matcher: "exact",
  weight: 1,
};
