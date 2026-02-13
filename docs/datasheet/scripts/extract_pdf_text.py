#!/usr/bin/env python3
"""
PDFデータシートからテキストを抽出するスクリプト

複数の抽出方式を試行し、品質スコアリングにより最適な結果を採用する。
文字化けが発生するPDF（Infineon等）にも対応。

使用方法:
    python extract_pdf_text.py <input_pdf> [output_txt]
    python extract_pdf_text.py <input_pdf> [output_txt] --strategies pymupdf,pdfminer,ocr
    python extract_pdf_text.py <input_pdf> [output_txt] --log-file extraction.log
    python extract_pdf_text.py <input_pdf> [output_txt] --quality-threshold 0.8

例:
    python extract_pdf_text.py ../raw/GRM185R60J105KE26-01.pdf
    python extract_pdf_text.py ../raw/GRM185R60J105KE26-01.pdf output.txt
    python extract_pdf_text.py input.pdf output.txt --strategies pymupdf,pdfminer
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

# 同ディレクトリのモジュールをインポート可能にする
sys.path.insert(0, str(Path(__file__).parent))

from pdf_extractors import ExtractionResult, run_strategy, STRATEGIES
from pdf_quality import evaluate_quality, quality_details
from pdf_normalize import normalize_text

# ロガー設定
logger = logging.getLogger("extract_pdf_text")


def setup_logging(log_file: str | None = None, verbose: bool = False) -> None:
    """ロギングの設定。"""
    level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # stderr ハンドラ（常に出力）
    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setLevel(level)
    stderr_handler.setFormatter(formatter)
    logger.addHandler(stderr_handler)

    # ファイルハンドラ（指定時のみ）
    if log_file:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.setLevel(logging.DEBUG)


def extract_with_fallback(
    pdf_path: str,
    strategies: list[str] | None = None,
    quality_threshold: float = 0.8,
) -> ExtractionResult:
    """
    複数の抽出方式をフォールバックで試行し、最良の結果を返す。

    Args:
        pdf_path: PDFファイルパス
        strategies: 試行する戦略名リスト（デフォルト: ["pymupdf", "pdfminer", "ocr"]）
        quality_threshold: この品質スコア以上で早期終了する閾値

    Returns:
        最も品質スコアが高い ExtractionResult
    """
    if strategies is None:
        strategies = ["pymupdf", "pdfminer", "ocr"]

    results: list[ExtractionResult] = []

    for strategy_name in strategies:
        logger.info(f"Trying strategy: {strategy_name}")
        try:
            result = run_strategy(strategy_name, pdf_path)

            # 品質スコアリング
            result.quality_score = evaluate_quality(result.text, result.page_texts)
            details = quality_details(result.text, result.page_texts)

            results.append(result)

            logger.info(
                f"  [{strategy_name}] score={result.quality_score:.4f}, "
                f"pages={result.page_count}, "
                f"chars={details.get('total_chars', 0)}, "
                f"ctrl_ratio={details.get('control_char_ratio', 0):.4f}, "
                f"elapsed={result.elapsed_ms}ms"
            )

            if result.warnings:
                for w in result.warnings[:5]:  # 最大5件表示
                    logger.debug(f"  Warning: {w}")
                if len(result.warnings) > 5:
                    logger.debug(
                        f"  ... and {len(result.warnings) - 5} more warnings"
                    )

            # 十分な品質なら早期終了
            if result.quality_score >= quality_threshold:
                logger.info(
                    f"  Quality threshold met ({result.quality_score:.4f} >= {quality_threshold}). "
                    f"Using {strategy_name}."
                )
                break

        except RuntimeError as e:
            # ライブラリ未インストール等の想定内エラー
            logger.warning(f"  [{strategy_name}] skipped: {e}")
        except Exception as e:
            logger.error(f"  [{strategy_name}] failed: {e}", exc_info=True)

    if not results:
        logger.error("All extraction strategies failed.")
        return ExtractionResult(
            text="",
            method="none",
            page_count=0,
            quality_score=0.0,
            warnings=["All extraction strategies failed"],
            page_texts=[],
            elapsed_ms=0,
        )

    # 最良の結果を選択
    best = max(results, key=lambda r: r.quality_score)

    # 複数方式を試した場合はログに比較を出力
    if len(results) > 1:
        logger.info("--- Strategy comparison ---")
        for r in results:
            marker = " <<<" if r.method == best.method else ""
            logger.info(
                f"  {r.method}: score={r.quality_score:.4f}, "
                f"elapsed={r.elapsed_ms}ms{marker}"
            )

    logger.info(f"Selected strategy: {best.method} (score={best.quality_score:.4f})")

    return best


def format_output(result: ExtractionResult, pdf_path: str) -> str:
    """
    抽出結果を既存フォーマット互換のテキストに整形する。

    既存フォーマット:
        # PDF Text Extraction
        # Source: <filename>
        # Pages: <n>
        (空行)
        ============================================================
        PAGE 1
        ============================================================
        (テキスト)
        ...
    """
    lines: list[str] = []

    # メタデータヘッダー
    lines.append("# PDF Text Extraction")
    lines.append(f"# Source: {os.path.basename(pdf_path)}")
    lines.append(f"# Pages: {result.page_count}")
    lines.append(f"# Method: {result.method}")
    lines.append(f"# Quality: {result.quality_score:.4f}")
    lines.append("")

    # ページ別テキスト
    for i, page_text in enumerate(result.page_texts):
        lines.append(f"\n{'=' * 60}")
        lines.append(f"PAGE {i + 1}")
        lines.append(f"{'=' * 60}\n")
        lines.append(page_text)

    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    """コマンドライン引数をパースする。"""
    parser = argparse.ArgumentParser(
        description="PDFデータシートからテキストを抽出する（マルチ戦略版）"
    )
    parser.add_argument("pdf_path", help="入力PDFファイルのパス")
    parser.add_argument("output_path", nargs="?", default=None, help="出力テキストファイルのパス（省略時は標準出力）")
    parser.add_argument(
        "--strategies",
        default="pymupdf,pdfminer,ocr",
        help="試行する戦略（カンマ区切り）。デフォルト: pymupdf,pdfminer,ocr",
    )
    parser.add_argument(
        "--quality-threshold",
        type=float,
        default=0.8,
        help="品質スコア閾値（これ以上で早期終了）。デフォルト: 0.8",
    )
    parser.add_argument(
        "--log-file",
        default=None,
        help="ログファイルパス（指定時はファイルにも出力）",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="詳細ログを出力する",
    )
    parser.add_argument(
        "--json-meta",
        default=None,
        help="メタ情報をJSON形式で出力するファイルパス",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # ログ設定
    setup_logging(log_file=args.log_file, verbose=args.verbose)

    # PDF存在確認
    if not os.path.exists(args.pdf_path):
        logger.error(f"PDF file not found: {args.pdf_path}")
        sys.exit(1)

    # 戦略リスト
    strategies = [s.strip() for s in args.strategies.split(",") if s.strip()]
    for s in strategies:
        if s not in STRATEGIES:
            logger.error(
                f"Unknown strategy: {s}. Available: {list(STRATEGIES.keys())}"
            )
            sys.exit(1)

    logger.info(f"Input: {args.pdf_path}")
    logger.info(f"Strategies: {strategies}")
    logger.info(f"Quality threshold: {args.quality_threshold}")

    total_start = time.time()

    # フォールバック抽出
    result = extract_with_fallback(
        args.pdf_path,
        strategies=strategies,
        quality_threshold=args.quality_threshold,
    )

    # テキスト正規化
    if result.text:
        result.text = normalize_text(result.text)
        # ページ別テキストも正規化
        result.page_texts = [normalize_text(pt) for pt in result.page_texts]

    total_elapsed = int((time.time() - total_start) * 1000)

    # 出力テキスト整形
    output_text = format_output(result, args.pdf_path)

    # ファイル出力 or 標準出力
    if args.output_path:
        with open(args.output_path, "w", encoding="utf-8") as f:
            f.write(output_text)
        logger.info(f"Text extracted to: {args.output_path}")
    else:
        print(output_text)

    # メタ情報JSON出力
    if args.json_meta:
        meta = {
            "pdf_path": args.pdf_path,
            "method": result.method,
            "page_count": result.page_count,
            "quality_score": result.quality_score,
            "quality_details": quality_details(result.text, result.page_texts),
            "warnings": result.warnings,
            "elapsed_ms": result.elapsed_ms,
            "total_elapsed_ms": total_elapsed,
            "strategies_tried": strategies,
        }
        with open(args.json_meta, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        logger.info(f"Metadata written to: {args.json_meta}")

    logger.info(
        f"Done. method={result.method}, score={result.quality_score:.4f}, "
        f"total_elapsed={total_elapsed}ms"
    )

    # 品質が低い場合は警告
    if result.quality_score < 0.5:
        logger.warning(
            f"Low quality extraction (score={result.quality_score:.4f}). "
            f"The text may contain garbled characters."
        )


if __name__ == "__main__":
    main()
