# バリデーション結果: TI_LM358M

## サマリー
- スキーマ定義パラメータ数: 48
- 抽出成功: 48 (100%)
- N/A (記載なし): 0 (0%)
- required パラメータの欠損: 0

## N/A パラメータ一覧
| param_id | label | 理由 |
|----------|-------|------|
| (なし) | — | 全パラメータ抽出成功 |

## ID一致チェック
全48パラメータのIDがスキーマ定義と完全一致することを確認済み。

## 単位チェック
| param_id | スキーマunit | 抽出値内の単位 | 結果 |
|----------|-------------|---------------|------|
| Supply_Voltage_Max | V | 32 V | OK |
| Differential_Input_Voltage_Max | V | 32 V | OK |
| Input_Voltage_Range_Abs | V | -0.3 to 32 V | OK |
| Power_Dissipation_SOIC | mW | 530 mW | OK |
| Input_Current_Max | mA | 50 mA | OK |
| Storage_Temperature_Range | °C | -65 to 150 °C | OK |
| Lead_Temperature_Soldering | °C | 215/220 °C | OK |
| ESD_HBM | V | ±250 V | OK |
| Supply_Voltage_Range | V | 3 to 32 V | OK |
| Supply_Voltage_Dual | V | ±1.5 to ±16 V | OK |
| Operating_Temperature_Range | °C | 0 to 70 °C | OK |
| Theta_JA_SOIC | °C/W | 189 °C/W | OK |
| Theta_JA_PDIP | °C/W | 120 °C/W | OK |
| Theta_JA_DSBGA | °C/W | 230 °C/W | OK |
| Input_Offset_Voltage | mV | 2/7 mV | OK |
| Input_Offset_Voltage_Drift | μV/°C | 7 μV/°C | OK |
| Input_Bias_Current | nA | 45/250 nA | OK |
| Input_Offset_Current | nA | 5/50 nA | OK |
| Input_Offset_Current_Drift | pA/°C | 10 pA/°C | OK |
| Input_Common_Mode_Voltage_Range | V | 0 to V+−1.5 V | OK |
| Supply_Current_30V | mA | 1/2 mA | OK |
| Supply_Current_5V | mA | 0.5/1.2 mA | OK |
| Large_Signal_Voltage_Gain | V/mV | 25/100 V/mV | OK |
| DC_Voltage_Gain | dB | 100 dB | OK |
| Unity_Gain_Bandwidth | MHz | 1 MHz | OK |
| CMRR | dB | 65/85 dB | OK |
| PSRR | dB | 65/100 dB | OK |
| Amplifier_Coupling | dB | -120 dB | OK |
| Output_Current_Source | mA | 20/40 mA | OK |
| Output_Current_Sink | mA | 10/20 mA | OK |
| Output_Short_Circuit_Current | mA | 40/60 mA | OK |
| Output_Voltage_High | V | 26/27/28 V | OK |
| Output_Voltage_Low | mV | 5/20 mV | OK |
| Input_Offset_Voltage_OverTemp | mV | 9 mV | OK |
| Input_Bias_Current_OverTemp | nA | 40/500 nA | OK |
| Large_Signal_Voltage_Gain_OverTemp | V/mV | 15 V/mV | OK |
| Supply_Current_Drain | μA | 500 μA | OK |

## 注意事項
- 本データシートは LMx58-N ファミリ (LM158, LM258, LM358, LM2904) を網羅しているが、スキーマ `TI_LM358M` では LM358 / SOIC (D) パッケージに焦点を当てて抽出を実施。
- 電気的特性は Section 6.6 (LM358, LM2904) の LM358 列から抽出。LM158A/LM358A/LM158/LM258 は Section 6.5 に別途記載あり。
- Output_Voltage_High は V+=30V 条件で RL=2kΩ と RL=10kΩ の2条件を併記。
- Input_Common_Mode_Voltage_Range の上限は「V+−1.5 V」という電源電圧依存の表現であり、固定値ではない。
- ESD_HBM は ±250V (HBM) のみ記載。CDM の記載はデータシートに無し。
