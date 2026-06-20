#!/usr/bin/env python3
"""Analyze a project structure and emit actionable recommendations."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze project structure, metrics, and recommendations."
    )
    parser.add_argument(
        "target_path",
        nargs="?",
        default=".",
        help="Project root to analyze (default: current directory)",
    )
    parser.add_argument("--verbose", action="store_true", help="Print detailed findings")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output machine-readable JSON report",
    )
    return parser.parse_args()


def should_skip(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def collect_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if path.is_file() and not should_skip(path.relative_to(root)):
            files.append(path)
    return files


def detect_stack(files: list[Path]) -> dict[str, bool]:
    names = {f.name for f in files}
    rel_paths = {str(f).replace("\\", "/") for f in files}
    return {
        "nextjs": "next.config.ts" in names
        or "next.config.js" in names
        or any("/app/" in p or p.endswith("/app") for p in rel_paths),
        "react": "package.json" in names,
        "graphql": any("graphql" in p.lower() for p in rel_paths),
        "prisma": "schema.prisma" in names,
        "docker": "Dockerfile" in names or "docker-compose.yml" in names,
        "typescript": any(f.suffix in {".ts", ".tsx"} for f in files),
        "tests": any(
            "test" in f.name.lower() or f.suffix in {".spec.ts", ".test.ts", ".spec.tsx", ".test.tsx"}
            for f in files
        ),
        "env_example": ".env.example" in names,
        "ci": any(p.startswith(".github/workflows/") for p in rel_paths),
    }


def compute_metrics(root: Path, files: list[Path]) -> dict[str, int | float]:
    ext_counts = Counter(f.suffix.lower() for f in files)
    total_lines = 0
    for file in files:
        if file.suffix.lower() in {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".sql"}:
            try:
                total_lines += sum(1 for _ in file.open("r", encoding="utf-8", errors="ignore"))
            except OSError:
                continue
    return {
        "file_count": len(files),
        "typescript_files": ext_counts[".ts"] + ext_counts[".tsx"],
        "javascript_files": ext_counts[".js"] + ext_counts[".jsx"],
        "python_files": ext_counts[".py"],
        "estimated_loc": total_lines,
    }


def build_recommendations(root: Path, stack: dict[str, bool], metrics: dict[str, int | float]) -> list[str]:
    recs: list[str] = []

    if stack["react"] and not stack["typescript"]:
        recs.append("Adopt TypeScript for stronger contracts across frontend and backend.")
    if stack["nextjs"] and not stack["env_example"]:
        recs.append("Add .env.example documenting required environment variables.")
    if stack["prisma"] and not (root / "prisma" / "migrations").exists():
        recs.append("Initialize Prisma migrations before production deployment.")
    if stack["graphql"] and not stack["tests"]:
        recs.append("Add GraphQL resolver and schema tests to prevent regressions.")
    if not stack["docker"]:
        recs.append("Add Dockerfile and docker-compose for reproducible local and CI environments.")
    if not stack["ci"]:
        recs.append("Configure CI (GitHub Actions) for lint, test, and build on every PR.")
    if metrics["estimated_loc"] > 5000 and not stack["tests"]:
        recs.append("Project size warrants automated test coverage for critical paths.")
    if stack["nextjs"] and not any((root / "src" / "lib").exists(), (root / "lib").exists()):
        recs.append("Create a shared lib/ layer for database, auth, and API clients.")

    if not recs:
        recs.append("Project structure looks healthy. Focus on monitoring and incremental refactors.")

    return recs


def analyze(root: Path) -> dict:
    files = collect_files(root)
    stack = detect_stack(files)
    metrics = compute_metrics(root, files)
    recommendations = build_recommendations(root, stack, metrics)
    return {
        "root": str(root.resolve()),
        "stack": stack,
        "metrics": metrics,
        "recommendations": recommendations,
    }


def print_report(report: dict, verbose: bool) -> None:
    print(f"Project analysis: {report['root']}")
    print("\nDetected stack:")
    for key, enabled in report["stack"].items():
        print(f"  - {key}: {'yes' if enabled else 'no'}")

    print("\nMetrics:")
    for key, value in report["metrics"].items():
        print(f"  - {key}: {value}")

    print("\nRecommendations:")
    for idx, rec in enumerate(report["recommendations"], start=1):
        print(f"  {idx}. {rec}")

    if verbose:
        print("\nVerbose notes:")
        print("  - Re-run with --json for CI integration.")
        print("  - Pair recommendations with references/architecture_patterns.md.")


def main() -> int:
    args = parse_args()
    root = Path(args.target_path).resolve()

    if not root.exists():
        print(f"Error: path not found: {root}", file=sys.stderr)
        return 1
    if not root.is_dir():
        print(f"Error: not a directory: {root}", file=sys.stderr)
        return 1

    report = analyze(root)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report, args.verbose)
    return 0


if __name__ == "__main__":
    sys.exit(main())
