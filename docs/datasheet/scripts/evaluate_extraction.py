#!/usr/bin/env python3
"""
PDF抽出品質の一括評価スクリプト

docs/datasheet/output/ 配下の全PDFに対して各抽出方式を試行し、
品質スコアの比較レポートを出力する。

使用方法:
    python evaluate_extraction.py [output_dir]
    python evaluate_extraction.py docs/datasheet/output/
    python evaluate_extraction.py docs/datasheet/output/ --csv report.csv

引数を省略した場合は docs/datasheet/output/ を使用する。
"""

import argparse
import csv
import io
import json
import os
import sys
import time
from pathlib import Path

# 同ディレクトリのモジュールをインポート
sys.path.insert(0, str(Path(__file__).parent))

from pdf_extractors import ExtractionResult, run_strategy, STRATEGIES
from pdf_quality import evaluate_quality, quality_details
from pdf_normalize import normalize_text


def find_pdfs(output_dir: str) -> list[tuple[str, str]]:
    """
    output_dir 配下の <id>/<id>.pdf を探す。

    Returns:
        [(datasheet_id, pdf_path), ...]
    """
    results = []
    output_path = Path(output_dir)
    if not output_path.exists():
        return results

    for entry in sorted(output_path.iterdir()):
        if not entry.is_dir():
            continue
        datasheet_id = entry.name
        pdf_file = entry / f"{datasheet_id}.pdf"
        if pdf_file.exists():
            results.append((datasheet_id, str(pdf_file)))
    return results


def evaluate_single(
    datasheet_id: str,
    pdf_path: str,
    strategies: list[str],
) -> list[dict]:
    """
    1つのPDFに対して各方式を試行し、結果を返す。
    """
    rows = []
    for strategy_name in strategies:
        row = {
            "datasheet_id": datasheet_id,
            "strategy": strategy_name,
            "page_count": 0,
            "total_chars": 0,
            "quality_score": 0.0,
            "control_char_ratio": 0.0,
            "printable_ratio": 0.0,
            "alnum_ratio": 0.0,
            "replacement_chars": 0,
            "elapsed_ms": 0,
            "error": "",
            "text_preview": "",
        }
        try:
            result = run_strategy(strategy_name, pdf_path)
            result.quality_score = evaluate_quality(result.text, result.page_texts)
            details = quality_details(result.text, result.page_texts)

            # 正規化後テキストでも品質チェック
            normalized = normalize_text(result.text)

            row["page_count"] = result.page_count
            row["total_chars"] = details.get("total_chars", 0)
            row["quality_score"] = result.quality_score
            row["control_char_ratio"] = details.get("control_char_ratio", 0)
            row["printable_ratio"] = details.get("printable_ratio", 0)
            row["alnum_ratio"] = details.get("alnum_ratio", 0)
            row["replacement_chars"] = details.get("replacement_char_count", 0)
            row["elapsed_ms"] = result.elapsed_ms
            # テキストプレビュー（先頭200文字、改行を空白に変換）
            preview = normalized[:200].replace("\n", " ").replace("\r", "")
            row["text_preview"] = preview

        except Exception as e:
            row["error"] = str(e)[:200]

        rows.append(row)
    return rows


def print_report(all_rows: list[dict]) -> None:
    """コンソールにレポートを表示する。"""
    # ヘッダー
    print()
    print("=" * 100)
    print("PDF Extraction Quality Report")
    print("=" * 100)

    current_id = None
    for row in all_rows:
        if row["datasheet_id"] != current_id:
            current_id = row["datasheet_id"]
            print(f"\n--- {current_id} ---")

        if row["error"]:
            print(
                f"  {row['strategy']:>10s}: ERROR - {row['error'][:80]}"
            )
        else:
            marker = ""
            if row["quality_score"] < 0.5:
                marker = " *** LOW QUALITY ***"
            print(
                f"  {row['strategy']:>10s}: "
                f"score={row['quality_score']:.4f}  "
                f"chars={row['total_chars']:>6d}  "
                f"ctrl={row['control_char_ratio']:.4f}  "
                f"alnum={row['alnum_ratio']:.4f}  "
                f"elapsed={row['elapsed_ms']:>5d}ms"
                f"{marker}"
            )

    # サマリー
    print(f"\n{'=' * 100}")
    print("Summary")
    print(f"{'=' * 100}")

    # 各データシートの最良方式を表示
    datasheet_ids = sorted({r["datasheet_id"] for r in all_rows})
    for ds_id in datasheet_ids:
        ds_rows = [r for r in all_rows if r["datasheet_id"] == ds_id and not r["error"]]
        if ds_rows:
            best = max(ds_rows, key=lambda r: r["quality_score"])
            print(
                f"  {ds_id}: best={best['strategy']} "
                f"(score={best['quality_score']:.4f})"
            )
        else:
            print(f"  {ds_id}: ALL FAILED")

    print()


def write_csv(all_rows: list[dict], csv_path: str) -> None:
    """結果をCSVファイルに出力する。"""
    if not all_rows:
        return

    fieldnames = [
        "datasheet_id",
        "strategy",
        "page_count",
        "total_chars",
        "quality_score",
        "control_char_ratio",
        "printable_ratio",
        "alnum_ratio",
        "replacement_chars",
        "elapsed_ms",
        "error",
        "text_preview",
    ]

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"CSV report written to: {csv_path}")


def main():
    parser = argparse.ArgumentParser(
        description="PDF抽出品質の一括評価"
    )
    parser.add_argument(
        "output_dir",
        nargs="?",
        default=None,
        help="docs/datasheet/output/ ディレクトリのパス（省略時は自動検出）",
    )
    parser.add_argument(
        "--csv",
        default=None,
        help="CSVレポートの出力パス",
    )
    parser.add_argument(
        "--strategies",
        default="pymupdf,pdfminer",
        help="評価する戦略（カンマ区切り）。デフォルト: pymupdf,pdfminer",
    )
    parser.add_argument(
        "--include-ocr",
        action="store_true",
        help="OCR戦略も含める（時間がかかる）",
    )
    args = parser.parse_args()

    # output_dir の自動検出
    if args.output_dir:
        output_dir = args.output_dir
    else:
        # スクリプトの位置から推測
        script_dir = Path(__file__).parent
        output_dir = str(script_dir.parent / "output")

    strategies = [s.strip() for s in args.strategies.split(",") if s.strip()]
    if args.include_ocr and "ocr" not in strategies:
        strategies.append("ocr")

    print(f"Output directory: {output_dir}")
    print(f"Strategies: {strategies}")

    # PDF検索
    pdfs = find_pdfs(output_dir)
    if not pdfs:
        print(f"No PDFs found in {output_dir}")
        print("PDFs should be placed at: <output_dir>/<datasheet-id>/<datasheet-id>.pdf")
        sys.exit(1)

    print(f"Found {len(pdfs)} PDF(s)")
    print()

    # 一括評価
    all_rows: list[dict] = []
    for i, (datasheet_id, pdf_path) in enumerate(pdfs):
        print(f"[{i + 1}/{len(pdfs)}] Evaluating: {datasheet_id}...")
        rows = evaluate_single(datasheet_id, pdf_path, strategies)
        all_rows.extend(rows)

    # レポート出力
    print_report(all_rows)

    # CSV出力
    if args.csv:
        write_csv(all_rows, args.csv)


if __name__ == "__main__":
    main()
