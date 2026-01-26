/**
 * CSVユーティリティ関数
 * Excel互換のCSV形式でエクスポートするための関数群
 */

/**
 * CSV値のエスケープ処理
 * - ダブルクォートを含む場合は二重化
 * - カンマ、改行、ダブルクォートを含む場合は全体をダブルクォートで囲む
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // カンマ、改行、ダブルクォートを含む場合はエスケープが必要
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r") ||
    stringValue.includes('"')
  ) {
    // ダブルクォートを二重化して全体をダブルクォートで囲む
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * CSV文字列を生成
 * @param headers ヘッダー行の配列
 * @param rows データ行の配列（各行は値の配列）
 * @returns CSV形式の文字列
 */
export function generateCSV(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [];

  // ヘッダー行を追加
  const escapedHeaders = headers.map(escapeCSVValue);
  lines.push(escapedHeaders.join(","));

  // データ行を追加（改行コードはCRLF）
  for (const row of rows) {
    const escapedRow = row.map(escapeCSVValue);
    lines.push(escapedRow.join(","));
  }

  return lines.join("\r\n");
}

/**
 * CSVファイルをダウンロード
 * UTF-8 with BOM形式でダウンロード（Excelでの文字化け防止）
 * @param filename ファイル名（拡張子を含む）
 * @param csvContent CSV文字列
 */
export function downloadCSV(filename: string, csvContent: string): void {
  // UTF-8 BOMを追加（Excelでの文字化け防止）
  const BOM = "\uFEFF";
  const contentWithBOM = BOM + csvContent;

  // Blobを作成（MIMEタイプ: text/csv;charset=utf-8）
  const blob = new Blob([contentWithBOM], {
    type: "text/csv;charset=utf-8;",
  });

  // ダウンロード用のURLを作成
  const url = URL.createObjectURL(blob);

  // 一時的なaタグを作成してダウンロードを実行
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // クリーンアップ
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 日付からファイル名を生成
 * @param prefix ファイル名のプレフィックス
 * @returns `{prefix}-YYYY-MM-DD.csv` 形式のファイル名
 */
export function generateCSVFilename(prefix: string = "data"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${prefix}-${year}-${month}-${day}.csv`;
}

/**
 * CSV文字列をパースしてオブジェクトの配列に変換
 * @param csvText CSV文字列
 * @returns オブジェクトの配列（ヘッダー行をキーとして使用）
 */
export function parseCSV<T extends Record<string, string>>(
  csvText: string
): T[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  // ヘッダー行を取得
  const headers = parseCSVLine(lines[0]);

  // データ行をパース
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {} as T;
    headers.forEach((header, index) => {
      row[header as keyof T] = (values[index] || "") as T[keyof T];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * CSV行をパース（ダブルクォートで囲まれた値を考慮）
 * @param line CSV行
 * @returns 値の配列
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // カンマ（クォート外）
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // 最後の値を追加
  values.push(current.trim());

  return values;
}
