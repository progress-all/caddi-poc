#!/usr/bin/env python3
"""
PDFデータシートから表構造を抽出するスクリプト

複数の表抽出方式を試行し、品質スコアリングにより最適な結果を採用する。
フラットテキスト抽出 (extract_pdf_text.py) では失われる行列関係を保持する。

使用方法:
    python extract_tables.py <input_pdf> [output_tables.json]
    python extract_tables.py <input_pdf> [output_tables.json] --strategies pdfplumber,pymupdf
    python extract_tables.py <input_pdf> [output_tables.json] --quality-threshold 0.6
    python extract_tables.py <input_pdf> [output_tables.json] --log-file tables.log

例:
    python extract_tables.py ../output/ST_1N5822/ST_1N5822.pdf
    python extract_tables.py input.pdf tables.json --strategies pdfplumber,pymupdf
"""

import argparse
import io
import json
import logging
import os
import sys
import time
from pathlib import Path

# Windows での stdout エンコーディングを UTF-8 に強制
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# 同ディレクトリのモジュールをインポート可能にする
sys.path.insert(0, str(Path(__file__).parent))

from pdf_table_extractor import (
    ExtractedTable,
    TableExtractionResult,
    run_table_strategy,
    TABLE_STRATEGIES,
)
from table_quality import evaluate_table_quality, table_quality_details

# ロガー設定
logger = logging.getLogger("extract_tables")


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
    quality_threshold: float = 0.6,
) -> TableExtractionResult:
    """
    複数の表抽出方式をフォールバックで試行し、最良の結果を返す。

    Args:
        pdf_path: PDFファイルパス
        strategies: 試行する戦略名リスト（デフォルト: ["pdfplumber", "pymupdf"]）
        quality_threshold: この品質スコア以上で早期終了する閾値

    Returns:
        最も品質スコアが高い TableExtractionResult
    """
    if strategies is None:
        strategies = ["pdfplumber", "pymupdf"]

    results: list[TableExtractionResult] = []

    for strategy_name in strategies:
        logger.info(f"Trying table strategy: {strategy_name}")
        try:
            result = run_table_strategy(strategy_name, pdf_path)

            # 各テーブルの品質スコアリング
            for table in result.tables:
                table.quality_score = evaluate_table_quality(table)

            results.append(result)

            # 結果サマリーをログ出力
            if result.tables:
                scores = [t.quality_score for t in result.tables]
                avg_score = sum(scores) / len(scores)
                min_score = min(scores)
                above_threshold = sum(1 for s in scores if s >= quality_threshold)

                logger.info(
                    f"  [{strategy_name}] tables={len(result.tables)}, "
                    f"avg_score={avg_score:.4f}, min_score={min_score:.4f}, "
                    f"above_threshold={above_threshold}/{len(result.tables)}, "
                    f"elapsed={result.elapsed_ms}ms"
                )

                # 各テーブルの詳細
                for i, table in enumerate(result.tables):
                    logger.debug(
                        f"  Table {i + 1} (p.{table.page}): "
                        f"score={table.quality_score:.4f}, "
                        f"headers={table.headers}, "
                        f"rows={len(table.rows)}"
                    )
                    if table.warnings:
                        for w in table.warnings:
                            logger.debug(f"    Warning: {w}")

                # 平均品質が閾値以上なら早期終了
                if avg_score >= quality_threshold:
                    logger.info(
                        f"  Quality threshold met (avg={avg_score:.4f} >= {quality_threshold}). "
                        f"Using {strategy_name}."
                    )
                    break
            else:
                logger.info(
                    f"  [{strategy_name}] No tables found. "
                    f"elapsed={result.elapsed_ms}ms"
                )

            if result.warnings:
                for w in result.warnings[:5]:
                    logger.debug(f"  Warning: {w}")
                if len(result.warnings) > 5:
                    logger.debug(
                        f"  ... and {len(result.warnings) - 5} more warnings"
                    )

        except RuntimeError as e:
            logger.warning(f"  [{strategy_name}] skipped: {e}")
        except Exception as e:
            logger.error(f"  [{strategy_name}] failed: {e}", exc_info=True)

    if not results:
        logger.error("All table extraction strategies failed.")
        return TableExtractionResult(
            tables=[],
            method="none",
            page_count=0,
            elapsed_ms=0,
            warnings=["All table extraction strategies failed"],
        )

    # テーブルが見つかった結果の中から最良を選択
    results_with_tables = [r for r in results if r.tables]

    if not results_with_tables:
        logger.warning("No tables found by any strategy.")
        return results[0]  # テーブルが見つからなかった結果を返す

    # 平均品質スコアで比較
    def avg_quality(r: TableExtractionResult) -> float:
        if not r.tables:
            return 0.0
        return sum(t.quality_score for t in r.tables) / len(r.tables)

    best = max(results_with_tables, key=avg_quality)

    # 複数方式を試した場合はログに比較を出力
    if len(results_with_tables) > 1:
        logger.info("--- Strategy comparison ---")
        for r in results_with_tables:
            marker = " <<<" if r.method == best.method else ""
            logger.info(
                f"  {r.method}: tables={len(r.tables)}, "
                f"avg_score={avg_quality(r):.4f}, "
                f"elapsed={r.elapsed_ms}ms{marker}"
            )

    logger.info(
        f"Selected strategy: {best.method} "
        f"(tables={len(best.tables)}, avg_score={avg_quality(best):.4f})"
    )

    return best


