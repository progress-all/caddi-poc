import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Vendor API Console</h1>
          <p className="text-xl text-muted-foreground">
            電子部品ベンダーAPIの疎通確認とテストを行うためのコンソールです
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mouser API</CardTitle>
              <CardDescription>
                Mouser SearchApiのエンドポイントを実行して結果を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Keyword Search - キーワードで部品を検索</li>
                <li>Part Number Search - 部品番号で部品を検索</li>
              </ul>
              <Link href="/vendor/mouser">
                <Button className="w-full">Mouser API を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digi-Key API</CardTitle>
              <CardDescription>
                DigiKey Product Information v4 APIのKeywordSearchエンドポイントを実行して結果を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Keyword Search - キーワードで部品を検索</li>
              </ul>
              <Link href="/vendor/digikey">
                <Button className="w-full">Digi-Key API を開く</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>使い方</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>左側のサイドバーからベンダーを選択します</li>
              <li>検索タブ（Keyword Search / Part Number Search）を選択します</li>
              <li>必要なパラメータを入力して「実行」ボタンをクリックします</li>
              <li>結果がJSON形式で表示されます</li>
            </ol>
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">注意事項</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  Mouser API: 環境変数 <code className="px-1 py-0.5 bg-background rounded">MOUSER_API_KEY</code> に設定してください。
                </li>
                <li>
                  DigiKey API: 環境変数 <code className="px-1 py-0.5 bg-background rounded">DIGIKEY_CLIENT_ID</code> と <code className="px-1 py-0.5 bg-background rounded">DIGIKEY_CLIENT_SECRET</code> に設定してください。
                </li>
                <li>
                  <code className="px-1 py-0.5 bg-background rounded">.env.local</code> ファイルを作成して設定します。
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
