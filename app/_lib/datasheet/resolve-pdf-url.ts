/**
 * Datasheet URL を PDF 直リンクに解決し、PDF バッファを返す。
 * *.pdf はそのまま、TI の tsp?gotoUrl= は decode して再取得、
 * HTML の場合は .pdf リンクを抽出して取得。
 */

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

export function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < 5; i++) {
    if (view[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

export class NotPdfError extends Error {
  constructor(
    message: string,
    public readonly originalUrl: string,
    public readonly contentType?: string,
  ) {
    super(message);
    this.name = "NotPdfError";
  }
}

export class CouldNotResolvePdfError extends Error {
  constructor(message: string, public readonly originalUrl: string) {
    super(message);
    this.name = "CouldNotResolvePdfError";
  }
}

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const c = contentType.toLowerCase();
  return c.includes("text/html") || c.includes("application/xhtml");
}

function isPdfContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("application/pdf");
}

function looksLikeHtml(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 20) return false;
  const view = new Uint8Array(buffer);
  const start = String.fromCodePoint(...view.slice(0, 50));
  return (
    start.trimStart().startsWith("<") ||
    start.includes("<!DOCTYPE") ||
    start.includes("<!doctype")
  );
}

/**
 * URL のクエリから gotoUrl を取得（TI の suppproductinfo.tsp 等）
 */
function extractGotoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const gotoUrl = u.searchParams.get("gotoUrl");
    if (gotoUrl) return decodeURIComponent(gotoUrl);
    return null;
  } catch {
    return null;
  }
}

/**
 * HTML から最初の .pdf リンクを抽出（href="...*.pdf" または href='...*.pdf'）
 */
function extractPdfLinkFromHtml(html: string, baseUrl: string): string | null {
  // href="...pdf" または href='...pdf' を探す（簡易）
  const re = /href\s*=\s*["']([^"']*\.pdf[^"']*)["']/gi;
  const m = re.exec(html);
  if (!m) return null;
  let href = m[1].trim();
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

export interface ResolvePdfResult {
  buffer: ArrayBuffer;
  finalUrl: string;
}

const DEFAULT_MAX_DEPTH = 3;

/**
 * Datasheet URL を解決して PDF の ArrayBuffer を返す。
 * - *.pdf かつ Content-Type が application/pdf または マジックバイトが %PDF- ならそのまま返す
 * - gotoUrl があれば decode して再取得
 * - HTML の場合は .pdf リンクを抽出して取得
 */
async function followLink(
  linkUrl: string,
  originalUrl: string,
  maxDepth: number,
  label: string,
): Promise<ResolvePdfResult> {
  try {
    return await resolveToPdfBuffer(linkUrl, { maxDepth: maxDepth - 1 });
  } catch (e) {
    if (e instanceof NotPdfError || e instanceof CouldNotResolvePdfError)
      throw e;
    throw new CouldNotResolvePdfError(
      `${label} fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      originalUrl,
    );
  }
}

/**
 * プロトコル相対 URL (//example.com/...) を https: 付きに正規化する。
 * DigiKey API などが //mm.digikey.com/... 形式を返す場合がある。
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

export async function resolveToPdfBuffer(
  url: string,
  options: { maxDepth?: number } = {},
): Promise<ResolvePdfResult> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (maxDepth <= 0) {
    throw new CouldNotResolvePdfError(
      "Could not resolve PDF link (max redirect depth reached). The URL may point to an HTML page (e.g. manufacturer redirect).",
      url,
    );
  }

  url = normalizeUrl(url);

  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DatasheetTool/1.0)" },
  });

  if (!res.ok) {
    throw new NotPdfError(
      `Fetch failed: ${res.status} ${res.statusText}`,
      url,
      res.headers.get("content-type") ?? undefined,
    );
  }

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  const buffer = await res.arrayBuffer();
  const finalUrl = res.url;

  if (isPdfBuffer(buffer)) {
    return { buffer, finalUrl };
  }

  if (isPdfContentType(contentType) && !isPdfBuffer(buffer)) {
    throw new NotPdfError(
      "Response has Content-Type application/pdf but content is not a valid PDF (missing %PDF- header). The server may have returned an error page.",
      url,
      contentType ?? undefined,
    );
  }

  // gotoUrl を試す（TI など）
  const gotoUrl = extractGotoUrl(url) || extractGotoUrl(finalUrl);
  if (gotoUrl) {
    return followLink(gotoUrl, url, maxDepth, "gotoUrl");
  }

  // HTML の場合は .pdf リンクを抽出
  if (isHtmlContentType(contentType) || looksLikeHtml(buffer)) {
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const pdfLink = extractPdfLinkFromHtml(html, finalUrl);
    if (pdfLink) {
      return followLink(pdfLink, url, maxDepth, "PDF link");
    }
    throw new CouldNotResolvePdfError(
      "URL returned HTML but no .pdf link was found on the page. Try opening the URL in a browser and downloading the PDF manually.",
      url,
    );
  }

  throw new NotPdfError(
    "Response is not a PDF (Content-Type or content invalid). The URL may point to an HTML redirect page (e.g. manufacturer).",
    url,
    contentType ?? undefined,
  );
}
