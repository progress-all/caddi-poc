---
name: evaluate-similarity
description: 2つのデータシートJSONファイルからLLMで類似度を評価し結果をJSONに出力。Use when comparing electronic component datasheets, evaluating similarity between parts, or when the user mentions datasheet comparison or similarity evaluation.
---

# evaluate-similarity

2つのデータシートJSONファイル（Target, Candidate）を入力として、CursorのLLMで各パラメータの類似度を評価し、結果をJSONファイルに出力する。

## 使い方

2つのデータシートJSONファイルのパスを指定して実行:

```
Target JSON: app/_lib/datasheet/data/GRM185R60J105KE26-01.json
Candidate JSON: app/_lib/datasheet/data/GRM188R60J105KA01-01.json
出力先: app/_lib/datasheet/similarity-results/{TargetID}/{CandidateID}.json
```

出力先パスは、TargetIDをディレクトリ名、CandidateIDをファイル名として使用します。
例: `app/_lib/datasheet/similarity-results/GRM185R60J105KE26-01/GRM188R60J105KA01-01.json`

## ワークフロー

### Step 1: JSONファイルの読み込み

両方のJSONファイルを読み込み、`datasheet_id` と `parameters` を抽出する。

JSON構造:
```json
{
  "datasheet_id": "GRM185R60J105KE26-01",
  "version": "1.0",
  "parameters": {
    "NominalCapacitance": {
      "description": "公称静電容量",
      "value": "1 uF"
    },
    "RatedVoltage": {
      "description": "定格電圧",
      "value": "DC 6.3 V"
    }
  }
}
```

### Step 2: 共通パラメータの抽出

両方のJSONに存在するパラメータIDを抽出し、比較対象リストを作成する。

### Step 3: LLMによる類似度評価

以下のプロンプトを使用して、各パラメータの類似度を評価し、結果をJSON形式で出力する。

#### 評価プロンプト

```
あなたは電子部品の類似品判定エキスパートです。
以下の入力データを評価し、JSON形式で結果を出力してください。

## 評価の原則

**表記ではなく本質的な値・意味を評価してください。**
データシートの表記は製造元によって異なりますが、同じ意味・同じ値を示している場合は100点（完全等価）としてください。

## スコア基準

- 100: 完全等価（以下を含む）
  - 文字列が同一
  - 表記揺れのみで本質的に同値
  - 数学的・論理的に同値
- 80-99: 上位互換・実用上問題なし
- 50-79: 条件付きで代替可能（本質的な値の差異あり）
- 1-49: 代替困難
- 0: 比較不能（値欠損など）

## 表記揺れ（100点とする）の例

以下は全て「完全等価」として100点とする：
- 単位記号の違い: `uF` = `µF`, `ohm` = `Ω`
- 空白・スペースの有無: `± 10 %` = `±10%`, `Within ± 7.5%` = `Within ±7.5%`
- 符号の表記: `-15 to 15` = `−15 to +15`（マイナス記号のUnicode差も含む）
- 範囲表現の同値: `Within ± X%` = `≤ ± X%` = `≤ ±X%`（数学的に同義）
- 合否判定の言い換え: `No defects or abnormalities.` = `No problem observed` = `No visual defects` = `No breakdown or visual defects`
- 区切り文字: `PAPER W8P4 / 4000 pcs./Reel` = `PAPER W8P4, 4000 pcs./Reel`
- 括弧内の補足情報の有無: `250% of the rated voltage` = `250% of the rated voltage (High dielectric constant type)`
- 対象範囲の補足の有無: `1.0 ± 0.1 kHz` = `1.0 ± 0.1 kHz (C ≦ 10 μF)`
- 温度特性コードの有無: `Within ± 15%` = `R6: Within ± 15%`（同じ温度特性を示す場合）

## reasonの記載ルール

- **具体的な差分または同値の根拠**を端的に記載する
- 禁止表現: 「要確認」「部分一致」「表記差あり」など曖昧な表現
- 良い例:
  - 「同一」
  - 「表記揺れで同値」
  - 「tanδが0.05と0.1で異なる」
  - 「厚さ0.8mmと0.5mmで異なる」
  - 「充電時間2分と1分で異なる」
- 悪い例:
  - 「表記・条件の差あり要確認」
  - 「部分一致」
  - 「表記差のみ実質同等」（この場合は100点にして「表記揺れで同値」とする）

## summary（比較結果の要約）

summaryには、代替品として使用する際に**注意が必要な差分のみ**を記載してください。

### 記載基準
- スコア50未満のパラメータがある場合: その差分を具体的に記載
- 全パラメータがスコア80以上: 「主要特性は同等」と簡潔に記載
- サイズ違いや定格不足など、代替時にクリティカルな差分を優先

### 例
- 全パラメータ80以上: "主要特性は同等"
- サイズ違いあり: "サイズ(1608→2012)が異なり基板フットプリント変更が必要"
- 定格電圧不足: "定格電圧が不足(10V→6.3V)、使用条件を要確認"
- 温度範囲が狭い: "動作温度範囲が狭い(-55〜105℃→-40〜85℃)"

## 入力データ

Target ID: {{TARGET_ID}}
Candidate ID: {{CANDIDATE_ID}}

比較対象パラメータ:
{{INPUT_JSON}}

## 出力形式

以下のJSON形式で出力してください。他のテキストは含めないでください。

{
  "summary": "比較結果の要約（1-2文）",
  "parameters": [
    {
      "parameterId": "パラメータID",
      "description": "パラメータの説明",
      "targetValue": "Target側の値（nullの場合はnull）",
      "candidateValue": "Candidate側の値（nullの場合はnull）",
      "score": 0-100の整数,
      "reason": "判定理由（20文字以内の日本語）"
    }
  ]
}
```

