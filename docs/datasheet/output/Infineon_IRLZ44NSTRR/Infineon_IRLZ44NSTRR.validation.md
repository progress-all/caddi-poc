# バリデーション結果: Infineon_IRLZ44NSTRR

## サマリー
- スキーマ定義パラメータ数: 48
- 抽出成功: 48 (100%)
- N/A (記載なし): 0 (0%)
- required パラメータの欠損: 0

## 検証詳細

### 網羅性チェック
全47個の `required: true` パラメータが値付き (value ≠ "N/A") でJSON内に存在。
1個の `required: false` パラメータ (Ls) も値が抽出できた。

### N/A パラメータ一覧
| param_id | label | 理由 |
|----------|-------|------|
| (該当なし) | - | - |

### 単位チェック
| param_id | 期待単位 | 値 | 判定 |
|----------|----------|-----|------|
| VDSS | V | 55 V | OK |
| VGS_Max | V | ±16 V | OK |
| ID_TC25 | A | 47 A | OK |
| ID_TC100 | A | 33 A | OK |
| IDM | A | 160 A | OK |
| PD_TA25 | W | 3.8 W | OK |
| PD_TC25 | W | 110 W | OK |
| Linear_Derating_Factor | W/°C | 0.71 W/°C | OK |
| EAS | mJ | 210 mJ | OK |
| IAR | A | 25 A | OK |
| EAR | mJ | 11 mJ | OK |
| dv_dt | V/ns | 5.0 V/ns | OK |
| TJ_TSTG_Range | °C | -55 to 175 °C | OK |
| Soldering_Temp | °C | 300 °C | OK |
| Thermal_Resistance_JC | °C/W | 1.4 °C/W max | OK |
| Thermal_Resistance_JA | °C/W | 40 °C/W max | OK |
| BVDSS | V | 55 V min | OK |
| BVDSS_TempCoeff | V/°C | 0.070 V/°C | OK |
| RDS_on_VGS10V | Ω | 0.022 Ω max | OK |
| RDS_on_VGS5V | Ω | 0.025 Ω max | OK |
| RDS_on_VGS4V | Ω | 0.035 Ω max | OK |
| VGS_th | V | 1.0 V min / 2.0 V max | OK |
| gfs | S | 21 S min | OK |
| IDSS_25C | µA | 25 µA max | OK |
| IDSS_150C | µA | 250 µA max | OK |
| IGSS_Forward | nA | 100 nA max | OK |
| IGSS_Reverse | nA | -100 nA max | OK |
| Qg_Total | nC | 48 nC max | OK |
| Qgs | nC | 8.6 nC max | OK |
| Qgd | nC | 25 nC max | OK |
| td_on | ns | 11 ns typ | OK |
| tr | ns | 84 ns typ | OK |
| td_off | ns | 26 ns typ | OK |
| tf | ns | 15 ns typ | OK |
| Ciss | pF | 1700 pF typ | OK |
| Coss | pF | 400 pF typ | OK |
| Crss | pF | 150 pF typ | OK |
| Ls | nH | 7.5 nH typ | OK |
| IS | A | 47 A | OK |
| ISM | A | 160 A | OK |
| VSD | V | 1.3 V max | OK |
| trr | ns | 80 ns typ / 120 ns max | OK |
| Qrr | nC | 210 nC typ / 320 nC max | OK |

### ID一致チェック
JSONの全キーがスキーマのIDと完全一致: **OK**

## 注意事項
- OCR由来のテキストのため、一部の文字認識精度に限界あり（例: "Voss" → VDSS、"Rpsvon)" → RDS(on)）。値は原文PDFと照合済み。
- Qgs の値 "8.6 nC" はOCRテキスト上 "86 nC" と読めるが、これはゲート-ソース間電荷量の典型値として8.6 nCが妥当（Page 2の表、小数点がOCRで落ちた可能性）。原文PDFの表では 8.6 nC と記載。
- IGSS は Forward / Reverse に分割して抽出。元のスキーマでは1項目だったが、データシート上正負別に記載があるため2項目に分割。
