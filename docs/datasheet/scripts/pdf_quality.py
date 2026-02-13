"""
PDF抽出テキストの品質スコアリング

ヒューリスティックベースで抽出結果の品質を 0.0〜1.0 で評価する。
"""

import re
import unicodedata


def evaluate_quality(text: str, page_texts: list[str] | None = None) -> float:
    """
    抽出テキストの品質スコアを算出する (0.0〜1.0)。

    Args:
        text: 抽出テキスト全体
        page_texts: ページ別テキストのリスト（空ページ率の計算に使用）

    Returns:
        0.0（完全に不可読）〜 1.0（高品質）の品質スコア
    """
    if not text or not text.strip():
        return 0.0

    scores: list[tuple[float, float]] = []  # (score, weight) のペア

    # --- 1. 制御文字率 (weight=3.0) ---
    control_ratio = _control_char_ratio(text)
    # 制御文字が 5% 以上で急速に減点
    ctrl_score = max(0.0, 1.0 - control_ratio * 10)
    scores.append((ctrl_score, 3.0))

    # --- 2. 印字可能文字率 (weight=2.0) ---
    printable_ratio = _printable_ratio(text)
    scores.append((printable_ratio, 2.0))

    # --- 3. 英数字率 (weight=1.5) ---
    alnum_ratio = _alnum_ratio(text)
    # データシートは英数字が多い。最低 20% は欲しい
    alnum_score = min(1.0, alnum_ratio / 0.20) if alnum_ratio < 0.20 else 1.0
    scores.append((alnum_score, 1.5))

    # --- 4. 置換文字 (U+FFFD) 出現率 (weight=2.0) ---
    replacement_ratio = text.count("\ufffd") / len(text) if text else 0.0
    replacement_score = max(0.0, 1.0 - replacement_ratio * 20)
    scores.append((replacement_score, 2.0))

    # --- 5. 平均行長の妥当性 (weight=1.0) ---
    line_score = _line_length_score(text)
    scores.append((line_score, 1.0))

    # --- 6. 空ページ率 (weight=1.5) ---
    if page_texts and len(page_texts) > 0:
        empty_pages = sum(1 for p in page_texts if not p.strip())
        empty_ratio = empty_pages / len(page_texts)
        empty_score = max(0.0, 1.0 - empty_ratio * 2)
        scores.append((empty_score, 1.5))

    # --- 7. 連続制御文字ブロック検出 (weight=2.0) ---
    garble_score = _garble_block_score(text)
    scores.append((garble_score, 2.0))

    # --- 8. 単語密度 (weight=1.0) ---
    word_density_score = _word_density_score(text)
    scores.append((word_density_score, 1.0))

    # --- 9. CID参照パターン検出 (weight=3.0) ---
    # pdfminer.six が ToUnicode マッピングできない場合に (cid:XX) を出力する
    cid_score = _cid_reference_score(text)
    scores.append((cid_score, 3.0))

    # 加重平均
    total_weight = sum(w for _, w in scores)
    weighted_sum = sum(s * w for s, w in scores)
    final_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # --- ハードフェイル: 致命的な品質問題でスコアに上限を設ける ---
    # CID参照が大量にある場合 (テキストが実質不可読)
    if cid_score <= 0.1:
        final_score = min(final_score, 0.15)
    elif cid_score <= 0.3:
        final_score = min(final_score, 0.35)
    # 制御文字が大量にある場合
    if ctrl_score <= 0.1:
        final_score = min(final_score, 0.2)

    return round(min(1.0, max(0.0, final_score)), 4)


def quality_details(text: str, page_texts: list[str] | None = None) -> dict:
    """品質スコアの内訳を返す（デバッグ/ログ用）。"""
    if not text or not text.strip():
        return {"score": 0.0, "reason": "empty text"}

    control_ratio = _control_char_ratio(text)
    printable_ratio = _printable_ratio(text)
    alnum_ratio = _alnum_ratio(text)
    replacement_count = text.count("\ufffd")
    total_chars = len(text)

    empty_page_count = 0
    total_pages = 0
    if page_texts:
        total_pages = len(page_texts)
        empty_page_count = sum(1 for p in page_texts if not p.strip())

    # CID参照カウント
    cid_pattern = re.compile(r"\(cid:\d+\)")
    cid_matches = cid_pattern.findall(text)
    cid_count = len(cid_matches)

    return {
        "score": evaluate_quality(text, page_texts),
        "total_chars": total_chars,
        "control_char_ratio": round(control_ratio, 4),
        "printable_ratio": round(printable_ratio, 4),
        "alnum_ratio": round(alnum_ratio, 4),
        "replacement_char_count": replacement_count,
        "cid_reference_count": cid_count,
        "empty_pages": empty_page_count,
        "total_pages": total_pages,
    }


