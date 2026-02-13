# バリデーション結果: Vishay_IRLZ44SPBF

## サマリー
- スキーマ定義パラメータ数: 50
- 抽出成功: 50 (100%)
- N/A (記載なし): 0 (0%)
- required パラメータの欠損: 0

## 検証詳細

### 網羅性チェック
全48個の `required: true` パラメータが値付き (value ≠ "N/A") でJSON内に存在。
2個の `required: false` パラメータ (LD, LS) も値が抽出できた。

### N/A パラメータ一覧
| param_id | label | 理由 |
|----------|-------|------|
| (該当なし) | - | - |

### 単位チェック
| param_id | 期待単位 | 値 | 判定 |
|----------|----------|-----|------|
| VDS | V | 60 V | OK |
| VGS_Max | V | ±10 V | OK |
| ID_TC25 | A | 50 A | OK |
| ID_TC100 | A | 36 A | OK |
| IDM | A | 200 A | OK |
| PD_TC25 | W | 150 W | OK |
| PD_TA25_PCB | W | 3.7 W | OK |
| Linear_Derating_Factor | W/°C | 1.0 W/°C | OK |
| Linear_Derating_Factor_PCB | W/°C | 0.025 W/°C | OK |
| EAS | mJ | 400 mJ | OK |
| dv_dt | V/ns | 4.5 V/ns | OK |
| TJ_TSTG_Range | °C | -55 to +175 °C | OK |
| Soldering_Temp | °C | 300 °C | OK |
| Thermal_Resistance_JA | °C/W | 62 °C/W max | OK |
| Thermal_Resistance_JA_PCB | °C/W | 40 °C/W max | OK |
| Thermal_Resistance_JC | °C/W | 1.0 °C/W max | OK |
| BVDSS | V | 60 V min | OK |
| BVDSS_TempCoeff | V/°C | 0.070 V/°C typ | OK |
| VGS_th | V | 1.0 V min / 2.0 V max | OK |
| IGSS | nA | ±100 nA max | OK |
| IDSS_25C | µA | 25 µA max | OK |
| IDSS_150C | µA | 250 µA max | OK |
| RDS_on_VGS5V | Ω | 0.028 Ω max | OK |
| RDS_on_VGS4V | Ω | 0.039 Ω max | OK |
| gfs | S | 23 S min | OK |
| Ciss | pF | 3300 pF typ | OK |
| Coss | pF | 1200 pF typ | OK |
| Crss | pF | 200 pF typ | OK |
| Qg_Total | nC | 66 nC max | OK |
| Qgs | nC | 12 nC max | OK |
| Qgd | nC | 43 nC max | OK |
| td_on | ns | 17 ns typ | OK |
| tr | ns | 230 ns typ | OK |
| td_off | ns | 42 ns typ | OK |
| tf | ns | 110 ns typ | OK |
| LD | nH | 4.5 nH typ | OK |
| LS | nH | 7.5 nH typ | OK |
| IS | A | 50 A | OK |
| ISM | A | 200 A | OK |
| VSD | V | 2.5 V max | OK |
| trr | ns | 130 ns typ / 180 ns max | OK |
| Qrr | µC | 0.84 µC typ / 1.3 µC max | OK |

### ID一致チェック
JSONの全キーがスキーマのIDと完全一致: **OK**

## 注意事項
- PyMuPDFによるテキスト抽出で高品質 (score=0.9901) のため、OCR不要。
- Vishay版はInfineon版(IRLZ44N)と同系統の部品だが、VDS=60V (vs 55V)、VGS_Max=±10V (vs ±16V)、RDS(on)測定条件が異なる (VGS=5V/ID=31A vs VGS=10V/ID=25A) 等、仕様差がある。
- ID_TC25の注釈 "Current limited by the package, (die current = 51 A)" に留意。パッケージ制約で50A。
- Qrr の単位は µC（マイクロクーロン）であり、Infineon版の nC とは桁が異なる。データシート原文通り。
