# parse-datasheet 仕様書

データシートPDFからパラメータを抽出する処理の仕様。カテゴリ固定のマスタースキーマに依存せず、**PDF → スキーマ生成 → 抽出 → JSON** の2段階フローで任意の部品に対応する。

## 設計方針

- **PDFファースト**: 入力は常に「datasheet-id + PDF」。カテゴリ固定のマスタースキーマには依存しない。
- **2段階フロー**: (A) Schema Generate（PDFからそのPDF用スキーマを生成）→ (B) Parse（PDF + スキーマで抽出→JSON）。段階を分離し、スキーマを明示的に扱う。
- **スキーマのスコープ**: スキーマは「そのPDF専用」。`schema_id` で datasheet-id 等と紐づけ、再利用は任意。
- **欠損・理由の扱い**: 抽出結果では取れない項目は `null` とし、任意で `notes` に理由を残す。
- **既存MLCCスキーマ**: `docs/datasheet/params/params-schema.yaml` は「MLCCの参考例」として残す。必須入力ではない。
- **PoC最小**: 運用が回る最小構成。`inferred_category` が unknown、`unit` 省略可など仮置きでよい。

---

## 処理フロー

### A. Schema Generate（スキーマ生成）

| 項目 | 内容 |
|------|------|
| 入力 | datasheet-id（任意の識別子）、PDF |
| 出力 | そのPDF専用の parameter schema（JSON または YAML） |

出力スキーマに含める最小項目:

- `schema_id`: datasheet-id 等
- `inferred_category`: 推定カテゴリ（不明なら `"unknown"`）
- `parameters`: `[{ id, label, description, unit(optional), extraction_hint, required(optional) }]`

スキーマ形式の詳細は `docs/datasheet/params/generic-schema.template.yaml` を参照。

### B. Parse（抽出）

| 項目 | 内容 |
|------|------|
| 入力 | PDF、スキーマ（Aの出力） |
| 出力 | 抽出結果JSON（parameters を埋めたもの） |

取れない項目は `value: null` とし、理由を `notes` に任意で残す。抽出結果の形式は `docs/datasheet/templates/generic-extraction-result.template.json` を参照。

---

## ファイル配置

```
docs/datasheet/
├── params/
│   ├── params-schema.yaml              # MLCC参考例（必須ではない）
│   ├── generic-schema.template.yaml    # 汎用スキーマ雛形
│   └── extraction-hint-guide.md        # extraction_hint の書き方ガイド
├── templates/
│   └── generic-extraction-result.template.json  # 抽出結果JSON雛形
├── parse-datasheet-spec.md             # 本仕様書
├── scripts/
│   └── extract_pdf_text.py            # PDF→テキスト抽出
└── output/                             # 各データシートの出力
    └── <datasheet-id>/
        ├── <datasheet-id>.pdf
        ├── <datasheet-id>.txt
        ├── <datasheet-id>.schema.yaml  # 生成されたスキーマ
        ├── <datasheet-id>.csv
        ├── <datasheet-id>.json
        └── <datasheet-id>.validation.md  # バリデーション結果
```

---

## スキーマ形式（要約）

- **汎用スキーマ雛形**: `docs/datasheet/params/generic-schema.template.yaml`
- **parameter id**: 英数字とアンダースコアのみ。推奨 `Section_SubSection_ParamName`。同一PDF内で一意。
- **extraction_hint**: 表名・章・キーワード等。詳細は `docs/datasheet/params/extraction-hint-guide.md`。

---

## 抽出結果形式（要約）

- **雛形**: `docs/datasheet/templates/generic-extraction-result.template.json`
- **parameters**: キーはスキーマの `id`。`description`, `value`（欠損時は `null`）, `unit`（任意）。
- **notes**: 任意。欠損理由などを `["param_id: 理由"]` の形で列挙可能。

---

## 参考

- スキル説明（エージェント向け）: `.cursor/skills/parse-datasheet.md`
- MLCC用パラメータ例: `docs/datasheet/params/params-schema.yaml`
