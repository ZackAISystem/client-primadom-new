#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


TOP_LEVEL_ORDER = [
    "schema_version",
    "page_id",
    "page_type_id",
    "language_code",
    "url_path",
    "canonical_url_path",
    "canonical_group_key",
    "primary_entity_type",
    "primary_entity_slug",
    "block_order",
]


def canonical_page(page, path):

    if not isinstance(page, dict):
        raise ValueError(f"{path}: root JSON must be an object")

    block_order = page.get("block_order")
    blocks = page.get("blocks")

    if not isinstance(block_order, list):
        raise ValueError(f"{path}: block_order missing or invalid")

    if not isinstance(blocks, dict):
        raise ValueError(f"{path}: blocks missing or invalid")

    missing = [
        key
        for key in block_order
        if key not in blocks
    ]

    extras = [
        key
        for key in blocks
        if key not in block_order
    ]

    if missing:
        raise ValueError(
            f"{path}: block_order references missing blocks: {missing}"
        )

    if extras:
        raise ValueError(
            f"{path}: blocks contain keys not present in block_order: {extras}"
        )

    out = {}

    # Canonical metadata first.
    for key in TOP_LEVEL_ORDER:
        if key in page:
            out[key] = page[key]

    # Preserve any future/unknown metadata fields too.
    # They go before "blocks" and are never deleted.
    for key, value in page.items():
        if key not in TOP_LEVEL_ORDER and key != "blocks":
            out[key] = value

    # Physical block ordering follows block_order exactly.
    ordered_blocks = {}

    for block_key in block_order:
        ordered_blocks[block_key] = blocks[block_key]

    out["blocks"] = ordered_blocks

    return out


parser = argparse.ArgumentParser()

parser.add_argument(
    "directory",
    help="Directory containing Primadom page JSON files"
)

args = parser.parse_args()

root = Path(args.directory)

if not root.exists():
    raise SystemExit(f"Directory not found: {root}")

files = sorted(root.glob("*.json"))

if not files:
    raise SystemExit(f"No JSON files found in: {root}")

formatted = 0

for path in files:

    original_text = path.read_text(encoding="utf-8")
    original = json.loads(original_text)

    canonical = canonical_page(original, path)

    # CRITICAL:
    # reordering must never change semantic JSON content.
    if canonical != original:
        raise SystemExit(
            f"SEMANTIC CHANGE DETECTED — STOPPED:\n{path}"
        )

    path.write_text(
        json.dumps(
            canonical,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    # Read it back and verify again.
    reread = json.loads(
        path.read_text(encoding="utf-8")
    )

    if reread != original:
        raise SystemExit(
            f"WRITE VERIFICATION FAILED:\n{path}"
        )

    formatted += 1


print()
print("PRIMADOM JSON FORMATTER")
print("=======================")
print()
print("Files:", formatted)
print("Semantic changes: 0")
print("Data loss: 0")
print("Block order: canonical")
print("Pretty indent: 2 spaces")
print()
print("STATUS: PASS")