`{{INPUT_JSON}}` の部分を、共通パラメータのJSON配列で置き換える:

```json
[
  {
    "parameterId": "NominalCapacitance",
    "description": "公称静電容量",
    "targetValue": "1 uF",
    "candidateValue": "1 µF"
  },
  {
    "parameterId": "RatedVoltage",
    "description": "定格電圧",
    "targetValue": "DC 6.3 V",
    "candidateValue": "DC 10 V"
  }
]
```

### Step 4: JSONレスポンスのパース

LLMからのレスポンスを `JSON.parse()` でパースし、Zodスキーマ（`SimilarityResultSchema`）でバリデーションする。

パースエラーやバリデーションエラーが発生した場合は、エラーメッセージを記録し、処理を中断する。

### Step 5: JSONファイルへの出力

**出力先パス**: `app/_lib/datasheet/similarity-results/{TargetID}/{CandidateID}.json`

**スキーマ定義**: 出力形式は `app/_lib/datasheet/similarity-schema.ts` の `SimilarityResultSchema` に準拠する必要があります。

以下の形式でJSONファイルに出力する:

```json
{
  "targetId": "GRM185R60J105KE26-01",
  "candidateId": "GRM188R60J105KA01-01",
  "evaluatedAt": "2026-01-30T12:00:00.000Z",
  "summary": "主要特性は同等",
  "parameters": [
    {
      "parameterId": "NominalCapacitance",
      "description": "公称静電容量",
      "targetValue": "1 uF",
      "candidateValue": "1 µF",
      "score": 100,
      "reason": "表記揺れで同一値"
    },
    {
      "parameterId": "RatedVoltage",
      "description": "定格電圧",
      "targetValue": "DC 6.3 V",
      "candidateValue": "DC 10 V",
      "score": 95,
      "reason": "上位互換で問題なし"
    }
  ]
}
```

#### 出力フィールド説明

- `targetId`: Target側の `datasheet_id`
- `candidateId`: Candidate側の `datasheet_id`
- `evaluatedAt`: 評価実行日時（ISO8601形式）
- `summary`: 比較結果の要約文（1-2文、LLMが生成）
- `parameters`: パラメータごとの評価結果配列
  - `parameterId`: パラメータID
  - `description`: パラメータの説明（Target側から取得）
  - `targetValue`: Target側の値（`null` の場合は `null`）
  - `candidateValue`: Candidate側の値（`null` の場合は `null`）
  - `score`: 類似度スコア（0-100の整数）
  - `reason`: 判定理由（日本語、20文字以内）

## 注意事項

1. **値の欠損**: 片方または両方のJSONにパラメータが存在しない場合は、`targetValue` または `candidateValue` を `null` として扱う
2. **JSONパース**: LLMのレスポンスはJSON形式で出力され、`JSON.parse()`でパース可能である必要がある
3. **スキーマ準拠**: 出力JSONは `app/_lib/datasheet/similarity-schema.ts` の `SimilarityResultSchema` に準拠する必要がある
4. **スコア範囲**: スコアは0-100の整数である必要がある。範囲外の値が返された場合は、最も近い範囲内の値に丸める（例: -5 → 0, 150 → 100）
5. **summary**: クリティカルな差分のみ記載し、おおむね同等の場合は「主要特性は同等」と簡潔に記載する
