---
name: evaluate-similarity-combined
description: DigiKeyパラメータとDatasheetパラメータをマージしてLLMで類似度を評価し結果をJSONに出力。Use when comparing electronic component similarity using both DigiKey and Datasheet parameters, or when the user mentions combined similarity evaluation.
---

# evaluate-similarity-combined

TargetとCandidateの**DigiKeyパラメータ**と**Datasheetパラメータ**をマージした比較リストを入力として、CursorのLLMで各パラメータの類似度を評価し、結果をJSONファイルに出力する。

## 使い方

Target ID / Candidate ID は **MPN または digiKeyProductNumber**（DigiKey系APIと同一）を使用する。

```
Target ID: GRM185R60J105KE26D (manufacturerProductNumber または digiKeyProductNumber)
Candidate ID: GRM188R60J105KA01D
出力先: app/_lib/datasheet/similarity-results-combined/{TargetID}/{CandidateID}.json
```

出力先パスは、TargetIDをディレクトリ名、CandidateIDをファイル名として使用する。
例: `app/_lib/datasheet/similarity-results-combined/GRM185R60J105KE26D/GRM188R60J105KA01D.json`

## JSON格納ルールと区別

| 系統 | ディレクトリ | targetId/candidateId | 入力データ |
|------|--------------|----------------------|------------|
| データシートのみ | `similarity-results/` | datasheet_id（MPN） | データシートJSONの parameters |
| DigiKeyのみ | `similarity-results-api/` | MPN または digiKeyProductNumber | DigiKey API の parameters |
| **DigiKey+Datasheet** | **`similarity-results-combined/`** | **MPN または digiKeyProductNumber** | **DigiKey + Datasheet をマージ** |

API: `/api/similarity-results-combined?targetId=...` で本系統の結果を取得する。

## ワークフロー

### Step 1: 入力データの準備

**統合 product JSON がある場合（推奨）**

- `app/_lib/datasheet/products/{partId}.json` を Target と各 Candidate の partId で読み、**`digiKeyParameters` と `datasheetParameters` をマージしたもの**を入力とする。類似品検索画面で「統合データをローカルに保存」した後に利用できる。DigiKey のみの評価では `digiKeyParameters` だけ、結合評価では両方を使う。

**統合 product が無い場合**

- **DigiKey parameters**: 類似品検索API（`searchSimilarProducts`）のレスポンスの `targetProduct.parameters` と `candidates[].parameters`、または事前にエクスポートしたJSON。形式: `Array<{name: string, value: string}>`（DigiKey Product Details API の `parameters`）
- **Datasheet parameters**: `app/_lib/datasheet/data/*.json` の `parameters`（`Record<paramId, { description, value }>`）。datasheet_id の紐付け: 対象部品の `datasheetUrl` からファイル名（.pdf 除去）を抽出するか、MPN で `data/{MPN}.json` や `data/{datasheet_id}.json` を参照する。

### Step 2: マージ比較リストの構築

DigiKey と Datasheet の共通パラメータを 1 つの配列にまとめる。**parameterId でソースを区別する**。

**DigiKey の共通パラメータ**

- 両者に存在する DigiKey パラメータ（`name`）について 1 件ずつ追加する。
- `parameterId`: **`digikey:${name}`**（例: `digikey:Capacitance`, `digikey:Voltage - Rated`）
- `description`: `app/risk-assessment/_lib/similarity-config.ts` の DigiKey 定義の `displayName` を使用する。未定義の場合は `name` をそのまま使用。

**Datasheet の共通パラメータ**

- 両者の Datasheet JSON に存在するパラメータIDについて 1 件ずつ追加する。
- `parameterId`: **`datasheet:${id}`**（例: `datasheet:NominalCapacitance`, `datasheet:RatedVoltage`）
- `description`: データシートJSONの `parameters[id].description` を使用する。

**マージ後の入力JSON例**

```json
[
  {
    "parameterId": "digikey:Capacitance",
    "description": "静電容量",
    "targetValue": "1 µF",
    "candidateValue": "1 µF"
  },
  {
    "parameterId": "digikey:Voltage - Rated",
    "description": "定格電圧",
    "targetValue": "6.3 V",
    "candidateValue": "10 V"
  },
  {
    "parameterId": "datasheet:NominalCapacitance",
    "description": "公称静電容量",
    "targetValue": "1 uF",
    "candidateValue": "1 µF"
  },
  {
    "parameterId": "datasheet:RatedVoltage",
    "description": "定格電圧",
    "targetValue": "DC 6.3 V",
    "candidateValue": "DC 10 V"
  }
]
```

片方にのみ値がある場合は `null` を設定する。両方に値がないパラメータは比較リストから除外する。

### Step 3: LLMによる類似度評価

