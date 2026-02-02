---
name: evaluate-similarity-digikey
description: DigiKey APIパラメータからLLMで類似度を評価し結果をJSONに出力。Use when comparing electronic component similarity using DigiKey parameters, or when the user mentions DigiKey-based similarity evaluation.
---

# evaluate-similarity-digikey

TargetとCandidateのDigiKey APIパラメータ（`parameters`）を入力として、CursorのLLMで各パラメータの類似度を評価し、結果をJSONファイルに出力する。

## 使い方

TargetとCandidateのDigiKeyパラメータを指定して実行する。パラメータは以下のいずれかから取得可能:
- 類似品検索APIのレスポンス（`searchSimilarProducts`）の `targetProduct.parameters` と `candidates[].parameters`
- 事前にエクスポートしたJSONファイル

```
Target ID: GRM185R60J105KE26-01 (digiKeyProductNumber または manufacturerProductNumber)
Candidate ID: GRM188R60J105KA01-01
出力先: app/_lib/datasheet/similarity-results-api/{TargetID}/{CandidateID}.json
```

## JSON格納ルールと区別

部品名（MPN）をIDに使う場合、2系統で同じMPNが使われる。**ディレクトリで区別**する:

| 系統 | ディレクトリ | targetId/candidateId | 入力データ |
|------|--------------|----------------------|------------|
| データシート基準 | `similarity-results/` | datasheet_id（MPN） | データシートJSON（`data/*.json`）の parameters |
| DigiKey API基準 | `similarity-results-api/` | MPN または digiKeyProductNumber | DigiKey API の parameters |

- `app/_lib/datasheet/similarity-results/{targetId}/{candidateId}.json` … データシート（PDF）由来
- `app/_lib/datasheet/similarity-results-api/{targetId}/{candidateId}.json` … DigiKey API由来

API も異なる: `/api/similarity-results` と `/api/similarity-results-api`。

## 入力データ形式

DigiKey Product Details API の `parameters` は `Array<{name: string, value: string}>` 形式。

例:
```json
{
  "parameters": [
    { "name": "Capacitance", "value": "1 µF" },
    { "name": "Voltage - Rated", "value": "6.3 V" },
    { "name": "Package / Case", "value": "0603 (1608 Metric)" }
  ]
}
```

表示名（description）は `app/risk-assessment/_lib/similarity-config.ts` の `getComparisonParametersBySource("digikey")` から取得する。各DigiKeyパラメータIDに対応する `displayName` を使用する。

## ワークフロー

### Step 1: 入力データの準備

TargetとCandidateの DigiKey `parameters` 配列を用意する。

- **統合 product JSON がある場合**: `products/{partId}.json` を読み、`digiKeyParameters` を Target/Candidate の parameters として使う。DigiKeyパラメータID（`name`）で両者を突き合わせ、共通して存在するパラメータの比較リストを作成する。
- **統合 product が無い場合**: 類似品検索APIのレスポンスの `targetProduct.parameters` と `candidates[].parameters` を用いる。DigiKeyパラメータID（`name`）で両者を突き合わせ、共通して存在するパラメータの比較リストを作成する。

### Step 2: LLM入力用JSONの構築

`similarity-config` のDigiKeyパラメータ定義を参照し、比較対象を以下の形式で構築する:

```json
[
  {
    "parameterId": "Capacitance",
    "description": "静電容量",
    "targetValue": "1 µF",
    "candidateValue": "1 µF"
  },
  {
    "parameterId": "Voltage - Rated",
    "description": "定格電圧",
    "targetValue": "6.3 V",
    "candidateValue": "10 V"
  }
]
```

片方にのみ値がある場合は `null` を設定する。両方に値がないパラメータは比較リストから除外する。

### Step 3: LLMによる類似度評価

**evaluate-similarity と完全に同一の評価プロンプトを使用する。** `app/.cursor/skills/evaluate-similarity.md` の「## 評価の原則」「## スコア基準」「## 表記揺れ」「## reasonの記載ルール」「## summary」をそのまま適用する。

- reasonは**良い例**に従う: 「同一」「表記揺れで同値」「厚さ0.8mmと0.5mmで異なる」など具体的に記載
- **悪い例**は禁止: 「要確認」「部分一致」「表記・条件の差あり」「表記差あり」など曖昧な表現

入力データ部分のみ DigiKey 用に置き換える:

```
Target ID: {{TARGET_ID}}
Candidate ID: {{CANDIDATE_ID}}

比較対象パラメータ（DigiKey API由来）:
{{INPUT_JSON}}
```

### Step 4: JSONレスポンスのパース

LLMからのレスポンスを `JSON.parse()` でパースし、`SimilarityResultSchema`（`app/_lib/datasheet/similarity-schema.ts`）でバリデーションする。

### Step 5: JSONファイルへの出力

**出力先パス**: `app/_lib/datasheet/similarity-results-api/{TargetID}/{CandidateID}.json`

**スキーマ**: `SimilarityResultSchema` に準拠。形式は evaluate-similarity と同じ:

```json
{
  "targetId": "GRM185R60J105KE26-01",
  "candidateId": "GRM188R60J105KA01-01",
  "evaluatedAt": "2026-01-30T12:00:00.000Z",
  "summary": "主要特性は同等",
  "parameters": [
    {
      "parameterId": "Capacitance",
      "description": "静電容量",
      "targetValue": "1 µF",
      "candidateValue": "1 µF",
      "score": 100,
      "reason": "同一"
    }
  ]
}
```

- `targetId` / `candidateId`: `digiKeyProductNumber` または `manufacturerProductNumber`（データシート基準と一貫させるため、MPNを推奨）
- `parameterId`: DigiKey の `parameters[].name`（例: "Capacitance", "Voltage - Rated"）

## 注意事項

1. **パラメータID**: DigiKey API の `name` をそのまま `parameterId` として使用する。`similarity-config` のDigiKey定義と一致させること
2. **スキーマ準拠**: 出力は `SimilarityResultSchema` に準拠すること
3. **スコア範囲**: 0-100の整数。範囲外は丸める
4. **事前評価**: 類似品検索画面でLLM結果を表示するには、事前に本スキルを実行してJSONを保存しておく必要がある
