import { promises as fs } from "fs";
import path from "path";

/**
 * キャッシュオプション
 */
export interface CacheOptions {
  /** キャッシュの名前空間（例: "bom", "similar-search"） */
  namespace: string;
  /** キャッシュキー（ファイル名に使用可能な形式） */
  key: string;
  /** 有効期限（ミリ秒）、省略時は無期限 */
  ttl?: number;
}

/**
 * キャッシュデータの構造
 */
interface CacheData<T> {
  generatedAt: string;
  expiresAt?: string; // TTLが設定されている場合のみ
  key: string;
  data: T;
}

/**
 * キャッシュファイルのパスを取得
 */
function getCachePath(namespace: string, key: string): string {
  const cacheDir = path.join(process.cwd(), "data", "cache", namespace);
  return path.join(cacheDir, `${key}.json`);
}

/**
 * キャッシュキーをファイル名安全な形式にエンコード
 * ファイル名に使用できない文字をURLエンコードする
 */
function encodeCacheKey(key: string): string {
  // ファイル名に使用できない文字: / \ : * ? " < > |
  return encodeURIComponent(key);
}

/**
 * キャッシュキーをデコード
 */
function decodeCacheKey(encodedKey: string): string {
  return decodeURIComponent(encodedKey);
}

/**
 * パラメーターオブジェクトからキャッシュキーを生成
 * 
 * @param params パラメーターのオブジェクト
 * @returns ファイル名安全なキャッシュキー
 * 
 * @example
 * buildCacheKey({ mpn: "ABC123", dkpn: "490-1234-ND" })
 * // => "dkpn=490-1234-ND_mpn=ABC123"
 */
export function buildCacheKey(
  params: Record<string, string | undefined>
): string {
  // 1. undefined/空文字のパラメーターを除外
  const filtered = Object.entries(params).filter(
    ([_, value]) => value !== undefined && value !== ""
  );

  // 2. キー名でアルファベット順にソート（順序を決定論的に）
  filtered.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  // 3. "key=value" 形式で結合（区切り文字は _）
  const keyParts = filtered.map(([key, value]) => {
    // 値もエンコード（ファイル名安全にする）
    return `${key}=${encodeCacheKey(value!)}`;
  });

  return keyParts.join("_");
}

/**
 * キャッシュを取得
 * 
 * @param options キャッシュオプション
 * @returns キャッシュされたデータ、存在しないか期限切れの場合は null
 */
export async function getCache<T>(
  options: CacheOptions
): Promise<T | null> {
  try {
    const cachePath = getCachePath(options.namespace, options.key);
    const cacheContent = await fs.readFile(cachePath, "utf-8");
    const cacheData: CacheData<T> = JSON.parse(cacheContent);

    // キーの一致確認
    if (cacheData.key !== options.key) {
      return null;
    }

    // TTLチェック
    if (options.ttl && cacheData.expiresAt) {
      const expiresAt = new Date(cacheData.expiresAt).getTime();
      if (Date.now() > expiresAt) {
        // 期限切れのキャッシュは削除
        try {
          await fs.unlink(cachePath);
        } catch {
          // 削除失敗は無視
        }
        return null;
      }
    }

    return cacheData.data;
  } catch (error) {
    // ファイルが存在しない、または読み込みエラーの場合は null を返す
    return null;
  }
}

/**
 * キャッシュを保存
 * 
 * @param options キャッシュオプション
 * @param data 保存するデータ
 */
export async function setCache<T>(
  options: CacheOptions,
  data: T
): Promise<void> {
  try {
    const cachePath = getCachePath(options.namespace, options.key);
    const cacheDir = path.dirname(cachePath);

    // キャッシュディレクトリが存在しない場合は作成
    await fs.mkdir(cacheDir, { recursive: true });

    const cacheData: CacheData<T> = {
      generatedAt: new Date().toISOString(),
      key: options.key,
      data,
    };

    // TTLが設定されている場合は有効期限を計算
    if (options.ttl) {
      cacheData.expiresAt = new Date(
        Date.now() + options.ttl
      ).toISOString();
    }

    await fs.writeFile(
      cachePath,
      JSON.stringify(cacheData, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error(`キャッシュ保存エラー (${options.namespace}/${options.key}):`, error);
    // キャッシュ保存に失敗してもエラーを投げない（処理は続行）
  }
}

/**
 * キャッシュをラップするヘルパー関数
 * 
 * キャッシュが存在する場合はそれを返し、
 * 存在しない場合は fetchFn を実行して結果をキャッシュに保存する
 * 
 * @param options キャッシュオプション
 * @param fetchFn データを取得する関数
 * @returns データとキャッシュヒット/ミスの情報
 * 
 * @example
 * const { data, fromCache } = await withCache(
 *   { namespace: "similar-search", key: "mpn=ABC123" },
 *   async () => {
 *     // DigiKey API呼び出しなど
 *     return await fetchData();
 *   }
 * );
 */
export async function withCache<T>(
  options: CacheOptions,
  fetchFn: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  // キャッシュを確認
  const cached = await getCache<T>(options);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // キャッシュがない場合は fetchFn を実行
  const data = await fetchFn();

  // 結果をキャッシュに保存
  await setCache(options, data);

  return { data, fromCache: false };
}
