/**
 * メーカー名 → 短縮名（datasheet-id 命名の唯一の情報源）
 *
 * Download API / datasheet-url API で使用。
 * 新しいメーカーを追加する場合はここに追加するだけで OK。
 */
export const MANUFACTURER_SHORT_NAMES: Record<string, string> = {
  Murata: "Murata",
  "Murata Manufacturing": "Murata",
  "Texas Instruments": "TI",
  TI: "TI",
  Vishay: "Vishay",
  "Vishay Siliconix": "Vishay",
  "Vishay Intertechnology": "Vishay",
  KEMET: "KEMET",
  TDK: "TDK",
  Samsung: "Samsung",
  Yageo: "Yageo",
  "Analog Devices": "Analog_Devices",
  "Analog Devices Inc.": "Analog_Devices",
  "Analog Devices Inc": "Analog_Devices",
  Broadcom: "Broadcom",
  "Broadcom Limited": "Broadcom",
  "MACOM Technology Solutions": "MACOM_Technology_Solutions",
  "MACOM Technology Solutions Inc.": "MACOM_Technology_Solutions",
  Micron: "Micron",
  "Micron Technology": "Micron",
  "Micron Technology Inc.": "Micron",
  "Micron Technology, Inc.": "Micron",
  Infineon: "Infineon",
  "Infineon Technologies": "Infineon",
  "Infineon Technologies AG": "Infineon",
  STMicroelectronics: "ST",
  "STMicroelectronics N.V.": "ST",
  ST: "ST",
  NXP: "NXP",
  "NXP Semiconductors": "NXP",
  "NXP Semiconductors N.V.": "NXP",
  "NXP USA Inc.": "NXP",
  "NXP USA": "NXP",
  Renesas: "Renesas",
  "Renesas Electronics": "Renesas",
  "Renesas Electronics Corporation": "Renesas",
  Rohm: "Rohm",
  "Rohm Semiconductor": "Rohm",
  "ROHM Semiconductor": "Rohm",
  "ROHM Co., Ltd.": "Rohm",
  ROHM: "Rohm",
};

function sanitizeForId(s: string): string {
  return (
    String(s)
      .replaceAll(/\s+/g, "_")
      .replaceAll(/[/\\:*?"<>|#]/g, "_")
      .trim() || "unknown"
  );
}

/**
 * メーカー名と MPN から datasheet-id 候補を返す。
 * 例: ("Texas Instruments", "LM358M") → "TI_LM358M"
 * メーカーがマップに無い場合は null（フォールバックしない）
 */
export function getMfgMpnDatasheetId(
  manufacturerName: string | undefined,
  mpn: string | undefined,
): string | null {
  if (!manufacturerName || !mpn) return null;
  const mfgShort =
    MANUFACTURER_SHORT_NAMES[manufacturerName] ??
    MANUFACTURER_SHORT_NAMES[manufacturerName.trim()];
  if (!mfgShort) return null;
  const mpnPart = sanitizeForId(mpn);
  return `${mfgShort}_${mpnPart}`;
}
