# API型自動生成ガイド

## 概要

このプロジェクトでは、Mouser APIとDigiKey APIのTypeScript型を、公式のOpenAPI（Swagger）仕様から自動生成しています。これにより、API仕様と型定義の整合性を保ち、型安全性を確保しています。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                         Input                                    │
├─────────────────────────────────────────────────────────────────┤
│  docs/mouser-openapi-v1-spec.json      (Swagger 2.0)            │
│  docs/digikey-openapi-v4-ProductSearch-spec.json  (Swagger 2.0) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ npm run convert:swagger
┌─────────────────────────────────────────────────────────────────┐
│                   Intermediate (OpenAPI 3.0)                     │
├─────────────────────────────────────────────────────────────────┤
│  docs/mouser-openapi-v3-spec.json                               │
│  docs/digikey-openapi-v3-spec.json                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ npm run generate:api-types
┌─────────────────────────────────────────────────────────────────┐
│                    Output (TypeScript型)                         │
├─────────────────────────────────────────────────────────────────┤
│  app/_lib/vendor/mouser/types.generated.ts                      │
│  app/_lib/vendor/digikey/types.generated.ts                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ import
┌─────────────────────────────────────────────────────────────────┐
│                    Application Code                              │
├─────────────────────────────────────────────────────────────────┤
│  types.ts    - 型のエイリアスとカスタム型                         │
│  client.ts   - サーバーサイドAPIクライアント                      │
│  api.ts      - フロントエンド用API関数                           │
└─────────────────────────────────────────────────────────────────┘
```

## 使用ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| `openapi-typescript` | ^7.10.1 | OpenAPI 3.0 → TypeScript型生成 |
| `swagger2openapi` | ^7.0.8 | Swagger 2.0 → OpenAPI 3.0変換 |

## ファイル構成

### 入力ファイル（docs/）

| ファイル | 形式 | 説明 |
|---------|------|------|
| `mouser-openapi-v1-spec.json` | Swagger 2.0 | Mouser APIの公式仕様 |
| `digikey-openapi-v4-ProductSearch-spec.json` | Swagger 2.0 | DigiKey APIの公式仕様 |
| `mouser-openapi-v3-spec.json` | OpenAPI 3.0 | 変換後（自動生成） |
| `digikey-openapi-v3-spec.json` | OpenAPI 3.0 | 変換後（自動生成） |

### 出力ファイル（app/_lib/vendor/）

```
vendor/
├── mouser/
│   ├── types.generated.ts   # 自動生成（約1,800行）- 編集禁止
│   ├── types.ts             # エイリアスとカスタム入力型
│   ├── client.ts            # MouserApiClient クラス
│   └── api.ts               # searchByKeyword() 等のフロントエンド関数
└── digikey/
    ├── types.generated.ts   # 自動生成（約3,000行）- 編集禁止
    ├── types.ts             # エイリアスとカスタム入力型
    ├── client.ts            # DigiKeyApiClient クラス
    └── api.ts               # searchByKeyword() 等のフロントエンド関数
```

## 生成される型の構造

`types.generated.ts` には以下の3つの主要な型が含まれます：

### 1. paths - APIエンドポイント

```typescript
export interface paths {
    "/api/v{version}/search/keyword": {
        post: operations["SearchApi_SearchByKeyword"];
    };
    "/api/v{version}/search/partnumber": {
        post: operations["SearchApi_SearchByPartNumber"];
    };
}
```

### 2. components - スキーマ（データモデル）

```typescript
export interface components {
    schemas: {
        MouserPart: {
            Availability?: string;
            DataSheetUrl?: string;
            Description?: string;
            Manufacturer?: string;
            ManufacturerPartNumber?: string;
            MouserPartNumber?: string;
            PriceBreaks?: components["schemas"]["Pricebreak"][];
            // ... 全プロパティが定義
        };
        SearchResponseRoot: {
            Errors?: components["schemas"]["ErrorEntity"][];
            SearchResults?: components["schemas"]["SearchResponse"];
        };
    };
}
```

### 3. operations - APIオペレーション詳細

```typescript
export interface operations {
    SearchApi_SearchByKeyword: {
        parameters: {
            query: { apiKey: string };
            path: { version: string };
        };
        requestBody: { ... };
        responses: {
            200: {
                content: {
                    "application/json": components["schemas"]["SearchResponseRoot"];
                };
            };
        };
    };
}
```

## 使用方法

### 型のインポート

```typescript
// 方法1: types.generated.ts から直接
import type { components } from "./types.generated";
type MouserPart = components["schemas"]["MouserPart"];

// 方法2: types.ts のエイリアスを使用（推奨）
import type { MouserPart, MouserSearchResponseRoot } from "./types";
```

### client.ts での使用例

```typescript
import type { components } from "./types.generated";

export type MouserSearchResponseRoot = components["schemas"]["SearchResponseRoot"];

export class MouserApiClient {
  async searchByKeyword(request: MouserKeywordSearchInput): Promise<MouserSearchResponseRoot> {
    // 型安全なAPIレスポンス
  }
}
```

## コマンド

### 型の再生成

API仕様が更新された場合：

```bash
# 1. Swagger 2.0 → OpenAPI 3.0 変換
npm run convert:swagger

# 2. TypeScript型を生成
npm run generate:api-types

# または両方を実行（仕様ファイルが既にOpenAPI 3.0の場合）
npm run generate:api-types
```

### 個別生成

```bash
# Mouserのみ
npm run generate:mouser-types

# DigiKeyのみ
npm run generate:digikey-types
```

## 注意事項

### やってはいけないこと

1. **`types.generated.ts` を直接編集しない**
   - 次回の再生成で上書きされます
   - カスタム型は `types.ts` に追加してください

2. **手動でAPI型を定義しない**
   - 自動生成された型を使用してください
   - API仕様との乖離を防げます

### やるべきこと

1. **API仕様が更新されたら型を再生成する**
2. **カスタムの入力型は `types.ts` に定義する**
3. **後方互換性が必要な場合は型エイリアスを使用する**

## トラブルシューティング

### openapi-typescript がSwagger 2.0をサポートしない

`openapi-typescript` v7.x はSwagger 2.0を直接サポートしていません。先に `swagger2openapi` で変換してください：

```bash
npm run convert:swagger
```

### 型が見つからない

生成された型は `components["schemas"]["TypeName"]` でアクセスします：

```typescript
// 正しい
type Product = components["schemas"]["Product"];

// 間違い（直接エクスポートされていない）
import { Product } from "./types.generated";  // エラー
```

### ビルドエラーが発生する

キャッシュをクリアして再ビルド：

```bash
rm -rf .next
npm run build
```
