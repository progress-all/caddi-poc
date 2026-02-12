/**
 * Datasheet PDF ダウンロード＆配置スクリプト（ローカル開発専用）
 *
 * Usage:
 *   node scripts/datasheet/download.mjs --manufacturer "Murata" --mpn "GRM185R60J105KE26"
 *   node scripts/datasheet/download.mjs --manufacturer "Texas Instruments" --mpn "LM358M" --id LM358M
 *
 * Options:
 *   --manufacturer <name> メーカー名（任意）
 *   --mpn <part number>   部品番号（必須）
 *   --id <datasheet-id>   手動で datasheet-id を指定（省略時は命名規則で自動生成）
 *   --strict               検索結果が1件でない場合は失敗
 *   --extract-text         ダウンロード後に Python でテキスト抽出（docs/datasheet/scripts/extract_pdf_text.py）
 *   --base-url <url>       API のベース URL（既定: http://localhost:3000）
 *
 * 前提: 開発サーバーを ENABLE_DATASHEET_TOOLS=1 で起動していること。
 *      例: ENABLE_DATASHEET_TOOLS=1 npm run dev
 */

import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { manufacturer: "", mpn: "", id: null, strict: false, extractText: false, baseUrl: "http://localhost:3000" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--manufacturer" && args[i + 1]) {
      out.manufacturer = args[++i];
    } else if (args[i] === "--mpn" && args[i + 1]) {
      out.mpn = args[++i];
    } else if (args[i] === "--id" && args[i + 1]) {
      out.id = args[++i];
    } else if (args[i] === "--strict") {
      out.strict = true;
    } else if (args[i] === "--extract-text") {
      out.extractText = true;
    } else if (args[i] === "--base-url" && args[i + 1]) {
      out.baseUrl = args[++i];
    }
  }
  return out;
}

function sanitizeForId(s) {
  return String(s)
    .replace(/\s+/g, "_")
    .replace(/[/\\:*?"<>|]/g, "_")
    .trim() || "unknown";
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("This script is for local development only. NODE_ENV=production is not allowed.");
    process.exit(1);
  }

  const { manufacturer, mpn, id, strict, extractText, baseUrl } = parseArgs();
  if (!mpn) {
    console.error("Usage: node scripts/datasheet/download.mjs --mpn <part number> [--manufacturer <name>] [--id <datasheet-id>] [--strict] [--base-url <url>]");
    process.exit(1);
  }

  const params = new URLSearchParams({ mpn });
  if (manufacturer) params.set("manufacturer", manufacturer);
  const url = `${baseUrl.replace(/\/$/, "")}/api/datasheet/datasheet-url?${params}`;

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error("Failed to reach API. Is the dev server running with ENABLE_DATASHEET_TOOLS=1?");
    console.error("Example: ENABLE_DATASHEET_TOOLS=1 npm run dev");
    console.error(e.message);
    process.exit(1);
  }

  if (res.status === 404) {
    console.error("Datasheet tools are not enabled. Start dev server with ENABLE_DATASHEET_TOOLS=1");
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(data.error || "API error", data.details || "");
    process.exit(1);
  }

  if (strict && data.productCount !== 1) {
    console.error(`--strict: expected exactly 1 product, got ${data.productCount ?? 0}`);
    process.exit(1);
  }

  const datasheetUrl = data.datasheetUrl;
  if (!datasheetUrl) {
    console.error("No datasheet URL found. Check manufacturer and MPN, or place PDF manually under docs/datasheet/output/<id>/<id>.pdf");
    process.exit(1);
  }

  // datasheet-id: --id 指定 > API の suggestedDatasheetId > フォールバック（MPN のみ）
  let datasheetId;
  if (id) {
    datasheetId = id;
  } else if (data.suggestedDatasheetId) {
    datasheetId = data.suggestedDatasheetId;
  } else {
    // API が suggestedDatasheetId を返せなかった場合のフォールバック
    const mfgPart = data.manufacturerName ? sanitizeForId(data.manufacturerName) : "unknown";
    datasheetId = `${mfgPart}_${sanitizeForId(mpn)}`;
    console.warn(`Warning: Could not resolve short name for manufacturer "${data.manufacturerName || "unknown"}". Using fallback ID: ${datasheetId}`);
  }

  const dir = join(PROJECT_ROOT, "docs", "datasheet", "output", datasheetId);
  const pdfPath = join(dir, `${datasheetId}.pdf`);

  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    console.error("Failed to create directory:", dir, e.message);
    process.exit(1);
  }

  console.log("Downloading PDF to", pdfPath);
  let pdfRes;
  try {
    pdfRes = await fetch(datasheetUrl, { redirect: "follow" });
  } catch (e) {
    console.error("Failed to fetch PDF:", e.message);
    process.exit(1);
  }

  if (!pdfRes.ok) {
    console.error("PDF fetch failed:", pdfRes.status, pdfRes.statusText);
    process.exit(1);
  }

  const buffer = await pdfRes.arrayBuffer();
  const view = new Uint8Array(buffer);
  const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  const isPdf = view.length >= 5 && pdfMagic.every((b, i) => view[i] === b);
  if (!isPdf) {
    console.error("Response is not a PDF (missing %PDF- header). The URL may point to an HTML redirect (e.g. manufacturer).");
    console.error("Use the UI Download at /dev/datasheet-tools (it can resolve some redirects), or open the URL in a browser and save the PDF manually to:");
    console.error("  " + pdfPath);
    process.exit(1);
  }
  await writeFile(pdfPath, Buffer.from(buffer));

  console.log("Saved:", pdfPath);
  console.log("Datasheet ID:", datasheetId);

  if (extractText) {
    const extractScript = join(PROJECT_ROOT, "docs", "datasheet", "scripts", "extract_pdf_text.py");
    const txtPath = join(dir, `${datasheetId}.txt`);
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn("python", [extractScript, pdfPath, txtPath], {
          cwd: PROJECT_ROOT,
          stdio: "pipe",
        });
        let stderr = "";
        proc.stderr?.on("data", (d) => { stderr += d; });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr || `exit ${code}`))));
      });
      console.log("Extracted text:", txtPath);
    } catch (e) {
      console.warn("Text extraction failed (PDF is saved). Run manually: python docs/datasheet/scripts/extract_pdf_text.py", pdfPath, join(dir, `${datasheetId}.txt`));
      console.warn(e.message);
    }
  }

  console.log("Next: Run /parse-datasheet in Cursor:", datasheetId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
