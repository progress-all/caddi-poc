# parse-datasheet

電子部品のデータシートPDFを解析し、構造化されたパラメータCSV/JSONを生成するスキル。
あらゆる部品種別（コンデンサ、ダイオード、MOSFET、IC、コネクタ等）に対応する。

## 呼び出し方

```
/parse-datasheet <datasheet-id> @<pdf-file>
```

### 引数

- `<datasheet-id>`: データシートの識別子 (例: `ST_1N5822`, `Infineon_IRLZ44NSTRR`)
- `@<pdf-file>`: 解析対象のPDFファイル

### 例

```
/parse-datasheet ST_1N5822 @path/to/ST_1N5822.pdf
/parse-datasheet Infineon_IRLZ44NSTRR @path/to/datasheet.pdf
```

## 処理フロー

### Step 1: ディレクトリ作成とPDF配置

```bash
mkdir -p docs/datasheet/output/<datasheet-id>
cp <pdf-file> docs/datasheet/output/<datasheet-id>/<datasheet-id>.pdf
```

### Step 2: PDFからテキスト抽出

```bash
python docs/datasheet/scripts/extract_pdf_text.py \
  docs/datasheet/output/<datasheet-id>/<datasheet-id>.pdf \
  docs/datasheet/output/<datasheet-id>/<datasheet-id>.txt
```

### Step 2.5: PDFから表構造抽出

テキスト抽出とは別に、PDF内の表（テーブル）を構造化データとして抽出する。
フラットテキストでは失われる行列関係（Min/Max/Typ/Unit の列対応等）を保持する。

```bash
python docs/datasheet/scripts/extract_tables.py \
  docs/datasheet/output/<datasheet-id>/<datasheet-id>.pdf \
  docs/datasheet/output/<datasheet-id>/<datasheet-id>.tables.json
```

このステップは失敗しても後続処理に影響しない（テーブルJSONが無い場合はフラットテキストのみで抽出を行う）。
テーブルJSONが生成された場合は **Step 3（スキーマ生成）と Step 4（パラメータ抽出）の両方** で参照される。

出力:
```
docs/datasheet/output/<datasheet-id>/<datasheet-id>.tables.json
```

出力例:
```json
{
  "pdf_path": "ST_1N5822.pdf",
  "method": "pdfplumber",
  "total_tables": 3,
  "tables": [
    {
      "page": 1,
      "title": "Table 1. Absolute ratings",
      "headers": ["Symbol", "Parameter", "Value", "Unit"],
      "rows": [
        {"Symbol": "VRRM", "Parameter": "Repetitive peak reverse voltage", "Value": "40", "Unit": "V"}
      ],
      "quality_score": 0.85,
      "method": "pdfplumber"
    }
  ]
}
```

### Step 3: パラメータスキーマ生成 ★新設

抽出テキストと表構造データを読み込み、この部品固有のパラメータスキーマを生成する。

#### 入力

1. `docs/datasheet/output/<datasheet-id>/<datasheet-id>.txt` (抽出テキスト)
2. `docs/datasheet/params/generic-schema.template.yaml` (フォーマット定義)
3. `docs/datasheet/output/<datasheet-id>/<datasheet-id>.tables.json` (表構造データ、存在する場合のみ)

#### 生成ルール

テーブルJSON (`<datasheet-id>.tables.json`) が存在する場合は以下のプロンプトを使用する:

