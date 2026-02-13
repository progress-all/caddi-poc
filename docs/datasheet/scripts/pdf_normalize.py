"""
PDF抽出テキストの正規化処理

抽出テキストを後段（LLM解析等）で扱いやすい形に正規化する。
"""

import re
import unicodedata


def normalize_text(text: str) -> str:
    """
    抽出テキストを正規化する。

    処理内容:
    1. BOM除去
    2. Unicode正規化 (NFKC)
    3. 不可視制御文字の除去
    4. 全角英数字 → 半角英数字 (NFKC で対応)
    5. 連続空白/タブの圧縮
    6. 連続空行の圧縮
    7. 行頭/行末の不要な空白除去
    """
    if not text:
        return ""

    # 1. BOM除去
    text = text.lstrip("\ufeff")

    # 2. Unicode正規化 (NFKC) — 全角英数字→半角、互換文字の統一等
    text = unicodedata.normalize("NFKC", text)

    # 3. 不可視制御文字の除去 (改行・タブ・スペースは保持)
    text = _remove_control_chars(text)

    # 4. 置換文字 (U+FFFD) を除去
    text = text.replace("\ufffd", "")

    # 5. 連続空白/タブの圧縮 (行内のみ。改行はそのまま)
    text = _compress_inline_whitespace(text)

    # 6. 各行の行頭/行末の空白を除去
    lines = text.split("\n")
    lines = [line.strip() for line in lines]

    # 7. 連続空行の圧縮 (3行以上の空行 → 2行)
    text = _compress_blank_lines(lines)

    # 8. 先頭・末尾の空行を除去
    text = text.strip("\n")

    return text


def normalize_page_text(text: str) -> str:
    """
    ページ単位のテキスト正規化（軽量版）。
    ページ区切りヘッダーは付与しない。
    """
    if not text:
        return ""

    text = text.lstrip("\ufeff")
    text = unicodedata.normalize("NFKC", text)
    text = _remove_control_chars(text)
    text = text.replace("\ufffd", "")
    text = _compress_inline_whitespace(text)

    lines = text.split("\n")
    lines = [line.strip() for line in lines]
    text = _compress_blank_lines(lines)

    return text.strip()


# =====================================================================
# 内部ヘルパー
# =====================================================================


def _remove_control_chars(text: str) -> str:
    """
    不可視制御文字を除去する。
    保持するもの: \\n (0x0A), \\r (0x0D), \\t (0x09), スペース (0x20)
    """
    result = []
    for ch in text:
        code = ord(ch)
        # ASCII制御文字のうち改行・タブ以外を除去
        if code < 0x20 and ch not in ("\n", "\r", "\t"):
            continue
        # DEL文字
        if code == 0x7F:
            continue
        # Unicode制御文字カテゴリ (Cc) のうち、上記で保持したもの以外
        # U+0080-U+009F (C1制御文字)
        if 0x80 <= code <= 0x9F:
            continue
        # BOM, FFFE, FFFF
        if code in (0xFEFF, 0xFFFE, 0xFFFF):
            continue
        result.append(ch)
    return "".join(result)


def _compress_inline_whitespace(text: str) -> str:
    """行内の連続空白（スペース・タブ）を1つのスペースに圧縮する。"""
    # タブをスペースに変換してから圧縮
    text = text.replace("\t", " ")
    # 行内の連続スペースを1つに
    text = re.sub(r" {2,}", " ", text)
    return text


def _compress_blank_lines(lines: list[str]) -> str:
    """3行以上連続する空行を2行に圧縮する。"""
    result = []
    blank_count = 0
    for line in lines:
        if not line:
            blank_count += 1
            if blank_count <= 2:
                result.append(line)
        else:
            blank_count = 0
            result.append(line)
    return "\n".join(result)
