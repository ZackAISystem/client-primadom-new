#!/usr/bin/env python3

import csv
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(".")
DATA = ROOT / "_audit/staging/project_page/data"
MANIFEST = ROOT / "_audit/staging/project_page/manifest.csv"
REPORT = ROOT / "_audit/reports/project-final-qa-2026-08-13.txt"
HREF_CSV = ROOT / "_audit/reports/project-href-issues-2026-08-13.csv"
WHITESPACE_CSV = ROOT / "_audit/reports/project-whitespace-issues-2026-08-13.csv"


EXPECTED = 2571


def walk(obj, path="$"):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from walk(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from walk(value, f"{path}[{i}]")
    else:
        yield path, obj


def norm_path(value):
    if not isinstance(value, str):
        return value

    s = value.strip()

    if not s:
        return s

    if s.startswith("#"):
        return s

    if "://" in s:
        return s

    if s.startswith(("mailto:", "tel:", "javascript:")):
        return s

    s = s.split("?", 1)[0].split("#", 1)[0]

    if not s.startswith("/"):
        return s

    s = re.sub(r"/+", "/", s)

    if s != "/" and not s.endswith("/"):
        s += "/"

    return s


# ---------------------------------------------------------
# Load manifest
# ---------------------------------------------------------

if not MANIFEST.exists():
    raise SystemExit(f"Manifest missing: {MANIFEST}")

with MANIFEST.open(encoding="utf-8", newline="") as fh:
    manifest = list(csv.DictReader(fh))

if len(manifest) != EXPECTED:
    raise SystemExit(
        f"Manifest rows: {len(manifest)}, expected {EXPECTED}"
    )

project_urls = {
    norm_path(row["url_path"])
    for row in manifest
}

project_slugs = {
    row["slug"]
    for row in manifest
}


# ---------------------------------------------------------
# Load JSON
# ---------------------------------------------------------

files = sorted(DATA.glob("*.json"))

if len(files) != EXPECTED:
    raise SystemExit(
        f"JSON files: {len(files)}, expected {EXPECTED}"
    )


href_rows = []
whitespace_rows = []

project_link_errors = []
bad_root_internal = []
future_internal = []
external_links = []
anchor_links = []
relative_links = []

json_errors = []
block_order_errors = []

href_counter = Counter()


for path in files:

    try:
        page = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        json_errors.append((path.name, str(exc)))
        continue

    page_id = page.get("page_id", "")
    url_path = page.get("url_path", "")
    slug = page.get("primary_entity_slug", "")

    blocks = page.get("blocks", {})
    block_order = page.get("block_order", [])

    if list(blocks.keys()) != block_order:
        block_order_errors.append(
            (page_id, path.name)
        )

    for json_path, value in walk(page):

        # -------------------------------------------------
        # Trailing/leading whitespace in ANY string
        # -------------------------------------------------

        if isinstance(value, str):

            if value != value.strip():
                whitespace_rows.append({
                    "page_id": page_id,
                    "page_slug": slug,
                    "page_url": url_path,
                    "json_path": json_path,
                    "value_repr": repr(value),
                })

        # -------------------------------------------------
        # href fields only
        # -------------------------------------------------

        if not json_path.endswith(".href"):
            continue

        if not isinstance(value, str):
            continue

        href = value.strip()

        if not href:
            continue

        href_counter[href] += 1

        row = {
            "page_id": page_id,
            "page_slug": slug,
            "page_url": url_path,
            "json_path": json_path,
            "href": href,
            "classification": "",
            "target_status": "",
        }

        # Anchor
        if href.startswith("#"):
            row["classification"] = "anchor"
            row["target_status"] = "local_anchor"
            anchor_links.append(row)
            continue

        # External
        if (
            "://" in href
            or href.startswith(("mailto:", "tel:"))
        ):
            row["classification"] = "external"
            row["target_status"] = "external"
            external_links.append(row)
            continue

        normalized = norm_path(href)

        # Correctly language-prefixed project route
        if normalized.startswith("/en/projects/"):

            row["classification"] = "project_internal"

            if normalized == "/en/projects/":
                row["target_status"] = "project_landing"
            elif normalized in project_urls:
                row["target_status"] = "project_exists"
            else:
                row["target_status"] = "PROJECT_TARGET_MISSING"
                project_link_errors.append(row)

            continue

        # Other correctly prefixed /en/ routes.
        # These may belong to future page types not exported yet.
        if normalized.startswith("/en/"):

            row["classification"] = "future_internal"
            row["target_status"] = "future_type_not_yet_built"
            future_internal.append(row)
            continue

        # Root homepage is allowed.
        if normalized == "/":
            row["classification"] = "root_home"
            row["target_status"] = "allowed"
            continue

        # Root-relative internal route without language.
        if normalized.startswith("/"):

            row["classification"] = "missing_language_prefix"
            row["target_status"] = "REVIEW"
            bad_root_internal.append(row)
            continue

        # Anything else is relative.
        row["classification"] = "relative"
        row["target_status"] = "REVIEW"
        relative_links.append(row)


# ---------------------------------------------------------
# Write detailed href report
# ---------------------------------------------------------

issue_rows = (
    project_link_errors
    + bad_root_internal
    + relative_links
)

with HREF_CSV.open(
    "w",
    encoding="utf-8",
    newline=""
) as fh:

    fields = [
        "page_id",
        "page_slug",
        "page_url",
        "json_path",
        "href",
        "classification",
        "target_status",
    ]

    writer = csv.DictWriter(
        fh,
        fieldnames=fields
    )

    writer.writeheader()
    writer.writerows(issue_rows)


# ---------------------------------------------------------
# Write whitespace report
# ---------------------------------------------------------

with WHITESPACE_CSV.open(
    "w",
    encoding="utf-8",
    newline=""
) as fh:

    fields = [
        "page_id",
        "page_slug",
        "page_url",
        "json_path",
        "value_repr",
    ]

    writer = csv.DictWriter(
        fh,
        fieldnames=fields
    )

    writer.writeheader()
    writer.writerows(whitespace_rows)


# ---------------------------------------------------------
# Unique problematic href summary
# ---------------------------------------------------------

missing_lang_counts = Counter(
    row["href"]
    for row in bad_root_internal
)

missing_project_counts = Counter(
    row["href"]
    for row in project_link_errors
)

relative_counts = Counter(
    row["href"]
    for row in relative_links
)


lines = []

lines.append("PRIMADOM PROJECT PAGE — FINAL JSON QA")
lines.append("====================================")
lines.append("")

lines.append(f"JSON files:                    {len(files)}")
lines.append(f"Manifest rows:                 {len(manifest)}")
lines.append(f"Project URLs known:            {len(project_urls)}")
lines.append("")

lines.append(f"Invalid JSON:                  {len(json_errors)}")
lines.append(f"Physical block-order errors:   {len(block_order_errors)}")
lines.append("")

lines.append(f"Anchor href occurrences:       {len(anchor_links)}")
lines.append(f"External href occurrences:     {len(external_links)}")
lines.append(f"Future /en/ href occurrences:  {len(future_internal)}")
lines.append("")

lines.append(f"Missing Project targets:       {len(project_link_errors)}")
lines.append(f"Missing /en/ prefix hrefs:     {len(bad_root_internal)}")
lines.append(f"Relative hrefs:                {len(relative_links)}")
lines.append("")

lines.append(f"Whitespace string issues:      {len(whitespace_rows)}")
lines.append("")


if missing_project_counts:
    lines.append("MISSING PROJECT TARGETS")
    lines.append("-----------------------")

    for href, count in missing_project_counts.most_common():
        lines.append(f"{count:5d}  {href}")

    lines.append("")


if missing_lang_counts:
    lines.append("INTERNAL HREFS WITHOUT /en/")
    lines.append("---------------------------")

    for href, count in missing_lang_counts.most_common():
        lines.append(f"{count:5d}  {href}")

    lines.append("")


if relative_counts:
    lines.append("RELATIVE HREFS")
    lines.append("--------------")

    for href, count in relative_counts.most_common():
        lines.append(f"{count:5d}  {href}")

    lines.append("")


if whitespace_rows:
    lines.append("FIRST 30 WHITESPACE ISSUES")
    lines.append("--------------------------")

    for row in whitespace_rows[:30]:
        lines.append(
            f"{row['page_slug']} | "
            f"{row['json_path']} | "
            f"{row['value_repr']}"
        )

    lines.append("")


# Hard fail only for structural / project graph problems.
hard_errors = (
    len(json_errors)
    + len(block_order_errors)
    + len(project_link_errors)
)

if hard_errors == 0:
    lines.append("HARD QA STATUS: PASS")
else:
    lines.append("HARD QA STATUS: FAIL")


# Warnings do not fail yet.
warnings = (
    len(bad_root_internal)
    + len(relative_links)
    + len(whitespace_rows)
)

if warnings == 0:
    lines.append("EDITORIAL/ROUTE WARNINGS: 0")
else:
    lines.append(
        f"EDITORIAL/ROUTE WARNINGS: {warnings}"
    )


REPORT.write_text(
    "\n".join(lines) + "\n",
    encoding="utf-8"
)

print(REPORT.read_text(encoding="utf-8"))

print("Detailed href issues:")
print(HREF_CSV)

print()
print("Whitespace issues:")
print(WHITESPACE_CSV)

if hard_errors:
    raise SystemExit(2)
