#!/usr/bin/env python3
"""Analyze code quality signals across a repository."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
    "__pycache__",
    ".venv",
    "venv",
}

CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".go"}

PATTERNS = {
    "console_log": re.compile(r"\bconsole\.(log|debug|info)\("),
    "todo_fixme": re.compile(r"\b(TODO|FIXME|HACK)\b"),
    "any_type": re.compile(r":\s*any\b|<any>"),
    "eslint_disable": re.compile(r"eslint-disable"),
    "hardcoded_secret": re.compile(
        r"(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]+['\"]",
        re.IGNORECASE,
    ),
    "sql_concat": re.compile(r"(SELECT|INSERT|UPDATE|DELETE).+\+\s*", re.IGNORECASE),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run code quality heuristics on a project.")
    parser.add_argument(
        "target_path",
        nargs="?",
        default=".",
        help="Project root to analyze (default: current directory)",
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Run full analysis (default when no other flags are set)",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument(
        "--max-files",
        type=int,
        default=5000,
        help="Maximum source files to scan",
    )
    return parser.parse_args()


def should_skip(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def iter_source_files(root: Path, max_files: int) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if len(files) >= max_files:
            break
        if path.is_file() and path.suffix.lower() in CODE_EXTENSIONS and not should_skip(path.relative_to(root)):
            files.append(path)
    return files


def scan_file(path: Path) -> tuple[dict[str, int], list[str]]:
    counts: dict[str, int] = defaultdict(int)
    findings: list[str] = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError as exc:
        findings.append(f"Could not read file: {exc}")
        return counts, findings

    lines = text.splitlines()
    if len(lines) > 400:
        counts["long_file"] += 1
        findings.append(f"Long file ({len(lines)} lines) — consider splitting responsibilities.")

    for name, pattern in PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            counts[name] += len(matches)
            if name == "hardcoded_secret":
                findings.append("Potential hardcoded secret detected — move to environment variables.")
            if name == "sql_concat":
                findings.append("Possible SQL string concatenation — use parameterized queries.")
            if name == "any_type":
                findings.append("Explicit `any` usage reduces type safety.")

    return counts, findings


def score(total_counts: Counter, file_count: int) -> dict[str, str | int]:
    penalty = (
        total_counts["console_log"] * 1
        + total_counts["todo_fixme"] * 2
        + total_counts["any_type"] * 2
        + total_counts["eslint_disable"] * 3
        + total_counts["hardcoded_secret"] * 10
        + total_counts["sql_concat"] * 8
        + total_counts["long_file"] * 2
    )
    base = max(file_count * 5, 50)
    quality_score = max(0, min(100, 100 - int((penalty / base) * 100)))
    grade = "A" if quality_score >= 90 else "B" if quality_score >= 75 else "C" if quality_score >= 60 else "D"
    return {"score": quality_score, "grade": grade, "penalty_points": penalty}


def analyze(root: Path, max_files: int) -> dict:
    files = iter_source_files(root, max_files)
    total_counts: Counter = Counter()
    file_findings: dict[str, list[str]] = {}

    for file in files:
        counts, findings = scan_file(file)
        total_counts.update(counts)
        if findings:
            file_findings[str(file.relative_to(root))] = findings

    result = {
        "root": str(root.resolve()),
        "files_scanned": len(files),
        "signals": dict(total_counts),
        "scorecard": score(total_counts, len(files)),
        "top_findings": file_findings,
        "recommendations": build_recommendations(total_counts),
    }
    return result


def build_recommendations(counts: Counter) -> list[str]:
    recs: list[str] = []
    if counts["console_log"]:
        recs.append("Replace console logging in production paths with structured logging.")
    if counts["todo_fixme"]:
        recs.append("Track TODO/FIXME items in issues and resolve before release.")
    if counts["any_type"]:
        recs.append("Replace `any` with domain types or generics.")
    if counts["eslint_disable"]:
        recs.append("Reduce eslint-disable usage; fix root causes instead.")
    if counts["hardcoded_secret"]:
        recs.append("Rotate exposed secrets and load credentials from secure env/secret stores.")
    if counts["sql_concat"]:
        recs.append("Use ORM/query builders with bound parameters for all SQL.")
    if counts["long_file"]:
        recs.append("Split large modules by feature to improve testability.")
    if not recs:
        recs.append("No major quality signals detected. Maintain tests and lint gates in CI.")
    return recs


def print_report(report: dict) -> None:
    print(f"Code quality analysis: {report['root']}")
    print(f"Files scanned: {report['files_scanned']}")
    print(
        f"Score: {report['scorecard']['score']}/100 (grade {report['scorecard']['grade']})"
    )
    print("\nSignals:")
    for key, value in sorted(report["signals"].items()):
        print(f"  - {key}: {value}")

    print("\nRecommendations:")
    for idx, rec in enumerate(report["recommendations"], start=1):
        print(f"  {idx}. {rec}")

    if report["top_findings"]:
        print("\nNotable files:")
        for path, findings in list(report["top_findings"].items())[:10]:
            print(f"  - {path}")
            for finding in findings[:2]:
                print(f"      * {finding}")


def main() -> int:
    args = parse_args()
    root = Path(args.target_path).resolve()

    if not root.exists() or not root.is_dir():
        print(f"Error: invalid directory: {root}", file=sys.stderr)
        return 1

    report = analyze(root, args.max_files)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
