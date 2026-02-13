import { notFound } from "next/navigation";
import { isDatasheetToolsEnabled } from "@/app/_lib/datasheet/dev-guard";

/**
 * /dev/* はローカル開発専用。ENABLE_DATASHEET_TOOLS が有効でない場合は 404。
 */
export default function DevLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isDatasheetToolsEnabled()) {
    notFound();
  }
  return (
    <div className="min-h-screen p-4">
      <header className="mb-4 border-b pb-2">
        <h1 className="text-lg font-semibold text-muted-foreground">
          開発ツール（ローカル専用）
        </h1>
      </header>
      {children}
    </div>
  );
}