**evaluate-similarity と完全に同一の評価プロンプトを使用する。** `.cursor/skills/evaluate-similarity.md` の「評価の原則」「スコア基準」「表記揺れ」「reasonの記載ルール」「summary」をそのまま適用する。

入力データ部分のみ「DigiKey + Datasheet マージ」用に置き換える:

- `parameterId` には **`digikey:`** または **`datasheet:`** のプレフィックスが付く。LLM はこれらをそのまま出力に含めること。
- 入力JSONのプレースホルダーを、Step 2 で構築したマージ比較リストに置き換える。

```
Target ID: {{TARGET_ID}}
Candidate ID: {{CANDIDATE_ID}}

比較対象パラメータ（DigiKey + Datasheet マージ。parameterId の digikey:/datasheet: プレフィックスはそのまま出力に含めること）:
{{INPUT_JSON}}
```

#### 評価プロンプト（要約）

evaluate-similarity の評価プロンプト全文を流用する。上記「入力データ」だけ上のように書き換える。

- 評価の原則: 表記ではなく本質的な値・意味を評価する
- スコア基準: 100=完全等価, 80-99=上位互換, 50-79=条件付き代替可, 1-49=代替困難, 0=比較不能
- 表記揺れ: uF=µF, ± 10 %=±10% などは 100 点
- reason: 具体的な差分または同値の根拠を端的に。禁止:「要確認」「部分一致」「表記差あり」
- summary: 1-2文で具体的に。全パラメータ80以上なら「主要特性は同等」

#### 出力形式（LLMへの指示）

```
以下のJSON形式で出力してください。他のテキストは含めないでください。

{
  "summary": "比較結果の要約（1-2文）",
  "parameters": [
    {
      "parameterId": "digikey:Capacitance または datasheet:NominalCapacitance など（入力と同じID）",
      "description": "パラメータの説明",
      "targetValue": "Target側の値（nullの場合はnull）",
      "candidateValue": "Candidate側の値（nullの場合はnull）",
      "score": 0-100の整数,
      "reason": "判定理由（20文字以内の日本語）"
    }
  ]
}
```

### Step 4: JSONレスポンスのパース・バリデーション

LLMからのレスポンスを `JSON.parse()` でパースし、`app/_lib/datasheet/similarity-schema.ts` の `SimilarityResultSchema` でバリデーションする。

- パースエラーやバリデーションエラーが発生した場合は、エラーメッセージを記録し、処理を中断する。
- スコアが 0-100 の範囲外の場合は、最も近い範囲内の値に丸める（例: -5 → 0, 150 → 100）。

### Step 5: JSONファイルへの出力

**出力先パス**: `app/_lib/datasheet/similarity-results-combined/{TargetID}/{CandidateID}.json`

**スキーマ**: `SimilarityResultSchema` に準拠。最終オブジェクトに以下を付与して保存する:

- `targetId`: Target の MPN または digiKeyProductNumber
- `candidateId`: Candidate の MPN または digiKeyProductNumber
- `evaluatedAt`: 評価実行日時（ISO8601形式。例: `new Date().toISOString()`）
- `summary`: LLM が生成した比較結果の要約
- `parameters`: LLM が出力した配列（**parameterId は `digikey:...` / `datasheet:...` をそのまま使用**。UI の breakdown 表示でソース区別に利用するため）

出力例:

```json
{
  "targetId": "GRM185R60J105KE26D",
  "candidateId": "GRM188R60J105KA01D",
  "evaluatedAt": "2026-02-02T12:00:00.000Z",
  "summary": "主要特性は同等",
  "parameters": [
    {
      "parameterId": "digikey:Capacitance",
      "description": "静電容量",
      "targetValue": "1 µF",
      "candidateValue": "1 µF",
      "score": 100,
      "reason": "同一"
    },
    {
      "parameterId": "datasheet:NominalCapacitance",
      "description": "公称静電容量",
      "targetValue": "1 uF",
      "candidateValue": "1 µF",
      "score": 100,
      "reason": "表記揺れで同値"
    }
  ]
}
```

## 注意事項

1. **parameterId**: 出力JSONの `parameters[].parameterId` は入力と同じ **`digikey:...` / `datasheet:...`** をそのまま使用する。UI で「使用した情報ソース」を区別するために必要。
2. **スキーマ準拠**: 出力は `SimilarityResultSchema` に準拠すること。
3. **スコア範囲**: 0-100 の整数。範囲外は丸める。
4. **事前評価**: 類似品検索画面で「DigiKey+Datasheet」のスコア内訳を表示するには、本スキルを実行して JSON を `similarity-results-combined/` に保存しておく必要がある。
5. **値の欠損**: 片方にのみパラメータが存在する場合は、該当する `targetValue` または `candidateValue` を `null` として扱う。
