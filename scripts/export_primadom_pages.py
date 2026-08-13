#!/usr/bin/env python3

import argparse
import csv
import json
import re
import shutil
from collections import Counter
from pathlib import Path


PROJECT_BLOCKS = [
    "block_01_header",
    "block_02_breadcrumbs",
    "block_03_hero",
    "block_04_ai_search",
    "block_05_short_answer",
    "block_06_key_facts",
    "block_07_buyer_fit",
    "block_08_project_logic",
    "block_09_decision_cards",
    "block_10_location",
    "block_11_similar_projects",
    "block_12_faq",
    "block_13_trust_sources",
    "block_14_cta",
    "block_15_lead_modal",
    "block_16_footer",
]


def fail(message):
    raise SystemExit(f"\nEXPORT FAILED\n{message}\n")


def yaml_string(value):
    return json.dumps(str(value), ensure_ascii=False)


parser = argparse.ArgumentParser()
parser.add_argument("--type", required=True)
parser.add_argument("--csv", required=True)
parser.add_argument("--stage-root", required=True)
args = parser.parse_args()

if args.type != "project_page":
    fail("At this stage only project_page is configured.")

csv_path = Path(args.csv).expanduser().resolve()
stage_root = Path(args.stage_root)

if not csv_path.exists():
    fail(f"CSV not found: {csv_path}")

required_columns = {
    "page_id",
    "page_type_id",
    "language_code",
    "url_path",
    "canonical_url_path",
    "page_json_draft",
}

with csv_path.open(
    "r",
    encoding="utf-8-sig",
    newline=""
) as fh:
    reader = csv.DictReader(fh)

    if reader.fieldnames is None:
        fail("CSV has no header.")

    missing_columns = required_columns - set(reader.fieldnames)

    if missing_columns:
        fail(
            "Missing CSV columns: "
            + ", ".join(sorted(missing_columns))
        )

    rows = list(reader)


EXPECTED_COUNT = 2571

if len(rows) != EXPECTED_COUNT:
    fail(
        f"Expected {EXPECTED_COUNT} rows, "
        f"but CSV contains {len(rows)} rows.\n"
        "Nothing was written."
    )


validated = []

page_ids = []
urls = []
canonicals = []
slugs = []


for row_number, row in enumerate(rows, start=2):

    outer_page_id = (row["page_id"] or "").strip()
    outer_type = (row["page_type_id"] or "").strip()
    outer_lang = (row["language_code"] or "").strip()
    outer_url = (row["url_path"] or "").strip()
    outer_canonical = (row["canonical_url_path"] or "").strip()

    try:
        page = json.loads(row["page_json_draft"])
    except Exception as exc:
        fail(
            f"Row {row_number}: invalid page_json_draft JSON:\n{exc}"
        )

    if not isinstance(page, dict):
        fail(
            f"Row {row_number}: page_json_draft is not an object."
        )

    if outer_type != "project_page":
        fail(
            f"Row {row_number}: outer page_type_id "
            f"is {outer_type!r}"
        )

    if outer_lang != "en":
        fail(
            f"Row {row_number}: outer language_code "
            f"is {outer_lang!r}"
        )

    if page.get("page_id") != outer_page_id:
        fail(
            f"Row {row_number}: page_id mismatch:\n"
            f"outer={outer_page_id}\n"
            f"json={page.get('page_id')}"
        )

    if page.get("page_type_id") != "project_page":
        fail(
            f"{outer_page_id}: JSON page_type_id is "
            f"{page.get('page_type_id')!r}"
        )

    if page.get("language_code") != "en":
        fail(
            f"{outer_page_id}: JSON language_code is "
            f"{page.get('language_code')!r}"
        )

    if page.get("url_path") != outer_url:
        fail(
            f"{outer_page_id}: url_path mismatch:\n"
            f"index={outer_url}\n"
            f"json={page.get('url_path')}"
        )

    if page.get("canonical_url_path") != outer_canonical:
        fail(
            f"{outer_page_id}: canonical mismatch:\n"
            f"index={outer_canonical}\n"
            f"json={page.get('canonical_url_path')}"
        )

    if not outer_url.startswith("/en/projects/"):
        fail(
            f"{outer_page_id}: unexpected project URL "
            f"{outer_url}"
        )

    if not outer_url.endswith("/"):
        fail(
            f"{outer_page_id}: URL has no trailing slash "
            f"{outer_url}"
        )

    if not outer_canonical:
        fail(
            f"{outer_page_id}: canonical is empty."
        )

    slug = page.get("primary_entity_slug")

    if not isinstance(slug, str) or not slug.strip():
        fail(
            f"{outer_page_id}: primary_entity_slug missing."
        )

    slug = slug.strip()

    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        fail(
            f"{outer_page_id}: invalid slug {slug!r}"
        )

    blocks = page.get("blocks")

    if not isinstance(blocks, dict):
        fail(
            f"{outer_page_id}: blocks is not an object."
        )

    actual_blocks = list(blocks.keys())

    missing_blocks = [
        key for key in PROJECT_BLOCKS
        if key not in blocks
    ]

    extra_blocks = [
        key for key in blocks
        if key not in PROJECT_BLOCKS
    ]

    if missing_blocks or extra_blocks:
        fail(
            f"{outer_page_id}: block contract mismatch\n"
            f"Missing: {missing_blocks}\n"
            f"Extra: {extra_blocks}"
        )

    block_order = page.get("block_order")

    if block_order != PROJECT_BLOCKS:
        fail(
            f"{outer_page_id}: block_order mismatch\n"
            f"Expected: {PROJECT_BLOCKS}\n"
            f"Actual:   {block_order}"
        )

    hero = blocks.get("block_03_hero", {})
    title = hero.get("hero_title")

    if not isinstance(title, str) or not title.strip():
        fail(
            f"{outer_page_id}: hero_title missing."
        )

    page_ids.append(outer_page_id)
    urls.append(outer_url)
    canonicals.append(outer_canonical)
    slugs.append(slug)

    validated.append(
        {
            "page": page,
            "page_id": outer_page_id,
            "slug": slug,
            "url": outer_url,
            "canonical": outer_canonical,
            "title": title.strip(),
        }
    )


