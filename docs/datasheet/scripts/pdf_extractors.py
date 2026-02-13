"""
PDF テキスト抽出戦略の実装

Strategy A: PyMuPDF (fitz)
Strategy B: pdfminer.six
Strategy C: OCR (PyMuPDF 画像化 + pytesseract)
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# =====================================================================
# 共通データクラス
# =====================================================================


@dataclass
class ExtractionResult:
    """抽出結果を格納するデータクラス。"""

    text: str = ""  # 抽出テキスト全体
    method: str = ""  # 使用した方式名
    page_count: int = 0  # ページ数
    quality_score: float = 0.0  # 0.0〜1.0
    warnings: list[str] = field(default_factory=list)  # 警告メッセージ
    page_texts: list[str] = field(default_factory=list)  # ページ別テキスト
    elapsed_ms: int = 0  # 処理時間 (ms)


# =====================================================================
# Strategy A: PyMuPDF
# =====================================================================


def extract_pymupdf(pdf_path: str) -> ExtractionResult:
    """
    PyMuPDF (fitz) を使ったテキスト抽出。
    既存方式の改良版: フォント情報からエンコーディング問題を検出する。
    """
    try:
        import fitz  # pymupdf
    except ImportError:
        raise RuntimeError("pymupdf is required. Install with: pip install pymupdf")

    start = time.time()
    warnings: list[str] = []

    doc = fitz.open(pdf_path)
    page_texts: list[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        page_texts.append(text)

        # フォント情報をチェックしてエンコーディング問題を検出
        try:
            font_list = page.get_fonts(full=True)
            for font in font_list:
                if len(font) >= 6:
                    encoding = font[5] if font[5] else ""
                    basefont = font[3] if font[3] else ""
                    # カスタムエンコーディングやIdentity-Hなどを検出
                    if encoding and encoding not in (
                        "WinAnsiEncoding",
                        "MacRomanEncoding",
                        "StandardEncoding",
                        "MacExpertEncoding",
                        "Identity-H",
                        "Identity-V",
                    ):
                        warnings.append(
                            f"Page {page_num + 1}: non-standard encoding '{encoding}' "
                            f"in font '{basefont}'"
                        )
        except Exception as e:
            warnings.append(f"Page {page_num + 1}: font check failed: {e}")

    doc.close()

    elapsed_ms = int((time.time() - start) * 1000)
    full_text = "\n".join(page_texts)

    return ExtractionResult(
        text=full_text,
        method="pymupdf",
        page_count=len(page_texts),
        quality_score=0.0,  # 後で品質評価で上書き
        warnings=warnings,
        page_texts=page_texts,
        elapsed_ms=elapsed_ms,
    )


# =====================================================================
# Strategy B: pdfminer.six
# =====================================================================


def extract_pdfminer(pdf_path: str) -> ExtractionResult:
    """
    pdfminer.six を使ったテキスト抽出。
    CMap/ToUnicode/フォントエンコーディング処理が PyMuPDF より強い。
    """
    try:
        from pdfminer.layout import LAParams
        from pdfminer.pdfpage import PDFPage
        from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
        from pdfminer.converter import TextConverter
    except ImportError:
        raise RuntimeError(
            "pdfminer.six is required. Install with: pip install pdfminer.six"
        )

    import io

    start = time.time()
    warnings: list[str] = []
    page_texts: list[str] = []

    laparams = LAParams(
        line_margin=0.5,
        word_margin=0.1,
        char_margin=2.0,
        boxes_flow=0.5,
    )

    try:
        # ファイルハンドルを開いたまま全ページを処理
        rsrcmgr = PDFResourceManager()

        with open(pdf_path, "rb") as f:
            for page_num, page in enumerate(PDFPage.get_pages(f)):
                try:
                    output = io.StringIO()
                    device = TextConverter(rsrcmgr, output, laparams=laparams)
                    interpreter = PDFPageInterpreter(rsrcmgr, device)
                    interpreter.process_page(page)
                    device.close()
                    page_text = output.getvalue()
                    page_texts.append(page_text)
                except Exception as e:
                    warnings.append(
                        f"Page {page_num + 1}: pdfminer extraction failed: {e}"
                    )
                    page_texts.append("")

    except Exception as e:
        raise RuntimeError(f"pdfminer extraction failed: {e}") from e

    elapsed_ms = int((time.time() - start) * 1000)
    full_text = "\n".join(page_texts)

    return ExtractionResult(
        text=full_text,
        method="pdfminer",
        page_count=len(page_texts),
        quality_score=0.0,
        warnings=warnings,
        page_texts=page_texts,
        elapsed_ms=elapsed_ms,
    )


# =====================================================================
# Strategy C: OCR (PyMuPDF render + pytesseract)
# =====================================================================


def extract_ocr(pdf_path: str, dpi: int = 300, lang: str = "eng") -> ExtractionResult:
    """
    OCRによるテキスト抽出。
    PyMuPDFでページを画像化し、pytesseractでOCRする。
    Tesseractが未インストールの場合はエラーを返す。
    """
    try:
        import fitz  # pymupdf
    except ImportError:
        raise RuntimeError("pymupdf is required. Install with: pip install pymupdf")

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        raise RuntimeError(
            "pytesseract and Pillow are required. "
            "Install with: pip install pytesseract Pillow\n"
            "Also ensure Tesseract OCR is installed on the system."
        )

    # Tesseract の存在確認
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        raise RuntimeError(
            "Tesseract OCR is not installed or not found in PATH. "
            "Install from: https://github.com/tesseract-ocr/tesseract"
        )

    start = time.time()
    warnings: list[str] = []
    page_texts: list[str] = []

    doc = fitz.open(pdf_path)
    zoom = dpi / 72  # 72 DPI がデフォルト
    matrix = fitz.Matrix(zoom, zoom)

    for page_num in range(len(doc)):
        try:
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix)

            # PyMuPDF pixmap → PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # OCR実行
            page_text = pytesseract.image_to_string(img, lang=lang)
            page_texts.append(page_text)
        except Exception as e:
            warnings.append(f"Page {page_num + 1}: OCR failed: {e}")
            page_texts.append("")

    doc.close()

    elapsed_ms = int((time.time() - start) * 1000)
    full_text = "\n".join(page_texts)

    return ExtractionResult(
        text=full_text,
        method="ocr",
        page_count=len(page_texts),
        quality_score=0.0,
        warnings=warnings,
        page_texts=page_texts,
        elapsed_ms=elapsed_ms,
    )


# =====================================================================
# 戦略ディスパッチ
# =====================================================================

STRATEGIES = {
    "pymupdf": extract_pymupdf,
    "pdfminer": extract_pdfminer,
    "ocr": extract_ocr,
}


def run_strategy(name: str, pdf_path: str) -> ExtractionResult:
    """名前指定で抽出戦略を実行する。"""
    if name not in STRATEGIES:
        raise ValueError(f"Unknown strategy: {name}. Available: {list(STRATEGIES.keys())}")
    return STRATEGIES[name](pdf_path)
