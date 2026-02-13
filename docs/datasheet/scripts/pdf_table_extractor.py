"""
PDF 表構造抽出モジュール

PDFデータシートから表（テーブル）を構造化データとして抽出する。
フラットテキスト抽出では失われる行列関係を保持し、
Min/Max/Typ/Unit 等の列対応を正確に復元する。

Strategy A: pdfplumber (PDF内部座標から罫線・セル境界を推定)
Strategy B: PyMuPDF page.find_tables() (ビルトイン表検出)
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# =====================================================================
# 共通データクラス
# =====================================================================


@dataclass
class ExtractedTable:
    """抽出された1テーブルの構造化データ。"""

    page: int  # ページ番号 (1-indexed)
    title: str = ""  # テーブルタイトル (検出できた場合)
    headers: list[str] = field(default_factory=list)  # ヘッダー行
    rows: list[dict[str, str]] = field(default_factory=list)  # 各行 {col_name: value}
    raw_rows: list[list[str]] = field(default_factory=list)  # 生の行列データ
    quality_score: float = 0.0  # 0.0-1.0
    method: str = ""  # "pdfplumber" | "pymupdf"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """JSON シリアライズ用の辞書表現。"""
        return {
            "page": self.page,
            "title": self.title,
            "headers": self.headers,
            "rows": self.rows,
            "raw_rows": self.raw_rows,
            "quality_score": self.quality_score,
            "method": self.method,
            "warnings": self.warnings,
        }


@dataclass
class TableExtractionResult:
    """全テーブルの抽出結果。"""

    tables: list[ExtractedTable] = field(default_factory=list)
    method: str = ""  # 採用された方式名
    page_count: int = 0
    elapsed_ms: int = 0
    warnings: list[str] = field(default_factory=list)


# =====================================================================
# ヘッダー正規化
# =====================================================================

# Min/Max/Typ/Unit の表記揺れ吸収マップ
HEADER_NORMALIZE_MAP: dict[str, str] = {
    "min": "Min",
    "min.": "Min",
    "minimum": "Min",
    "max": "Max",
    "max.": "Max",
    "maximum": "Max",
    "typ": "Typ",
    "typ.": "Typ",
    "typical": "Typ",
    "unit": "Unit",
    "units": "Unit",
    "symbol": "Symbol",
    "parameter": "Parameter",
    "parameters": "Parameter",
    "test condition": "Test Conditions",
    "test conditions": "Test Conditions",
    "conditions": "Test Conditions",
    "description": "Description",
    "value": "Value",
    "values": "Value",
}


def normalize_header(header: str) -> str:
    """
    ヘッダー文字列を正規化する。
    Min./Max./Typ./Unit 等の表記揺れを統一形式に変換。
    """
    if not header:
        return ""
    stripped = header.strip()
    # 注釈 (1), (2) 等を除去
    stripped = re.sub(r"\s*\(\d+\)\s*$", "", stripped)
    key = stripped.lower().strip()
    return HEADER_NORMALIZE_MAP.get(key, stripped)


def normalize_headers(headers: list[str]) -> list[str]:
    """ヘッダーリスト全体を正規化する。"""
    normalized = [normalize_header(h) for h in headers]

    # 空ヘッダーに連番を付与 (Col_1, Col_2, ...)
    unnamed_idx = 0
    for i, h in enumerate(normalized):
        if not h:
            unnamed_idx += 1
            normalized[i] = f"Col_{unnamed_idx}"

    # 重複ヘッダーに連番サフィックスを付与
    seen: dict[str, int] = {}
    for i, h in enumerate(normalized):
        if h in seen:
            seen[h] += 1
            normalized[i] = f"{h}_{seen[h]}"
        else:
            seen[h] = 1

    return normalized


# =====================================================================
# 複数行ヘッダー統合
# =====================================================================


def _is_header_like_row(row: list[str]) -> bool:
    """先頭行に数値が少なく、文字列主体ならヘッダー候補。"""
    if not row:
        return False
    non_empty = [c for c in row if c and c.strip()]
    if not non_empty:
        return False
    numeric_count = sum(1 for c in non_empty if _is_numeric_cell(c))
    return numeric_count / len(non_empty) < 0.4


def _propagate_spanning_cells(row: list[str]) -> list[str]:
    """
    ヘッダー行でのスパニング(セル結合)を復元する。
    空セルは左隣の非空セルの値を継承する。

    例: ["REF.", "Millimeters", "", "Inches", ""]
      → ["REF.", "Millimeters", "Millimeters", "Inches", "Inches"]
    """
    filled: list[str] = []
    last_non_empty = ""
    for cell in row:
        stripped = cell.strip() if cell else ""
        if stripped:
            last_non_empty = stripped
            filled.append(stripped)
        else:
            # 空セルは左隣の値を継承（スパニング）
            filled.append(last_non_empty)
    return filled


def _is_group_title_row(filled_row: list[str]) -> bool:
    """
    全列が同じ値（or 空+1値のみ）のグループタイトル行かを判定する。
    例: ["DIMENSIONS", "DIMENSIONS", "DIMENSIONS", "DIMENSIONS"]
    """
    non_empty = [c for c in filled_row if c]
    if not non_empty:
        return True
    unique = set(non_empty)
    return len(unique) == 1


def merge_multiline_headers(raw_table: list[list[str]]) -> tuple[list[str], list[list[str]]]:
    """
    複数行に分かれたヘッダーを統合する。

    以下のパターンに対応:
    - 1行ヘッダー: そのまま使用
    - 2行ヘッダー: 結合（"Millimeters" + "Min." → "Millimeters Min."）
    - 3行以上ヘッダー: グループタイトル行を除外して結合
    - スパニングヘッダー: 空セルに左隣の値を継承
      ("Millimeters", "" → "Millimeters", "Millimeters")

    Returns:
        (headers, data_rows)
    """
    if not raw_table or len(raw_table) < 2:
        if raw_table:
            return raw_table[0], []
        return [], []

    # --- 1. ヘッダー行の数を判定（最大4行） ---
    header_row_count = 0
    for row in raw_table:
        if _is_header_like_row(row):
            header_row_count += 1
        else:
            break
    header_row_count = max(1, min(header_row_count, 4))

    # ヘッダーが1行のみの場合
    if header_row_count == 1:
        return raw_table[0], raw_table[1:]

    header_rows = raw_table[:header_row_count]
    data_rows = raw_table[header_row_count:]

    # --- 2. 各ヘッダー行でスパニングセルを復元 ---
    max_cols = max(len(r) for r in header_rows)
    filled_rows: list[list[str]] = []
    for row in header_rows:
        # 列数を揃える
        padded = row + [""] * (max_cols - len(row))
        filled = _propagate_spanning_cells(padded)
        filled_rows.append(filled)

    # --- 3. グループタイトル行（全列同一値）を除外 ---
    meaningful_rows = [r for r in filled_rows if not _is_group_title_row(r)]
    if not meaningful_rows:
        meaningful_rows = filled_rows  # フォールバック

    # --- 4. 上→下にマージ: 各列で異なる値を " " で結合 ---
    merged: list[str] = []
    for col_idx in range(max_cols):
        parts: list[str] = []
        for row in meaningful_rows:
            val = row[col_idx] if col_idx < len(row) else ""
            # 既に追加済みの値と同じなら重複排除
            if val and val not in parts:
                parts.append(val)
        merged.append(" ".join(parts))

    return merged, data_rows


# =====================================================================
# 単位列検出
# =====================================================================

# 電子部品データシートで頻出する単位パターン
KNOWN_UNITS = {
    "V", "mV", "kV", "µV", "uV",
    "A", "mA", "µA", "uA", "nA", "kA",
    "W", "mW", "kW", "µW",
    "Ω", "ohm", "mΩ", "kΩ", "MΩ",
    "F", "µF", "uF", "nF", "pF", "mF",
    "H", "µH", "uH", "nH", "mH",
    "Hz", "kHz", "MHz", "GHz",
    "s", "ms", "µs", "us", "ns", "ps",
    "°C", "°C/W", "K", "K/W",
    "mm", "cm", "m", "inch", "in", "mil",
    "g", "mg", "kg",
    "%", "ppm",
    "dB", "dBm",
    "V/µs", "V/us", "V/ns",
    "cycles",
}

# 単位パターンの正規表現
UNIT_PATTERN = re.compile(
    r"^[°µu]?[A-Za-z°Ω/%]+(?:/[°µu]?[A-Za-z°Ω]+)?$"
)


def is_unit_value(value: str) -> bool:
    """値が単位文字列かどうかを判定する。"""
    if not value or not value.strip():
        return False
    stripped = value.strip()
    if stripped in KNOWN_UNITS:
        return True
    return bool(UNIT_PATTERN.match(stripped)) and not stripped.replace(".", "").isdigit()


def detect_unit_column(headers: list[str], rows: list[list[str]]) -> int | None:
    """
    単位列のインデックスを検出する。

    Returns:
        単位列のインデックス、検出できなければ None
    """
    # ヘッダーに "Unit" がある場合
    for i, h in enumerate(headers):
        if normalize_header(h).lower() in ("unit", "units"):
            return i

    # ヘッダーに明示的な Unit がない場合、各列の値から推定
    if not rows:
        return None

    num_cols = len(headers) if headers else (max(len(r) for r in rows) if rows else 0)
    if num_cols == 0:
        return None

    best_col = None
    best_ratio = 0.0

    for col_idx in range(num_cols):
        values = []
        for row in rows:
            if col_idx < len(row):
                values.append(row[col_idx])
        if not values:
            continue
        non_empty = [v for v in values if v and v.strip()]
        if not non_empty:
            continue
        unit_count = sum(1 for v in non_empty if is_unit_value(v))
        ratio = unit_count / len(non_empty)
        if ratio > best_ratio and ratio >= 0.5:
            best_ratio = ratio
            best_col = col_idx

    return best_col


# =====================================================================
# Min/Max 列対応検証
# =====================================================================


def _is_numeric_cell(value: str) -> bool:
    """セル値が数値的かどうか判定する。"""
    if not value or not value.strip():
        return False
    stripped = value.strip()
    # 符号、小数点、スペース区切りの数値
    cleaned = stripped.replace(" ", "").replace(",", "").replace("−", "-").replace("–", "-")
    # ± を含む場合
    cleaned = re.sub(r"[±+\-]", "", cleaned)
    # "to" 区切りの範囲
    if " to " in stripped.lower():
        parts = stripped.lower().split(" to ")
        return all(_is_numeric_cell(p.strip()) for p in parts if p.strip())
    # 数値パターン
    return bool(re.match(r"^[\d.]+$", cleaned)) and len(cleaned) > 0


def validate_min_max_columns(
    headers: list[str],
    rows: list[dict[str, str]],
) -> list[str]:
    """
    Min/Max 列の対応を検証する。

    Returns:
        警告メッセージのリスト
    """
    warnings: list[str] = []
    norm_headers = [normalize_header(h) for h in headers]

    min_idx = None
    max_idx = None
    typ_idx = None

    for i, nh in enumerate(norm_headers):
        if nh == "Min":
            min_idx = i
        elif nh == "Max":
            max_idx = i
        elif nh == "Typ":
            typ_idx = i

    # Min/Max 列が存在しない場合はスキップ
    if min_idx is None and max_idx is None:
        return warnings

    # Min 列に英字が多い場合 → 列崩れの兆候
    for label, col_key in [("Min", "Min"), ("Max", "Max"), ("Typ", "Typ")]:
        if col_key not in [normalize_header(h) for h in headers]:
            continue
        values = [row.get(col_key, "") for row in rows]
        non_empty = [v for v in values if v and v.strip()]
        if not non_empty:
            continue
        alpha_count = sum(
            1 for v in non_empty
            if re.search(r"[a-zA-Z]{3,}", v.strip())
        )
        alpha_ratio = alpha_count / len(non_empty)
        if alpha_ratio > 0.5:
            warnings.append(
                f"Column '{label}' contains >50% alphabetic values "
                f"({alpha_count}/{len(non_empty)}): possible column misalignment"
            )

    # Min > Max の逆転検出
    if min_idx is not None and max_idx is not None:
        min_key = headers[min_idx] if min_idx < len(headers) else None
        max_key = headers[max_idx] if max_idx < len(headers) else None
        if min_key and max_key:
            for row_idx, row in enumerate(rows):
                min_val = row.get(min_key, "")
                max_val = row.get(max_key, "")
                try:
                    min_num = float(min_val.replace(" ", "").replace(",", ""))
                    max_num = float(max_val.replace(" ", "").replace(",", ""))
                    if min_num > max_num:
                        warnings.append(
                            f"Row {row_idx + 1}: Min ({min_val}) > Max ({max_val}): "
                            f"possible value inversion"
                        )
                except (ValueError, AttributeError):
                    pass

    return warnings


# =====================================================================
# セル値クリーンアップ
# =====================================================================


def _clean_cell(value) -> str:
    """セル値を文字列に変換し、不要な空白を除去する。"""
    if value is None:
        return ""
    s = str(value).strip()
    # 改行をスペースに変換
    s = re.sub(r"\s*\n\s*", " ", s)
    # 連続空白を1つに
    s = re.sub(r"\s{2,}", " ", s)
    # CID参照 (cid:XX) を除去
    s = re.sub(r"\(cid:\d+\)", "", s)
    s = s.strip()
    return s


def _fix_concatenated_words(text: str) -> str:
    """
    pdfplumber が単語を連結してしまった場合の修正。
    例: "Repetitivepeakreversevoltage" → "Repetitive peak reverse voltage"

    キャメルケース的なパターンを検出してスペースを挿入する。
    ただし、既知の略語（例: VRRM, IF）は分割しない。
    """
    if not text or len(text) < 5:
        return text
    # 全て大文字 or 全て小文字 or 既にスペースありの場合はスキップ
    if text.isupper() or " " in text:
        return text
    # 小文字→大文字の境界にスペースを挿入
    result = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    # ただし数値の前後は分割しない
    return result


# =====================================================================
# テーブルタイトル検出
# =====================================================================


def _detect_table_title(page_text: str, table_bbox: tuple | None) -> str:
    """
    テーブルの直前テキストからタイトルを検出する。

    一般的なパターン: "Table N. Title" や "表 N Title"
    """
    if not page_text:
        return ""

    # "Table N." パターンを検索
    patterns = [
        r"(Table\s+\d+[\.:]\s*[^\n]+)",
        r"(表\s*\d+[\.:．]\s*[^\n]+)",
    ]
    matches = []
    for pat in patterns:
        for m in re.finditer(pat, page_text, re.IGNORECASE):
            matches.append(m.group(1).strip())

    if matches:
        # 最後に検出されたものを返す（テーブルに最も近い）
        return matches[-1] if len(matches) == 1 else matches[-1]

    return ""


# =====================================================================
# Strategy A: pdfplumber
# =====================================================================


def extract_tables_pdfplumber(pdf_path: str) -> TableExtractionResult:
    """
    pdfplumber を使った表構造抽出。
    PDF内部の座標情報から罫線・セル境界を推定し、行列構造を復元する。
    """
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError(
            "pdfplumber is required. Install with: pip install pdfplumber"
        )

    start = time.time()
    warnings: list[str] = []
    tables: list[ExtractedTable] = []

    try:
        pdf = pdfplumber.open(pdf_path)
    except Exception as e:
        raise RuntimeError(f"pdfplumber failed to open PDF: {e}") from e

    page_count = len(pdf.pages)

    for page_num, page in enumerate(pdf.pages):
        try:
            # 複数の設定を段階的に試行
            # 1) lines_strict: 明確な罫線のみ使用（最も信頼性が高い）
            # 2) lines: 推定罫線も含む（やや緩い）
            # 3) text: テキスト位置ベース（最もフォールバック）
            strategy_configs = [
                {
                    "vertical_strategy": "lines_strict",
                    "horizontal_strategy": "lines_strict",
                    "snap_tolerance": 5,
                    "join_tolerance": 5,
                },
                {
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 5,
                    "join_tolerance": 5,
                },
                {
                    "vertical_strategy": "text",
                    "horizontal_strategy": "text",
                    "snap_tolerance": 5,
                    "join_tolerance": 5,
                    "min_words_vertical": 3,
                    "min_words_horizontal": 1,
                },
            ]

            page_tables = []
            for cfg in strategy_configs:
                try:
                    page_tables = page.find_tables(table_settings=cfg)
                    if page_tables:
                        break
                except Exception:
                    continue

            page_text = page.extract_text() or ""

            for tbl_idx, tbl in enumerate(page_tables):
                try:
                    raw_data = tbl.extract()
                    if not raw_data or len(raw_data) < 2:
                        continue

                    # セル値をクリーンアップ
                    cleaned = [[_clean_cell(cell) for cell in row] for row in raw_data]

                    # 完全に空の行を除去
                    cleaned = [row for row in cleaned if any(c for c in row)]
                    if not cleaned or len(cleaned) < 2:
                        continue

                    # ヘッダー統合
                    raw_headers, data_rows = merge_multiline_headers(cleaned)
                    headers = normalize_headers(raw_headers)

                    if not headers or not data_rows:
                        continue

                    # 行を辞書化（単語連結の修正も適用）
                    dict_rows: list[dict[str, str]] = []
                    for row in data_rows:
                        row_dict: dict[str, str] = {}
                        for col_idx, header in enumerate(headers):
                            val = row[col_idx] if col_idx < len(row) else ""
                            val = _fix_concatenated_words(val)
                            row_dict[header] = val
                        dict_rows.append(row_dict)

                    # ヘッダーの連結単語も修正
                    headers = [_fix_concatenated_words(h) for h in headers]
                    # 修正後のヘッダーを再正規化
                    headers = normalize_headers(headers)

                    # テーブルタイトル検出
                    title = _detect_table_title(page_text, tbl.bbox if hasattr(tbl, "bbox") else None)

                    # Min/Max 検証
                    mm_warnings = validate_min_max_columns(headers, dict_rows)

                    extracted = ExtractedTable(
                        page=page_num + 1,
                        title=title,
                        headers=headers,
                        rows=dict_rows,
                        raw_rows=[row for row in data_rows],
                        quality_score=0.0,  # 後で品質評価で上書き
                        method="pdfplumber",
                        warnings=mm_warnings,
                    )
                    tables.append(extracted)

                except Exception as e:
                    warnings.append(
                        f"Page {page_num + 1}, Table {tbl_idx + 1}: "
                        f"extraction failed: {e}"
                    )

        except Exception as e:
            warnings.append(f"Page {page_num + 1}: pdfplumber table detection failed: {e}")

    pdf.close()
    elapsed_ms = int((time.time() - start) * 1000)

    return TableExtractionResult(
        tables=tables,
        method="pdfplumber",
        page_count=page_count,
        elapsed_ms=elapsed_ms,
        warnings=warnings,
    )


# =====================================================================
# Strategy B: PyMuPDF find_tables()
# =====================================================================


def extract_tables_pymupdf(pdf_path: str) -> TableExtractionResult:
    """
    PyMuPDF の page.find_tables() を使った表構造抽出。
    PyMuPDF 1.23.0+ で追加されたビルトイン表検出機能。
    """
    try:
        import fitz  # pymupdf
    except ImportError:
        raise RuntimeError("pymupdf is required. Install with: pip install pymupdf")

    # find_tables() の存在確認
    if not hasattr(fitz, "version") or not hasattr(fitz.Page, "find_tables"):
        raise RuntimeError(
            "PyMuPDF >= 1.23.0 is required for find_tables(). "
            f"Current version: {getattr(fitz, 'version', 'unknown')}"
        )

    start = time.time()
    warnings: list[str] = []
    tables: list[ExtractedTable] = []

    doc = fitz.open(pdf_path)
    page_count = len(doc)

    for page_num in range(page_count):
        page = doc[page_num]
        try:
            tab_finder = page.find_tables()
            page_text = page.get_text("text")

            for tbl_idx, tbl in enumerate(tab_finder.tables):
                try:
                    # PyMuPDF の extract() は list[list[str|None]] を返す
                    raw_data = tbl.extract()
                    if not raw_data or len(raw_data) < 2:
                        continue

                    # セル値をクリーンアップ
                    cleaned = [[_clean_cell(cell) for cell in row] for row in raw_data]

                    # 完全に空の行を除去
                    cleaned = [row for row in cleaned if any(c for c in row)]
                    if not cleaned or len(cleaned) < 2:
                        continue

                    # ヘッダー統合
                    raw_headers, data_rows = merge_multiline_headers(cleaned)
                    headers = normalize_headers(raw_headers)

                    if not headers or not data_rows:
                        continue

                    # 行を辞書化（単語連結の修正も適用）
                    dict_rows: list[dict[str, str]] = []
                    for row in data_rows:
                        row_dict: dict[str, str] = {}
                        for col_idx, header in enumerate(headers):
                            val = row[col_idx] if col_idx < len(row) else ""
                            val = _fix_concatenated_words(val)
                            row_dict[header] = val
                        dict_rows.append(row_dict)

                    # ヘッダーの連結単語も修正
                    headers = [_fix_concatenated_words(h) for h in headers]
                    headers = normalize_headers(headers)

                    # テーブルタイトル検出
                    title = _detect_table_title(page_text, None)

                    # Min/Max 検証
                    mm_warnings = validate_min_max_columns(headers, dict_rows)

                    extracted = ExtractedTable(
                        page=page_num + 1,
                        title=title,
                        headers=headers,
                        rows=dict_rows,
                        raw_rows=[row for row in data_rows],
                        quality_score=0.0,
                        method="pymupdf",
                        warnings=mm_warnings,
                    )
                    tables.append(extracted)

                except Exception as e:
                    warnings.append(
                        f"Page {page_num + 1}, Table {tbl_idx + 1}: "
                        f"extraction failed: {e}"
                    )

        except Exception as e:
            warnings.append(f"Page {page_num + 1}: PyMuPDF table detection failed: {e}")

    doc.close()
    elapsed_ms = int((time.time() - start) * 1000)

    return TableExtractionResult(
        tables=tables,
        method="pymupdf",
        page_count=page_count,
        elapsed_ms=elapsed_ms,
        warnings=warnings,
    )


# =====================================================================
# 戦略ディスパッチ
# =====================================================================

TABLE_STRATEGIES = {
    "pdfplumber": extract_tables_pdfplumber,
    "pymupdf": extract_tables_pymupdf,
}


def run_table_strategy(name: str, pdf_path: str) -> TableExtractionResult:
    """名前指定で表抽出戦略を実行する。"""
    if name not in TABLE_STRATEGIES:
        raise ValueError(
            f"Unknown table strategy: {name}. "
            f"Available: {list(TABLE_STRATEGIES.keys())}"
        )
    return TABLE_STRATEGIES[name](pdf_path)
