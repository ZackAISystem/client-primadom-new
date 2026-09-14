#!/usr/bin/env python3

from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = 22499
DOMAIN = "https://primadom.ai"

LANGS = sys.argv[1:] or ["es", "fr", "de", "ar"]


def fail(message):
    print(f"STOP ❌ — {message}")
    raise SystemExit(1)


def json_files_for(lang):
    direct = ROOT / "data" / "primadom" / lang

    if direct.is_dir():
        return sorted(direct.rglob("*.json"))

    # MAIN English structure:
    # data/primadom/*_v2/*.json
    if lang == "en":
        files = []
        base = ROOT / "data" / "primadom"

        for d in sorted(base.iterdir()):
            if d.is_dir() and d.name.endswith("_v2"):
                files.extend(sorted(d.glob("*.json")))

        return files

    return []


def canonical_paths(lang):
    files = json_files_for(lang)

    if len(files) != EXPECTED:
        fail(f"{lang.upper()} JSON = {len(files)} / {EXPECTED}")

    paths = []

    for file in files:
        try:
            obj = json.loads(file.read_text(encoding="utf-8"))
        except Exception as e:
            fail(f"invalid JSON: {file}: {e}")

        language = obj.get("language_code")
        url_path = obj.get("url_path")
        canonical = obj.get("canonical_url_path")

        if language != lang:
            fail(f"{file}: language_code={language!r}, expected {lang!r}")

        if not isinstance(url_path, str) or not url_path:
            fail(f"{file}: missing url_path")

        if not isinstance(canonical, str) or not canonical:
            fail(f"{file}: missing canonical_url_path")

        if url_path != canonical:
            fail(
                f"{file}: url_path != canonical_url_path\n"
                f"URL:       {url_path}\n"
                f"CANONICAL: {canonical}"
            )

        if not canonical.startswith(f"/{lang}/"):
            fail(f"{file}: wrong language route: {canonical}")

        if any(x in canonical for x in (
            "/_generated/",
            "/_preview/",
            "pages.dev",
        )):
            fail(f"{file}: forbidden sitemap route: {canonical}")

        paths.append(canonical)

    if len(set(paths)) != EXPECTED:
        fail(
            f"{lang.upper()} canonical URLs are not unique: "
            f"{len(set(paths))} / {EXPECTED}"
        )

    return set(paths)


def route_paths(lang):
    base = ROOT / "content" / "_generated" / lang

    files = sorted(base.rglob(f"index.{lang}.md"))

    if len(files) != EXPECTED:
        fail(f"{lang.upper()} routes = {len(files)} / {EXPECTED}")

    paths = []

    rx = re.compile(
        r'''^url:\s*["']([^"']+)["']\s*$''',
        re.MULTILINE
    )

    for file in files:
        text = file.read_text(encoding="utf-8", errors="strict")
        match = rx.search(text)

        if not match:
            fail(f"{file}: missing front-matter url")

        path = match.group(1)

        if not path.startswith(f"/{lang}/"):
            fail(f"{file}: wrong route: {path}")

        paths.append(path)

    if len(set(paths)) != EXPECTED:
        fail(
            f"{lang.upper()} generated routes are not unique: "
            f"{len(set(paths))} / {EXPECTED}"
        )

    return set(paths)


def verify_html(lang, paths):
    missing = []

    for path in paths:
        html = ROOT / "public" / path.strip("/") / "index.html"

        if not html.is_file():
            missing.append(path)

            if len(missing) >= 10:
                break

    if missing:
        fail(
            f"{lang.upper()} sitemap routes missing built HTML:\n"
            + "\n".join(missing)
        )


def write_sitemap(lang, paths):
    target = ROOT / "public" / lang / "sitemap.xml"
    target.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path in sorted(paths):
        url = DOMAIN + path
        lines.append(f"  <url><loc>{escape(url)}</loc></url>")

    lines.append("</urlset>")
    lines.append("")

    target.write_text("\n".join(lines), encoding="utf-8")

    # XML validity
    try:
        tree = ET.parse(target)
    except Exception as e:
        fail(f"{lang.upper()} generated sitemap invalid XML: {e}")

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [
        n.text
        for n in tree.findall(".//sm:loc", ns)
        if n.text
    ]

    if len(locs) != EXPECTED:
        fail(
            f"{lang.upper()} sitemap LOC count "
            f"{len(locs)} / {EXPECTED}"
        )

    if len(set(locs)) != EXPECTED:
        fail(f"{lang.upper()} sitemap contains duplicate URLs")

    for url in locs:
        if not url.startswith(f"{DOMAIN}/{lang}/"):
            fail(f"{lang.upper()} bad sitemap URL: {url}")

        if (
            "pages.dev" in url
            or "/_generated/" in url
            or "/_preview/" in url
        ):
            fail(f"{lang.upper()} forbidden sitemap URL: {url}")

    return target, locs


grand_total = 0

print("=" * 64)
print("PRIMADOM — PRODUCTION BUSINESS SITEMAPS")
print("=" * 64)

for lang in LANGS:
    print(f"\n[{lang.upper()}]")

    canonical = canonical_paths(lang)
    routes = route_paths(lang)

    if canonical != routes:
        only_json = sorted(canonical - routes)
        only_routes = sorted(routes - canonical)

        print("Canonical only:", len(only_json))
        print("Route only:    ", len(only_routes))

        for x in only_json[:5]:
            print(" JSON ONLY :", x)

        for x in only_routes[:5]:
            print(" ROUTE ONLY:", x)

        fail(f"{lang.upper()} canonical/route identity failed")

    print(f"Canonical JSON: {len(canonical)} / {EXPECTED}")
    print(f"Routes:         {len(routes)} / {EXPECTED}")
    print("Identity:       PASS")

    verify_html(lang, canonical)
    print(f"Built HTML:     {EXPECTED} / {EXPECTED}")

    target, locs = write_sitemap(lang, canonical)

    print(f"Sitemap LOC:    {len(locs)} / {EXPECTED}")
    print("Bad origins:    0")
    print("Service URLs:   0")
    print(f"File:           {target.relative_to(ROOT)}")
    print("Sample:")
    for url in locs[:3]:
        print(" ", url)

    grand_total += len(locs)


expected_total = EXPECTED * len(LANGS)

print("\n" + "=" * 64)
print(f"TOTAL SITEMAP URLS: {grand_total} / {expected_total}")

if grand_total != expected_total:
    fail("grand total mismatch")

print("PASS ✅ — PRODUCTION SITEMAPS READY")
print("=" * 64)