def assert_unique(values, label):
    counts = Counter(values)
    duplicates = sorted(
        value for value, count in counts.items()
        if count > 1
    )

    if duplicates:
        fail(
            f"Duplicate {label}: {len(duplicates)}\n"
            + "\n".join(duplicates[:50])
        )


assert_unique(page_ids, "page_id")
assert_unique(urls, "url_path")
assert_unique(canonicals, "canonical_url_path")
assert_unique(slugs, "primary_entity_slug")


# ----------------------------------------------------------
# Nothing above this point writes to the repo.
# If validation reaches here, all 2,571 rows passed.
# ----------------------------------------------------------

if stage_root.exists():
    shutil.rmtree(stage_root)

data_dir = stage_root / "data"
content_dir = stage_root / "content"

data_dir.mkdir(parents=True, exist_ok=True)
content_dir.mkdir(parents=True, exist_ok=True)


manifest = []


for item in validated:

    page = item["page"]
    slug = item["slug"]
    title = item["title"]
    url = item["url"]
    canonical = item["canonical"]
    page_id = item["page_id"]

    json_path = data_dir / f"{slug}.json"

    json_path.write_text(
        json.dumps(
            page,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    stub_dir = content_dir / slug
    stub_dir.mkdir(parents=True, exist_ok=True)

    stub_path = stub_dir / "index.en.md"

    stub = f"""---
title: {yaml_string(title)}
layout: "primadom-project-page-v2"
project_slug: {yaml_string(slug)}
page_id: {yaml_string(page_id)}
url: {yaml_string(url)}
build:
  render: always
  list: never
---
"""

    stub_path.write_text(
        stub,
        encoding="utf-8"
    )

    manifest.append(
        {
            "page_id": page_id,
            "slug": slug,
            "url_path": url,
            "canonical_url_path": canonical,
            "json_file": str(json_path),
            "content_file": str(stub_path),
        }
    )


manifest_path = stage_root / "manifest.csv"

with manifest_path.open(
    "w",
    encoding="utf-8",
    newline=""
) as fh:

    writer = csv.DictWriter(
        fh,
        fieldnames=[
            "page_id",
            "slug",
            "url_path",
            "canonical_url_path",
            "json_file",
            "content_file",
        ],
    )

    writer.writeheader()
    writer.writerows(manifest)


report_lines = [
    "PRIMADOM PROJECT PAGE — MASS EXPORT STAGE",
    "========================================",
    "",
    f"CSV rows:                {len(rows)}",
    f"Validated pages:         {len(validated)}",
    f"Unique page_id:          {len(set(page_ids))}",
    f"Unique url_path:         {len(set(urls))}",
    f"Unique canonical:        {len(set(canonicals))}",
    f"Unique project slug:     {len(set(slugs))}",
    f"JSON files created:      {len(list(data_dir.glob('*.json')))}",
    f"Hugo stubs created:      {len(list(content_dir.glob('*/index.en.md')))}",
    "",
    "Project block contract:  PASS",
    "URL contract:            PASS",
    "Canonical contract:      PASS",
    "Slug contract:           PASS",
    "Duplicate checks:        PASS",
    "",
    "STATUS: READY FOR PROMOTION",
]

report = "\n".join(report_lines) + "\n"

report_path = Path(
    "_audit/reports/project-mass-export-2026-08-13.txt"
)

report_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

report_path.write_text(
    report,
    encoding="utf-8"
)

print()
print(report)
print("STAGING:")
print(stage_root)
print()
print("MANIFEST:")
print(manifest_path)
print()
print("REPORT:")
print(report_path)
