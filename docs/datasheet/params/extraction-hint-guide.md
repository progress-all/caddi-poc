# extraction_hint の書き方ガイド

スキーマの各パラメータに付与する `extraction_hint` は、LLMがデータシートから値を抽出する際の手がかりとなる。以下の要点を組み合わせて短文で書く。

## 表名・セクション

どの表・どの章から取るかを明示する。

- 例: 「Page 1 - Type & Dimensions の L 寸法を抽出」
- 例: 「Rated value セクションの定格電圧を抽出」

## キーワード

データシート内で検索すると見つかりやすい用語を入れる。

- 例: 「Rated voltage」「Operating temperature」「Nominal capacitance」

## 文脈（列名・行名・単位）

同じ表の列名・行名、単位の記載場所を書くと曖昧さが減る。

- 例: 「Specifications 表の 'Test voltage' 列から抽出」
- 例: 「単位は °C、範囲は 'to' 表記。補足があれば括弧で残す」

## 曖昧さの解消

似た名前の項目が複数ある場合は、条件・グレード・適用範囲を書く。

- 例: 「AD620B grade, VS=±5V to ±15V のときの値」
- 例: 「Temperature Compensating Type と High Dielectric Constant Type で異なる場合は両方記載」

## 雛形での使い方

`generic-schema.template.yaml` の各 parameter の `extraction_hint` には、上記を組み合わせた短文を書く。そのPDFの構成（ページ番号・セクション名・表の見出し）に合わせて具体的に書くほど、抽出精度が上がる。