# =====================================================================
# 内部ヘルパー
# =====================================================================


def _control_char_ratio(text: str) -> float:
    """制御文字 (U+0000-U+001F, 改行/タブ除く) の割合。"""
    if not text:
        return 0.0
    # 改行 (\n, \r) とタブ (\t) は制御文字扱いしない
    control_count = sum(
        1
        for ch in text
        if (ord(ch) < 0x20 and ch not in ("\n", "\r", "\t"))
        or ord(ch) == 0xFFFE
        or ord(ch) == 0xFFFF
    )
    return control_count / len(text)


def _printable_ratio(text: str) -> float:
    """印字可能文字（空白含む）の割合。"""
    if not text:
        return 0.0
    printable_count = sum(
        1
        for ch in text
        if unicodedata.category(ch)[0] in ("L", "M", "N", "P", "S", "Z")
        or ch in ("\n", "\r", "\t", " ")
    )
    return printable_count / len(text)


def _alnum_ratio(text: str) -> float:
    """英数字の割合（空白・改行除く）。"""
    non_space = [ch for ch in text if ch not in (" ", "\n", "\r", "\t")]
    if not non_space:
        return 0.0
    alnum_count = sum(1 for ch in non_space if ch.isalnum())
    return alnum_count / len(non_space)


def _line_length_score(text: str) -> float:
    """行長の妥当性スコア。平均行長が 5〜200 文字なら高スコア。"""
    lines = [line for line in text.split("\n") if line.strip()]
    if not lines:
        return 0.0
    avg_len = sum(len(line) for line in lines) / len(lines)
    if avg_len < 2:
        return 0.2
    if avg_len < 5:
        return 0.5
    if avg_len > 500:
        return 0.6
    return 1.0


def _garble_block_score(text: str) -> float:
    """連続する制御文字ブロック（文字化けパターン）の検出。"""
    # 3文字以上連続する制御文字列を検出
    pattern = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]{3,}")
    matches = pattern.findall(text)
    if not matches:
        return 1.0
    total_garble_chars = sum(len(m) for m in matches)
    garble_ratio = total_garble_chars / len(text) if text else 0.0
    # ごく少量でも検出されたら減点
    return max(0.0, 1.0 - garble_ratio * 5 - len(matches) * 0.05)


def _cid_reference_score(text: str) -> float:
    """
    (cid:XX) パターンの検出。
    pdfminer.six が ToUnicode マッピングできない場合にこのパターンを出力する。
    CID参照は実質的に不可読なので、少量でも大幅に減点する。
    """
    if not text:
        return 1.0
    cid_pattern = re.compile(r"\(cid:\d+\)")
    matches = cid_pattern.findall(text)
    if not matches:
        return 1.0
    # CID参照が占める文字数の割合
    cid_chars = sum(len(m) for m in matches)
    cid_ratio = cid_chars / len(text)
    cid_count = len(matches)
    if cid_ratio > 0.15:
        return 0.0
    if cid_ratio > 0.05:
        return 0.1
    if cid_ratio > 0.02:
        return 0.3
    if cid_count > 50:
        return 0.3
    if cid_count > 10:
        return 0.5
    return max(0.0, 1.0 - cid_ratio * 15 - cid_count * 0.02)


def _word_density_score(text: str) -> float:
    """
    単語密度スコア。空白で区切られた「単語」がどの程度存在するか。
    文字化けテキストは単語境界がほぼ無いため低スコアになる。
    """
    words = text.split()
    if not words:
        return 0.0
    # 3文字以上の単語がどの程度あるか
    meaningful_words = [w for w in words if len(w) >= 3]
    if not meaningful_words:
        return 0.1
    ratio = len(meaningful_words) / len(words)
    return min(1.0, ratio * 1.2)
