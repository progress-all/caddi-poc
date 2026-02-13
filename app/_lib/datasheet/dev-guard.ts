/**
 * データシートツール（Download/簡易UI）のローカル限定ガード
 *
 * 本番・Vercel では無効化。開発環境ではデフォルトで有効（明示的に無効化する場合のみ ENABLE_DATASHEET_TOOLS=0）。
 */

/**
 * データシートツール（Datasheet URL 取得 API、Download API、簡易UI）が
 * 利用可能かどうかを判定する。
 *
 * - NODE_ENV !== "development" のとき: 常に false（本番では無効）
 * - NODE_ENV === "development" のとき: ENABLE_DATASHEET_TOOLS が "0" または "false" でなければ true
 *   （何も設定しなくても npm run dev で /dev/datasheet-tools にアクセス可能）
 */
export function isDatasheetToolsEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  const flag = process.env.ENABLE_DATASHEET_TOOLS;
  return flag !== "0" && flag !== "false";
}