```
あなたは電子部品のデータシート解析の専門家です。
以下のデータシートテキストと表構造データを分析し、この部品固有の抽出パラメータスキーマを
YAML形式で生成してください。

【フォーマット】
docs/datasheet/params/generic-schema.template.yaml に準拠すること。
各パラメータは以下のフィールドを持つ:
  - id: パラメータID (PascalCase_Snake形式, スキーマ内で一意)
  - label: 日本語ラベル
  - description: パラメータの説明
  - unit: 単位 (該当なしは空文字 "")
  - extraction_hint: データシート内の具体的なセクション名・表名・行の位置
  - required: true (データシートに記載があるはず) / false (条件次第)

【生成ルール】
1. このデータシートに実際に記載されている情報のみに基づいてパラメータを選定すること
2. パラメータ数は 15〜50 項目程度を目安とすること
3. 以下のセクションを網羅的にカバーすること:
   - 基本情報 (型名, パッケージ, 製品タイプ)
   - Absolute Maximum Ratings (最大定格)
   - Electrical Characteristics (電気的特性)
   - Thermal Characteristics (熱特性)
   - Package / Dimensions (パッケージ寸法)
   - Ordering Information (梱包・発注情報)
4. 各パラメータの extraction_hint には、データシート内の具体的な
   セクション名・表名・行の位置を記載すること
5. データシートに確実に記載されているパラメータには required: true、
   記載がある可能性が低い/条件次第のものには required: false を設定すること
6. 既存のカテゴリ別スキーマや参考例に制約されず、
   データシートの内容から自由にパラメータを選定すること
7. 【重要】表構造データの活用ルール:
   - 表構造データ (tables.json) にはPDFから抽出されたテーブルの行列構造が格納されている
   - 各テーブルの headers (列名) と rows (行データ) を確認し、
     どのパラメータがどの表のどの列に存在するかを正確に把握すること
   - 特に Min/Max/Typ/Unit のように複数列に分かれた値は、
     extraction_hint にテーブルのタイトルと列名を明記すること
     (例: extraction_hint: "Table 4. Static electrical characteristics の Typ. 列と Max. 列")
   - quality_score が 0.6 未満のテーブルは信頼性が低いため参考程度とすること
   - フラットテキストで列の対応が不明瞭な場合は、表構造データを信頼すること

【表構造データ】
{<datasheet-id>.tables.json の内容}

【データシートテキスト】
{<datasheet-id>.txt の内容}
```

テーブルJSONが存在しない場合は従来どおりフラットテキストのみでスキーマを生成する:

```
あなたは電子部品のデータシート解析の専門家です。
以下のデータシートテキストを分析し、この部品固有の抽出パラメータスキーマを
YAML形式で生成してください。

【フォーマット】
docs/datasheet/params/generic-schema.template.yaml に準拠すること。
各パラメータは以下のフィールドを持つ:
  - id: パラメータID (PascalCase_Snake形式, スキーマ内で一意)
  - label: 日本語ラベル
  - description: パラメータの説明
  - unit: 単位 (該当なしは空文字 "")
  - extraction_hint: データシート内の具体的なセクション名・表名・行の位置
  - required: true (データシートに記載があるはず) / false (条件次第)

【生成ルール】
1. このデータシートに実際に記載されている情報のみに基づいてパラメータを選定すること
2. パラメータ数は 15〜50 項目程度を目安とすること
3. 以下のセクションを網羅的にカバーすること:
   - 基本情報 (型名, パッケージ, 製品タイプ)
   - Absolute Maximum Ratings (最大定格)
   - Electrical Characteristics (電気的特性)
   - Thermal Characteristics (熱特性)
   - Package / Dimensions (パッケージ寸法)
   - Ordering Information (梱包・発注情報)
4. 各パラメータの extraction_hint には、データシート内の具体的な
   セクション名・表名・行の位置を記載すること
5. データシートに確実に記載されているパラメータには required: true、
   記載がある可能性が低い/条件次第のものには required: false を設定すること
6. 既存のカテゴリ別スキーマや参考例に制約されず、
   データシートの内容から自由にパラメータを選定すること

【データシートテキスト】
{<datasheet-id>.txt の内容}
```

#### 出力

```
docs/datasheet/output/<datasheet-id>/<datasheet-id>.schema.yaml
```

生成されたスキーマは必ず保存し、次のステップで使用する。

### Step 4: スキーマ準拠パラメータ抽出

Step 3 で生成したスキーマに沿って、データシートテキストからパラメータ値を抽出する。

#### 入力

