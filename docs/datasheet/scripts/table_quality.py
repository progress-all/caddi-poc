"""
表抽出結果の品質スコアリング

抽出されたテーブルの構造的健全性を 0.0〜1.0 で評価する。
テキスト品質 (pdf_quality.py) とは別レイヤーの、表構造に特化した評価。
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pdf_table_extractor import ExtractedTable


# =====================================================================
# 既知の単位パターン
# =====================================================================

KNOWN_UNIT_PATTERNS = re.compile(
    r"^("
    r"[mkµunpKMG]?[VAWΩFHs]"  # 基本 SI 接頭辞 + 単位
    r"|°C(?:/W)?"               # 温度系
    r"|K(?:/W)?"                # ケルビン系
    r"|[mc]?m|inch|in|mil"      # 長さ
    r"|[mkµ]?g"                 # 重さ
    r"|%|ppm"                   # 割合
    r"|dB[m]?"                  # デシベル
    r"|[kMG]?Hz"               # 周波数
    r"|V/[µu]?s"               # スルーレート
    r"|cycles"                  # サイクル
    r"|ohm|Ohm"                # オーム表記
    r")$",
    re.IGNORECASE,
)


# =====================================================================
# 個別スコアリング関数
# =====================================================================


def _column_count_consistency(table: "ExtractedTable") -> float:
    """
    列数の一貫性スコア。
    各行の列数がヘッダー列数と一致しているかを評価する。

    weight: 3.0
    """
    if not table.headers or not table.raw_rows:
        return 0.0

    expected = len(table.headers)
    if expected == 0:
        return 0.0

    matching = 0
    for row in table.raw_rows:
        if len(row) == expected:
            matching += 1
        elif abs(len(row) - expected) <= 1:
            # 1列の差は軽微
            matching += 0.7

    return matching / len(table.raw_rows) if table.raw_rows else 0.0


def _header_quality(table: "ExtractedTable") -> float:
    """
    ヘッダーの品質スコア。
    空ヘッダーの少なさ、重複の少なさ、一般的な列名の存在を評価する。

    weight: 2.0
    """
    if not table.headers:
        return 0.0

    score = 1.0

    # 空ヘッダーの割合
    empty_count = sum(1 for h in table.headers if not h or h.startswith("Col_"))
    empty_ratio = empty_count / len(table.headers)
    score -= empty_ratio * 0.5

    # ヘッダーが1つしかない場合
    if len(table.headers) <= 1:
        score *= 0.3

    # 一般的なデータシート列名が含まれているか
    common_headers = {"Symbol", "Parameter", "Value", "Unit", "Min", "Max", "Typ",
                      "Test Conditions", "Description"}
    found = sum(1 for h in table.headers if h in common_headers)
    if found > 0:
        score = min(1.0, score + found * 0.05)

    return max(0.0, min(1.0, score))


def _numeric_pattern_ratio(table: "ExtractedTable") -> float:
    """
    値セルにおける数値パターンの出現率。
    データシートの表は数値データが多いため、高い値が期待される。

    weight: 2.0
    """
    if not table.rows:
        return 0.0

    total_value_cells = 0
    numeric_cells = 0

    # ヘッダーから「値」を持つべき列を特定
    value_headers = set()
    non_value_headers = {"Symbol", "Parameter", "Description", "Test Conditions",
                         "Unit", "Conditions"}
    for h in table.headers:
        if h not in non_value_headers:
            value_headers.add(h)

    if not value_headers:
        # 全列を対象
        value_headers = set(table.headers)

    for row in table.rows:
        for header in value_headers:
            val = row.get(header, "")
            if val and val.strip():
                total_value_cells += 1
                # 数値的なセルかどうか
                stripped = val.strip()
                cleaned = stripped.replace(" ", "").replace(",", "")
                cleaned = re.sub(r"[±+\-−–]", "", cleaned)
                cleaned = re.sub(r"\s*to\s*", "", cleaned, flags=re.IGNORECASE)
                if re.search(r"\d", cleaned):
                    numeric_cells += 1

    if total_value_cells == 0:
        return 0.5  # 判定不能

    return numeric_cells / total_value_cells


def _unit_validity(table: "ExtractedTable") -> float:
    """
    Unit 列（存在する場合）の値が既知の単位パターンに合致するかを評価する。

    weight: 1.5
    """
    # Unit 列を探す
    unit_col = None
    for h in table.headers:
        if h.lower() in ("unit", "units"):
            unit_col = h
            break

    if unit_col is None:
        return 0.8  # Unit 列がない場合はニュートラル

    values = [row.get(unit_col, "") for row in table.rows]
    non_empty = [v.strip() for v in values if v and v.strip()]

    if not non_empty:
        return 0.5

    valid_count = sum(1 for v in non_empty if KNOWN_UNIT_PATTERNS.match(v))
    return valid_count / len(non_empty)


def _min_max_alignment(table: "ExtractedTable") -> float:
    """
    Min/Max 列の対応品質を評価する。
    Min列に英字が多い、Max < Min の逆転がある、等を検知する。

    weight: 2.5
    """
    min_col = None
    max_col = None
    typ_col = None

    for h in table.headers:
        hl = h.lower().strip().rstrip(".")
        if hl == "min":
            min_col = h
        elif hl == "max":
            max_col = h
        elif hl == "typ":
            typ_col = h

    # Min/Max/Typ のいずれもない場合
    if not any([min_col, max_col, typ_col]):
        return 0.8  # ニュートラル

    score = 1.0
    issues = 0
    checks = 0

    # 各列について英字の割合をチェック
    for label, col in [("Min", min_col), ("Max", max_col), ("Typ", typ_col)]:
        if col is None:
            continue
        values = [row.get(col, "") for row in table.rows]
        non_empty = [v.strip() for v in values if v and v.strip()]
        if not non_empty:
            continue
        checks += 1
        # 英字が3文字以上連続するセルの割合
        alpha_count = sum(1 for v in non_empty if re.search(r"[a-zA-Z]{3,}", v))
        if alpha_count / len(non_empty) > 0.5:
            issues += 1

    # Min > Max の逆転チェック
    if min_col and max_col:
        inversions = 0
        comparisons = 0
        for row in table.rows:
            min_val = row.get(min_col, "").strip()
            max_val = row.get(max_col, "").strip()
            try:
                min_num = float(min_val.replace(" ", "").replace(",", ""))
                max_num = float(max_val.replace(" ", "").replace(",", ""))
                comparisons += 1
                if min_num > max_num:
                    inversions += 1
            except (ValueError, AttributeError):
                pass
        if comparisons > 0:
            checks += 1
            if inversions / comparisons > 0.3:
                issues += 1

    if checks == 0:
        return 0.8

    return max(0.0, 1.0 - (issues / checks) * 0.8)


def _empty_cell_ratio(table: "ExtractedTable") -> float:
    """
    空セルの割合が過度に高くないかを評価する。

    weight: 1.0
    """
    if not table.rows or not table.headers:
        return 0.0

    total_cells = 0
    empty_cells = 0

    for row in table.rows:
        for header in table.headers:
            total_cells += 1
            val = row.get(header, "")
            if not val or not val.strip():
                empty_cells += 1

    if total_cells == 0:
        return 0.0

    empty_ratio = empty_cells / total_cells
    # 空セル率 50% 以上で急速に減点
    if empty_ratio > 0.7:
        return 0.1
    if empty_ratio > 0.5:
        return 0.3
    return max(0.0, 1.0 - empty_ratio * 1.5)


def _row_count_score(table: "ExtractedTable") -> float:
    """
    行数の妥当性スコア。
    1行だけの表は品質が低い、2行以上で十分。

    weight: 0.5
    """
    n = len(table.rows)
    if n == 0:
        return 0.0
    if n == 1:
        return 0.4
    if n == 2:
        return 0.7
    return 1.0


# =====================================================================
# 総合スコアリング
# =====================================================================


def evaluate_table_quality(table: "ExtractedTable") -> float:
    """
    テーブルの品質スコアを算出する (0.0〜1.0)。

    Args:
        table: ExtractedTable インスタンス

    Returns:
        0.0（構造的に不正）〜 1.0（高品質）の品質スコア
    """
    if not table.headers or not table.rows:
        return 0.0

    scores: list[tuple[float, float]] = [
        (_column_count_consistency(table), 3.0),
        (_header_quality(table), 2.0),
        (_numeric_pattern_ratio(table), 2.0),
        (_unit_validity(table), 1.5),
        (_min_max_alignment(table), 2.5),
        (_empty_cell_ratio(table), 1.0),
        (_row_count_score(table), 0.5),
    ]

    total_weight = sum(w for _, w in scores)
    weighted_sum = sum(s * w for s, w in scores)
    final_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    return round(min(1.0, max(0.0, final_score)), 4)


def table_quality_details(table: "ExtractedTable") -> dict:
    """品質スコアの内訳を返す（デバッグ/ログ用）。"""
    if not table.headers or not table.rows:
        return {"score": 0.0, "reason": "empty table"}

    return {
        "score": evaluate_table_quality(table),
        "column_count_consistency": round(_column_count_consistency(table), 4),
        "header_quality": round(_header_quality(table), 4),
        "numeric_pattern_ratio": round(_numeric_pattern_ratio(table), 4),
        "unit_validity": round(_unit_validity(table), 4),
        "min_max_alignment": round(_min_max_alignment(table), 4),
        "empty_cell_ratio": round(_empty_cell_ratio(table), 4),
        "row_count_score": round(_row_count_score(table), 4),
        "num_headers": len(table.headers),
        "num_rows": len(table.rows),
        "headers": table.headers,
    }
