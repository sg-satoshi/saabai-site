#!/usr/bin/env python3
"""Build the OALC citation index, and optionally load it into Postgres.

The corpus file (about 8.8 GB for OALC v7.1.0) is a build-time input. This
script streams it one line at a time and drops judgment text immediately, so
the text is never written to the index. v0 reads the citation CSV only.

Outputs, all gitignored, written under --out-dir (default: the working directory):

  oalc_citations.csv          citation,source,jurisdiction,date,date_precision,url,version_id
  oalc_citation_aliases.csv   losing URLs that still resolve to the canonical row
  oalc_dedupe_log.csv         every dropped duplicate whose URL differs
  oalc_build_meta.json        corpus_version, corpus_sha256, cutoff, counts

In-scope rows are decisions from NSW Caselaw, the Federal Court and the High
Court. Legislation and every other court are skipped.

Dedupe key: normalised medium-neutral citation when one is present, otherwise
the casefolded citation. Keep the row that has a corpus date (date_precision
day). If neither or both are dated, keep the later version_id. A missing
corpus date is filled from the year inside the citation and marked
date_precision year. Those rows are kept. They are never stored as a full day.
If no year can be parsed, date is empty and date_precision is none.

`load` upserts the CSV into Postgres with COPY, using DATABASE_URL. It does
not connect unless --confirm-write is passed. Do not point it at a live
project. The Sydney database this table belongs to is not created yet.

Loader dependency (not an app dependency): pip install "psycopg[binary]"
Apply db/migrations/006_oalc_citations.sql in that project before loading.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_VERSION = "v7.1.0"
DEFAULT_CUTOFF = "2025-03-10"

SOURCE_MAP = {
    "nsw caselaw": "NSW Caselaw",
    "nsw_caselaw": "NSW Caselaw",
    "federal court": "Federal Court",
    "federal court of australia": "Federal Court",
    "federal_court_of_australia": "Federal Court",
    "high court": "High Court",
    "high court of australia": "High Court",
    "high_court_of_australia": "High Court",
}

LEGISLATION_TYPES = {
    "primary_legislation",
    "secondary_legislation",
    "bill",
    "legislation",
    "regulation",
    "regulations",
}

DECISION_TYPES = {"decision", "case", "judgment", "judgement", ""}

# Medium-neutral citation, brackets required, space between court and number optional.
MNC_RE = re.compile(
    r"\[(\d{4})\]\s*([A-Za-z][A-Za-z0-9]*)\s*(\d+[A-Za-z]?)",
    re.IGNORECASE,
)
YEAR_PAREN_RE = re.compile(r"\((1[89]\d{2}|20\d{2})\)")
YEAR_WORD_RE = re.compile(r"\b(1[89]\d{2}|20\d{2})\b")
ISO_IN_VERSION_RE = re.compile(
    r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?"
)

CITATION_FIELDS = [
    "citation",
    "source",
    "jurisdiction",
    "date",
    "date_precision",
    "url",
    "version_id",
]


def normalise_citation(raw: str) -> str:
    """Same rules as normaliseCitation in lib/oalc-disclosure.ts."""
    s = unicodedata.normalize("NFKC", raw or "")
    s = s.replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\[\s+", "[", s)
    s = re.sub(r"\s+\]", "]", s)
    match = MNC_RE.search(s)
    if match:
        return f"[{match.group(1)}] {match.group(2).upper()} {match.group(3).upper()}"
    return s.casefold()


def citation_year(raw: str) -> int | None:
    s = unicodedata.normalize("NFKC", raw or "")
    match = MNC_RE.search(s)
    if match:
        return int(match.group(1))
    match = YEAR_PAREN_RE.search(s)
    if match:
        return int(match.group(1))
    match = YEAR_WORD_RE.search(s)
    if match:
        return int(match.group(1))
    return None


def classify_corpus_date(raw: object) -> tuple[str | None, str | None]:
    """Return (date, precision) when the corpus itself supplied a date."""
    if raw is None:
        return None, None
    s = str(raw).strip()
    if not s or s.lower() in {"null", "none", "n/a"}:
        return None, None
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10], "day"
    if re.fullmatch(r"\d{4}", s):
        return s, "year"
    return None, None


def resolve_date(corpus_date: object, citation: str) -> tuple[str, str]:
    day, precision = classify_corpus_date(corpus_date)
    if precision == "day" and day:
        return day, "day"
    if precision == "year" and day:
        return day, "year"
    year = citation_year(citation)
    if year is not None:
        return str(year), "year"
    return "", "none"


def version_key(version_id: str) -> str:
    """Later version_id. An ISO timestamp inside the id sorts ahead of a bare string."""
    found = ISO_IN_VERSION_RE.findall(version_id or "")
    if found:
        return found[-1]
    return version_id or ""


def canonical_source(raw: str) -> str | None:
    key = re.sub(r"[\s_]+", " ", (raw or "").strip().lower())
    return SOURCE_MAP.get(key)


def is_legislation(doc: dict) -> bool:
    typ = str(doc.get("type") or "").strip().lower()
    if typ in LEGISLATION_TYPES:
        return True
    source = str(doc.get("source") or "").lower()
    return "legislation" in source or "federal register" in source


def jurisdiction_of(doc: dict, source_label: str) -> str:
    raw = str(doc.get("jurisdiction") or "").strip()
    if raw:
        return raw
    if source_label == "NSW Caselaw":
        return "new_south_wales"
    return "commonwealth"


def better(kept: dict, cand: dict) -> dict:
    """Dated corpus row first, then the later version_id."""
    kept_dated = kept["date_precision"] == "day"
    cand_dated = cand["date_precision"] == "day"
    if kept_dated != cand_dated:
        return cand if cand_dated else kept
    if version_key(cand["version_id"]) > version_key(kept["version_id"]):
        return cand
    return kept


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build(args: argparse.Namespace) -> int:
    corpus = Path(args.corpus)
    if not corpus.is_file():
        print(f"corpus not found: {corpus}", file=sys.stderr)
        return 1
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    if args.corpus_sha256:
        digest = args.corpus_sha256.strip().lower()
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            print("--corpus-sha256 must be 64 hex characters", file=sys.stderr)
            return 1
        sha_source = "flag"
    else:
        digest = sha256_file(corpus)
        sha_source = "computed"

    groups: dict[str, list[dict]] = {}
    counts = {
        "lines": 0,
        "unparseable": 0,
        "skipped_legislation": 0,
        "skipped_other_source": 0,
        "skipped_no_citation": 0,
        "skipped_not_decision": 0,
    }

    with corpus.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            counts["lines"] += 1
            if not line.strip():
                continue
            try:
                doc = json.loads(line)
            except json.JSONDecodeError:
                counts["unparseable"] += 1
                continue
            if not isinstance(doc, dict):
                counts["unparseable"] += 1
                continue
            # Judgment text is discarded before the row is kept.
            doc.pop("text", None)
            doc.pop("html", None)
            doc.pop("body", None)

            if is_legislation(doc):
                counts["skipped_legislation"] += 1
                continue
            source = canonical_source(str(doc.get("source") or ""))
            if not source:
                counts["skipped_other_source"] += 1
                continue
            typ = str(doc.get("type") or "").strip().lower()
            if typ not in DECISION_TYPES:
                counts["skipped_not_decision"] += 1
                continue
            citation = str(doc.get("citation") or "").strip()
            url = str(doc.get("url") or "").strip()
            version_id = str(doc.get("version_id") or "").strip()
            if not citation or not url or not version_id:
                counts["skipped_no_citation"] += 1
                continue
            date, precision = resolve_date(doc.get("date"), citation)
            row = {
                "citation": citation,
                "source": source,
                "jurisdiction": jurisdiction_of(doc, source),
                "date": date,
                "date_precision": precision,
                "url": url,
                "version_id": version_id,
                "normalised": normalise_citation(citation),
            }
            groups.setdefault(row["normalised"], []).append(row)

    aliases: list[dict] = []
    dedupe_log: list[dict] = []
    best: dict[str, dict] = {}
    for key, group in groups.items():
        winner = group[0]
        for cand in group[1:]:
            winner = better(winner, cand)
        best[key] = winner
        seen_urls: set[str] = set()
        for row in group:
            if row is winner or row["url"] == winner["url"] or row["url"] in seen_urls:
                continue
            seen_urls.add(row["url"])
            dedupe_log.append({
                "normalised_citation": key,
                "kept_url": winner["url"],
                "dropped_url": row["url"],
                "kept_version_id": winner["version_id"],
                "dropped_version_id": row["version_id"],
                "kept_date_precision": winner["date_precision"],
                "dropped_date_precision": row["date_precision"],
            })
            aliases.append({
                "alias_url": row["url"],
                "citation": winner["citation"],
                "normalised_citation": key,
                "version_id": row["version_id"],
            })

    source_counts = {"NSW Caselaw": 0, "Federal Court": 0, "High Court": 0}
    rows = sorted(best.values(), key=lambda r: (r["source"], r["normalised"]))
    for row in rows:
        source_counts[row["source"]] = source_counts.get(row["source"], 0) + 1

    citations_path = out / "oalc_citations.csv"
    with citations_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CITATION_FIELDS, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row[field] for field in CITATION_FIELDS})

    aliases_path = out / "oalc_citation_aliases.csv"
    with aliases_path.open("w", encoding="utf-8", newline="") as handle:
        fields = ["alias_url", "citation", "normalised_citation", "version_id"]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for alias in aliases:
            writer.writerow(alias)

    log_path = out / "oalc_dedupe_log.csv"
    with log_path.open("w", encoding="utf-8", newline="") as handle:
        fields = [
            "normalised_citation",
            "kept_url",
            "dropped_url",
            "kept_version_id",
            "dropped_version_id",
            "kept_date_precision",
            "dropped_date_precision",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for entry in dedupe_log:
            writer.writerow(entry)

    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta = {
        "corpus_version": args.corpus_version,
        "corpus_sha256": digest,
        "corpus_sha256_source": sha_source,
        "cutoff_date": args.cutoff,
        "built_at": built_at,
        "citation_count": len(rows),
        "alias_count": len(aliases),
        "dedupe_dropped": len(dedupe_log),
        "source_counts": source_counts,
        "unparseable_lines": counts["unparseable"],
        "skipped_legislation": counts["skipped_legislation"],
        "skipped_other_source": counts["skipped_other_source"],
        "skipped_no_citation": counts["skipped_no_citation"],
        "lines_read": counts["lines"],
    }
    (out / "oalc_build_meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    print(f"corpus_version: {meta['corpus_version']}")
    print(f"corpus_sha256: {meta['corpus_sha256']}")
    print(f"corpus_sha256_source: {sha_source}")
    print(f"cutoff_date: {meta['cutoff_date']}")
    print(f"citation_count: {meta['citation_count']}")
    print(f"alias_count: {meta['alias_count']}")
    print("source_counts:")
    for name, count in source_counts.items():
        print(f"  {name}: {count}")
    return 0


def _blank_date(value: str, precision: str) -> str | None:
    if precision == "none" or not (value or "").strip():
        return None
    return value


def load(args: argparse.Namespace) -> int:
    # Refuse before reading DATABASE_URL so a stray env var cannot open a connection.
    if not args.confirm_write:
        print(
            "Refusing to write. The Sydney database is not created yet. "
            "Re-run with --confirm-write only when DATABASE_URL points at that project. "
            "This command does not connect otherwise.",
            file=sys.stderr,
        )
        return 2
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL is not set. Not connecting.", file=sys.stderr)
        return 2
    try:
        import psycopg
    except ImportError:
        print('psycopg is not installed. pip install "psycopg[binary]"', file=sys.stderr)
        return 2

    out = Path(args.out_dir)
    citations_path = out / "oalc_citations.csv"
    aliases_path = out / "oalc_citation_aliases.csv"
    meta_path = out / "oalc_build_meta.json"
    for path in (citations_path, aliases_path, meta_path):
        if not path.is_file():
            print(f"missing {path}. Run the build subcommand first.", file=sys.stderr)
            return 2

    citation_rows: list[tuple] = []
    with citations_path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            citation_rows.append((
                normalise_citation(row["citation"]),
                row["citation"],
                row["source"],
                row["jurisdiction"],
                _blank_date(row.get("date", ""), row["date_precision"]),
                row["date_precision"],
                row["url"],
                row["version_id"],
            ))

    alias_rows: list[tuple] = []
    with aliases_path.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            alias_rows.append((
                row["alias_url"],
                row["normalised_citation"],
                row["citation"],
                row["version_id"],
            ))

    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                create temp table oalc_citations_stage (
                  normalised_citation text,
                  citation text,
                  source text,
                  jurisdiction text,
                  date text,
                  date_precision text,
                  url text,
                  version_id text
                ) on commit drop
                """
            )
            with cur.copy(
                "COPY oalc_citations_stage (normalised_citation, citation, source, jurisdiction, "
                "date, date_precision, url, version_id) FROM STDIN"
            ) as copy:
                for row in citation_rows:
                    copy.write_row(row)
            cur.execute(
                """
                insert into oalc_citations (
                  normalised_citation, citation, source, jurisdiction, date,
                  date_precision, url, version_id
                )
                select normalised_citation, citation, source, jurisdiction, date,
                       date_precision, url, version_id
                from oalc_citations_stage
                on conflict (normalised_citation) do update set
                  citation = excluded.citation,
                  source = excluded.source,
                  jurisdiction = excluded.jurisdiction,
                  date = excluded.date,
                  date_precision = excluded.date_precision,
                  url = excluded.url,
                  version_id = excluded.version_id
                """
            )

            cur.execute(
                """
                create temp table oalc_aliases_stage (
                  alias_url text,
                  normalised_citation text,
                  raw_citation text,
                  version_id text
                ) on commit drop
                """
            )
            with cur.copy(
                "COPY oalc_aliases_stage (alias_url, normalised_citation, raw_citation, version_id) FROM STDIN"
            ) as copy:
                for row in alias_rows:
                    copy.write_row(row)
            cur.execute(
                """
                insert into oalc_citation_aliases (alias_url, normalised_citation, raw_citation, version_id)
                select alias_url, normalised_citation, raw_citation, version_id
                from oalc_aliases_stage
                on conflict (alias_url) do update set
                  normalised_citation = excluded.normalised_citation,
                  raw_citation = excluded.raw_citation,
                  version_id = excluded.version_id
                """
            )

            cur.execute(
                """
                insert into oalc_build_meta (
                  id, corpus_version, corpus_sha256, cutoff_date, built_at,
                  citation_count, alias_count, source_counts
                ) values (1, %s, %s, %s, %s, %s, %s, %s::jsonb)
                on conflict (id) do update set
                  corpus_version = excluded.corpus_version,
                  corpus_sha256 = excluded.corpus_sha256,
                  cutoff_date = excluded.cutoff_date,
                  built_at = excluded.built_at,
                  citation_count = excluded.citation_count,
                  alias_count = excluded.alias_count,
                  source_counts = excluded.source_counts
                """,
                (
                    meta["corpus_version"],
                    meta["corpus_sha256"],
                    meta["cutoff_date"],
                    meta["built_at"],
                    meta["citation_count"],
                    meta["alias_count"],
                    json.dumps(meta["source_counts"]),
                ),
            )
    print(f"loaded {len(citation_rows)} citations and {len(alias_rows)} aliases")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build or load the OALC v0 citation index.")
    sub = parser.add_subparsers(dest="command", required=True)

    build_parser = sub.add_parser("build", help="Stream corpus.jsonl into the citation CSV")
    build_parser.add_argument("--corpus", required=True, help="Path to corpus.jsonl")
    build_parser.add_argument("--out-dir", default=".", help="Where to write the CSV, alias, log and metadata")
    build_parser.add_argument("--corpus-version", default=DEFAULT_VERSION)
    build_parser.add_argument(
        "--corpus-sha256",
        default="",
        help="Record this SHA-256 and skip hashing the corpus file",
    )
    build_parser.add_argument("--cutoff", default=DEFAULT_CUTOFF, help="Corpus cutoff date, YYYY-MM-DD")

    load_parser = sub.add_parser("load", help="COPY the CSV into Postgres (DATABASE_URL). Refuses without --confirm-write")
    load_parser.add_argument("--out-dir", default=".", help="Directory containing the build outputs")
    load_parser.add_argument(
        "--confirm-write",
        action="store_true",
        help="Required. Confirms DATABASE_URL is the Sydney project and a write is intended",
    )

    args = parser.parse_args(argv)
    if args.command == "build":
        return build(args)
    if args.command == "load":
        return load(args)
    parser.error(f"unknown command {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