def format_output(
    result: TableExtractionResult,
    pdf_path: str,
    quality_threshold: float,
) -> dict:
    """
    抽出結果をJSON出力用の辞書に整形する。
    """
    tables_data = []
    for table in result.tables:
        table_dict = table.to_dict()
        # 品質詳細も付与
        table_dict["quality_details"] = table_quality_details(table)
        tables_data.append(table_dict)

    # 品質サマリー
    scores = [t.quality_score for t in result.tables] if result.tables else []
    column_issues = []
    for table in result.tables:
        for w in table.warnings:
            if "misalignment" in w.lower() or "inversion" in w.lower():
                column_issues.append({
                    "page": table.page,
                    "title": table.title,
                    "warning": w,
                })

    quality_summary = {
        "avg_score": round(sum(scores) / len(scores), 4) if scores else 0.0,
        "min_score": round(min(scores), 4) if scores else 0.0,
        "max_score": round(max(scores), 4) if scores else 0.0,
        "tables_above_threshold": sum(
            1 for s in scores if s >= quality_threshold
        ),
        "total_tables": len(result.tables),
        "column_alignment_issues": column_issues,
    }

    return {
        "pdf_path": os.path.basename(pdf_path),
        "method": result.method,
        "page_count": result.page_count,
        "total_tables": len(result.tables),
        "elapsed_ms": result.elapsed_ms,
        "quality_threshold": quality_threshold,
        "quality_summary": quality_summary,
        "tables": tables_data,
        "warnings": result.warnings,
    }


def parse_args() -> argparse.Namespace:
    """コマンドライン引数をパースする。"""
    parser = argparse.ArgumentParser(
        description="PDFデータシートから表構造を抽出する"
    )
    parser.add_argument("pdf_path", help="入力PDFファイルのパス")
    parser.add_argument(
        "output_path",
        nargs="?",
        default=None,
        help="出力JSONファイルのパス（省略時は標準出力）",
    )
    parser.add_argument(
        "--strategies",
        default="pdfplumber,pymupdf",
        help="試行する戦略（カンマ区切り）。デフォルト: pdfplumber,pymupdf",
    )
    parser.add_argument(
        "--quality-threshold",
        type=float,
        default=0.6,
        help="品質スコア閾値（これ以上で早期終了）。デフォルト: 0.6",
    )
    parser.add_argument(
        "--log-file",
        default=None,
        help="ログファイルパス（指定時はファイルにも出力）",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="詳細ログを出力する",
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
        if s not in TABLE_STRATEGIES:
            logger.error(
                f"Unknown table strategy: {s}. "
                f"Available: {list(TABLE_STRATEGIES.keys())}"
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

    total_elapsed = int((time.time() - total_start) * 1000)

    # JSON出力整形
    output_data = format_output(result, args.pdf_path, args.quality_threshold)
    output_data["total_elapsed_ms"] = total_elapsed

    output_json = json.dumps(output_data, ensure_ascii=False, indent=2)

    # ファイル出力 or 標準出力
    if args.output_path:
        with open(args.output_path, "w", encoding="utf-8") as f:
            f.write(output_json)
        logger.info(f"Tables extracted to: {args.output_path}")
    else:
        print(output_json)

    logger.info(
        f"Done. method={result.method}, "
        f"tables={len(result.tables)}, "
        f"total_elapsed={total_elapsed}ms"
    )

    # テーブルが見つからなかった場合は警告
    if not result.tables:
        logger.warning("No tables were extracted from the PDF.")

    # 品質が低いテーブルがある場合は警告
    low_quality = [
        t for t in result.tables if t.quality_score < 0.4
    ]
    if low_quality:
        logger.warning(
            f"{len(low_quality)} table(s) have low quality scores (< 0.4). "
            f"Table structure may be unreliable."
        )


if __name__ == "__main__":
    main()