1. `docs/datasheet/output/<datasheet-id>/<datasheet-id>.txt` (抽出テキスト)
2. `docs/datasheet/output/<datasheet-id>/<datasheet-id>.schema.yaml` (Step 3 で生成したスキーマ)
3. `docs/datasheet/output/<datasheet-id>/<datasheet-id>.tables.json` (表構造データ、存在する場合のみ)

#### 抽出プロンプト

テーブルJSON (`<datasheet-id>.tables.json`) が存在する場合は以下のプロンプトを使用する:

```
以下のスキーマに定義されたパラメータを、データシートテキストおよび表構造データから抽出してください。

【スキーマ】
{<datasheet-id>.schema.yaml の内容}

【抽出ルール】
1. スキーマに定義されたパラメータIDと完全に一致するキーで出力すること
2. スキーマに存在しないパラメータは出力しないこと
3. データシートに記載がないパラメータは以下のように出力すること:
   - value: "N/A"
   - description の末尾に " (データシートに記載なし)" を付記
4. 値の正規化ルール:
   - 単位は原文のまま保持 (mm, V, °C, %, Ω·F など)
   - 範囲は "to" で表現 (例: "-40 to 85 °C")
   - 許容差は "±" で表現 (例: "± 10%")
   - 非対称許容差は "+X/-Y" で表現 (例: "+0/-0.1")
   - typ/min/max が存在する場合は一つの value にまとめる
     (例: "0.5 typ / 1.0 max nA")
5. 【重要】表構造データの優先ルール:
   - 表構造データ (tables.json) には PDF から抽出されたテーブルの行列構造が格納されている
   - 各テーブルの headers (列名) と rows (行データ) の対応関係に従い、
     列の対応を正確に保持すること
   - quality_score が 0.6 以上のテーブルの値は、フラットテキストよりも優先すること
   - フラットテキストと表構造データで値が異なる場合は、表構造データの値を採用すること
   - 特に Min/Max/Typ の列がある場合:
     - rows 内の各行で、"Min" キーの値が Min 値、"Max" キーの値が Max 値、
       "Typ" キーの値が Typ 値であることを確認し、value にまとめること
       (例: rows に {"Typ. 80": "0.462", "Max. 300": "0.57"} とあれば
        → value: "0.462 typ / 0.57 max V")
     - ヘッダーに初期値が混入している場合がある（例: "Typ. 80" の "80" 部分）。
       ヘッダーの数値部分は無視し、列の意味（Typ/Max/Min）だけを参照すること
   - quality_score が 0.6 未満のテーブルは信頼性が低いため、
     フラットテキスト側の値を優先すること

【表構造データ】
{<datasheet-id>.tables.json の内容}

【データシートテキスト】
{<datasheet-id>.txt の内容}
```

テーブルJSONが存在しない場合は従来どおりフラットテキストのみで抽出する:

```
以下のスキーマに定義されたパラメータを、データシートテキストから抽出してください。

【スキーマ】
{<datasheet-id>.schema.yaml の内容}

【抽出ルール】
1. スキーマに定義されたパラメータIDと完全に一致するキーで出力すること
2. スキーマに存在しないパラメータは出力しないこと
3. データシートに記載がないパラメータは以下のように出力すること:
   - value: "N/A"
   - description の末尾に " (データシートに記載なし)" を付記
4. 値の正規化ルール:
   - 単位は原文のまま保持 (mm, V, °C, %, Ω·F など)
   - 範囲は "to" で表現 (例: "-40 to 85 °C")
   - 許容差は "±" で表現 (例: "± 10%")
   - 非対称許容差は "+X/-Y" で表現 (例: "+0/-0.1")
   - typ/min/max が存在する場合は一つの value にまとめる
     (例: "0.5 typ / 1.0 max nA")

【データシートテキスト】
{<datasheet-id>.txt の内容}
```

### Step 5: バリデーション

抽出結果を以下の観点で検証し、問題があれば修正する:

