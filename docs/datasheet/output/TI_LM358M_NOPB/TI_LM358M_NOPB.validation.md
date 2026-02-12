# バリデーション結果: TI_LM358M_NOPB

## サマリー
- スキーマ定義パラメータ数: 55
- 抽出成功: 55 (100%)
- N/A (記載なし): 0 (0%)
- required パラメータの欠損: 0

## N/A パラメータ一覧
| param_id | label | 理由 |
|----------|-------|------|
| (なし) | — | 全パラメータ抽出成功 |

## ID一致チェック
全55パラメータのIDがスキーマ定義と完全一致することを確認済み。

## 単位チェック
| param_id | スキーマunit | 抽出値内の単位 | 結果 |
|----------|-------------|---------------|------|
| Supply_Voltage_Max | V | 32 V | OK |
| Differential_Input_Voltage_Max | V | 32 V | OK |
| Input_Voltage_Range_Abs | V | -0.3 to 32 V | OK |
| Power_Dissipation_SOIC | mW | 530 mW | OK |
| Input_Current_Max | mA | 50 mA | OK |
| Output_Short_Circuit_GND | (なし) | Continuous | OK |
| Storage_Temperature_Range | °C | -65 to 150 °C | OK |
| Lead_Temperature_Soldering | °C | 215/220 °C | OK |
| ESD_HBM | V | ±250 V | OK |
| Supply_Voltage_Range | V | 3 to 32 V | OK |
| Supply_Voltage_Dual | V | ±1.5 to ±16 V | OK |
| Operating_Temperature_Range | °C | 0 to 70 °C | OK |
| Theta_JA_SOIC | °C/W | 189 °C/W | OK |
| Theta_JA_PDIP | °C/W | 120 °C/W | OK |
| Theta_JA_DSBGA | °C/W | 230 °C/W | OK |
| Theta_JA_TO99 | °C/W | 155 °C/W | OK |
| Input_Offset_Voltage | mV | 2/7 mV | OK |
| Input_Bias_Current | nA | 45/250 nA | OK |
| Input_Offset_Current | nA | 5/50 nA | OK |
| Input_Common_Mode_Voltage_Range | V | 0 to V+−1.5 V | OK |
| Supply_Current_30V | mA | 1/2 mA | OK |
| Supply_Current_5V | mA | 0.5/1.2 mA | OK |
| Large_Signal_Voltage_Gain | V/mV | 25/100 V/mV | OK |
| DC_Voltage_Gain | dB | 100 dB | OK |
| Unity_Gain_Bandwidth | MHz | 1 MHz | OK |
| CMRR | dB | 65/85 dB | OK |
| PSRR | dB | 65/100 dB | OK |
| Amplifier_Coupling | dB | -120 dB | OK |
| Output_Current_Source_25C | mA | 20/40 mA | OK |
| Output_Current_Sink_25C | mA | 10/20 mA | OK |
| Output_Current_Sink_LowVo | μA | 12/50 μA | OK |
| Output_Short_Circuit_Current | mA | 40/60 mA | OK |
| Output_Voltage_High | V | 26/27/28 V | OK |
| Output_Voltage_Low | mV | 5/20 mV | OK |
| Input_Offset_Voltage_OverTemp | mV | 9 mV | OK |
| Input_Offset_Voltage_Drift | μV/°C | 7 μV/°C | OK |
| Input_Offset_Current_OverTemp | nA | 150 nA | OK |
| Input_Offset_Current_Drift | pA/°C | 10 pA/°C | OK |
| Input_Bias_Current_OverTemp | nA | 40/500 nA | OK |
| Input_Common_Mode_Voltage_Range_OverTemp | V | 0 to V+−2 V | OK |
| Large_Signal_Voltage_Gain_OverTemp | V/mV | 15 V/mV | OK |
| Output_Current_Source_OverTemp | mA | 10/20 mA | OK |
| Output_Current_Sink_OverTemp | mA | 5/8 mA | OK |
| Supply_Current_Drain_Typ | μA | 500 μA | OK |
| Input_Offset_Voltage_Low | mV | 2 mV | OK |

## 注意事項
- 本データシートは LMx58-N ファミリ (LM158, LM258, LM358, LM2904) を網羅しているが、スキーマ `TI_LM358M_NOPB` では LM358 / SOIC (D) パッケージに焦点を当てて抽出を実施。
- 電気的特性は Section 6.6 (LM358, LM2904) の LM358 列から抽出。TA=25°C の値と全温度範囲の値を分離して記録。
- Output_Voltage_High は V+=30V 条件で RL=2kΩ と RL=10kΩ の2条件を併記。
- Input_Common_Mode_Voltage_Range の上限は「V+−1.5 V」(25°C)、全温度範囲では「V+−2 V」という電源電圧依存の表現。
- ESD_HBM は ±250V (HBM) のみ記載。CDM の記載はデータシートに無し。
- 前回のTI_LM358Mスキーマ (48パラメータ) に比べ、Output_Short_Circuit_GND, Output_Current_Sink_LowVo, Theta_JA_TO99, Over-temp系パラメータ等を追加し55パラメータに拡充。