1. **網羅性チェック**: スキーマの全 `required: true` パラメータが JSON に値付き (value ≠ "N/A") で存在するか
2. **N/A 集計**: "N/A" の項目数と割合を集計
3. **単位チェック**: `unit` が定義されているパラメータの value に妥当な単位が含まれているか
4. **ID一致チェック**: JSON のキーがスキーマの id と完全一致しているか

バリデーション結果を以下に保存:

```
docs/datasheet/output/<datasheet-id>/<datasheet-id>.validation.md
```

フォーマット:

```markdown
# バリデーション結果: <datasheet-id>

## サマリー
- スキーマ定義パラメータ数: XX
- 抽出成功: XX (XX%)
- N/A (記載なし): XX (XX%)
- required パラメータの欠損: XX

## N/A パラメータ一覧
| param_id | label | 理由 |
|----------|-------|------|
| ... | ... | データシートに記載なし |

## 注意事項
- (もしあれば)
```

### Step 6: CSV/JSON出力 & フロントエンド配置

バリデーション通過後、抽出結果を以下の2形式で保存し、フロントエンド参照ディレクトリにも自動配置する:

#### CSV出力

```
docs/datasheet/output/<datasheet-id>/<datasheet-id>.csv
```

フォーマット:
```csv
param_id,description,value,status
Part_Number,型名,1N5822,extracted
VRRM,繰り返しピーク逆電圧,40 V,extracted
ESD_Rating,ESD耐性,N/A,not_available
```

#### JSON出力

```
docs/datasheet/output/<datasheet-id>/<datasheet-id>.json
```

フォーマット:
```json
{
  "datasheet_id": "ST_1N5822",
  "version": "1.0",
  "schema_id": "ST_1N5822",
  "inferred_category": "schottky_diode",
  "parameters": {
    "Part_Number": {
      "description": "型名",
      "value": "1N5822",
      "status": "extracted"
    },
    "VRRM": {
      "description": "繰り返しピーク逆電圧",
      "value": "40 V",
      "status": "extracted"
    },
    "ESD_Rating": {
      "description": "ESD耐性",
      "value": "N/A",
      "status": "not_available"
    }
  }
}
```

#### フロントエンド参照ディレクトリへの自動コピー

JSON出力後、同じJSONファイルをフロントエンド参照ディレクトリにもコピーする。

```bash
mkdir -p app/_lib/datasheet/data
cp docs/datasheet/output/<datasheet-id>/<datasheet-id>.json app/_lib/datasheet/data/<datasheet-id>.json
```

> **注意**: Vercel Blob（ファイルストレージ）を未導入のため、LLMで生成したJSONをバックエンドに動的に保存できない。
> そのため `app/_lib/datasheet/data/` (Git管理下) に直接配置し、コミット・デプロイに含める運用とする。

## 出力ファイル構造

```
docs/datasheet/output/<datasheet-id>/
├── <datasheet-id>.pdf             # 元PDF
├── <datasheet-id>.txt             # 抽出テキスト (Step 2)
├── <datasheet-id>.tables.json     # 表構造データ (Step 2.5)
├── <datasheet-id>.schema.yaml     # 生成スキーマ (Step 3)
├── <datasheet-id>.csv             # パラメータCSV (Step 6)
├── <datasheet-id>.json            # パラメータJSON (Step 6)
└── <datasheet-id>.validation.md   # バリデーション結果 (Step 5)

app/_lib/datasheet/data/
└── <datasheet-id>.json            # フロントエンド参照用 (Step 6 で自動コピー)
```

## 参考ファイル

- スキーマテンプレート: `docs/datasheet/params/generic-schema.template.yaml` (フォーマット定義)
- テキスト抽出スクリプト: `docs/datasheet/scripts/extract_pdf_text.py`
- 表構造抽出スクリプト: `docs/datasheet/scripts/extract_tables.py`
- 既存の抽出例: `docs/datasheet/output/ST_1N5822/`, `docs/datasheet/output/Infineon_IRLZ44NSTRR/`
