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

LANGS = sys.argv[1:] or ["en", "ru", "hi", "zh"]


def fail(msg):
    print(f"STOP ❌ — {msg}")
    raise SystemExit(1)


def json_files_for(lang):
    if lang == "en":
        base = ROOT / "data" / "primadom"
        files = []

        for d in sorted(base.iterdir()):
            if d.is_dir() and d.name.endswith("_v2"):
                files.extend(sorted(d.glob("*.json")))

        return sorted(files)

    base = ROOT / "data" / "primadom" / lang

    if not base.is_dir():
        fail(f"{lang.upper()} data directory missing: {base}")

    return sorted(base.rglob("*.json"))


def json_paths(lang):
    files = json_files_for(lang)

    if len(files) != EXPECTED:
        fail(
            f"{lang.upper()} JSON files = "
            f"{len(files)} / {EXPECTED}"
        )

    paths = []
    stale_canonical = []

    for file in files:
        try:
            obj = json.loads(
                file.read_text(encoding="utf-8")
            )
        except Exception as e:
            fail(f"Invalid JSON {file}: {e}")

        language = obj.get("language_code")
        url_path = obj.get("url_path")
        canonical = obj.get("canonical_url_path")

        if language != lang:
            fail(
                f"{file}: language_code={language!r}, "
                f"expected {lang!r}"
            )

        if not isinstance(url_path, str) or not url_path:
            fail(f"{file}: missing url_path")

        if not url_path.startswith(f"/{lang}/"):
            fail(
                f"{file}: wrong language url_path: "
                f"{url_path}"
            )

        if any(x in url_path for x in (
            "/_generated/",
            "/_preview/",
            "pages.dev",
        )):
            fail(
                f"{file}: forbidden production route: "
                f"{url_path}"
            )

        if canonical != url_path:
            stale_canonical.append(
                (str(file), url_path, canonical)
            )

        paths.append(url_path)

    unique = set(paths)

    if len(unique) != EXPECTED:
        fail(
            f"{lang.upper()} unique JSON routes = "
            f"{len(unique)} / {EXPECTED}"
        )

    return unique, stale_canonical


def route_paths(lang):
    base = ROOT / "content" / "_generated" / lang

    files = sorted(
        base.rglob(f"index.{lang}.md")
    )

    if len(files) != EXPECTED:
        fail(
            f"{lang.upper()} generated routes = "
            f"{len(files)} / {EXPECTED}"
        )

    paths = []

    rx = re.compile(
        r'''^url:\s*["']?([^"'\s]+)["']?\s*$''',
        re.MULTILINE,
    )

    for file in files:
        text = file.read_text(
            encoding="utf-8",
            errors="strict",
        )

        m = rx.search(text)

        if not m:
            fail(
                f"{file}: missing front-matter url"
            )

        path = m.group(1)

        if not path.startswith(f"/{lang}/"):
            fail(
                f"{file}: wrong generated route: "
                f"{path}"
            )

        paths.append(path)

    unique = set(paths)

    if len(unique) != EXPECTED:
        fail(
            f"{lang.upper()} unique generated routes = "
            f"{len(unique)} / {EXPECTED}"
        )

    return unique


def html_attr(tag, name):
    rx = re.compile(
        rf'''\b{name}\s*=\s*
        (?:
            "([^"]*)"
          | '([^']*)'
          | ([^\s>]+)
        )
        ''',
        re.IGNORECASE | re.VERBOSE,
    )

    m = rx.search(tag)

    if not m:
        return None

    return next(
        x for x in m.groups()
        if x is not None
    )


def extract_canonical(html):
    for tag in re.findall(
        r"<link\b[^>]*>",
        html,
        flags=re.IGNORECASE,
    ):
        rel = html_attr(tag, "rel")

        if not rel:
            continue

        rel_tokens = {
            x.lower()
            for x in rel.split()
        }

        if "canonical" not in rel_tokens:
            continue

        return html_attr(tag, "href")

    return None


def verify_html(lang, paths):
    missing_html = []
    wrong_canonical = []

    for path in sorted(paths):
        html_file = (
            ROOT
            / "public"
            / path.strip("/")
            / "index.html"
        )

        if not html_file.is_file():
            missing_html.append(path)

            if len(missing_html) >= 10:
                break

            continue

        html = html_file.read_text(
            encoding="utf-8",
            errors="ignore",
        )

        actual = extract_canonical(html)
        expected = DOMAIN + path

        if actual != expected:
            wrong_canonical.append(
                (path, actual, expected)
            )

            if len(wrong_canonical) >= 10:
                break

    if missing_html:
        print("Missing HTML sample:")
        for x in missing_html:
            print(" ", x)

        fail(
            f"{lang.upper()} built HTML missing"
        )

    if wrong_canonical:
        print("Canonical mismatch sample:")

        for path, actual, expected in wrong_canonical:
            print(" URL:     ", path)
            print(" ACTUAL:  ", actual)
            print(" EXPECTED:", expected)

        fail(
            f"{lang.upper()} HTML canonical mismatch"
        )


def write_sitemap(lang, paths):
    target = (
        ROOT
        / "public"
        / lang
        / "sitemap.xml"
    )

    target.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path in sorted(paths):
        url = DOMAIN + path
        lines.append(
            f"  <url><loc>{escape(url)}</loc></url>"
        )

    lines.append("</urlset>")
    lines.append("")

    target.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    try:
        tree = ET.parse(target)
    except Exception as e:
        fail(
            f"{lang.upper()} invalid sitemap XML: {e}"
        )

    ns = {
        "sm":
        "http://www.sitemaps.org/schemas/sitemap/0.9"
    }

    locs = [
        node.text
        for node in tree.findall(
            ".//sm:loc",
            ns,
        )
        if node.text
    ]

    if len(locs) != EXPECTED:
        fail(
            f"{lang.upper()} sitemap LOC = "
            f"{len(locs)} / {EXPECTED}"
        )

    if len(set(locs)) != EXPECTED:
        fail(
            f"{lang.upper()} sitemap duplicates found"
        )

    for url in locs:
        if not url.startswith(
            f"{DOMAIN}/{lang}/"
        ):
            fail(
                f"{lang.upper()} bad sitemap URL: "
                f"{url}"
            )

        if any(x in url for x in (
            "pages.dev",
            "/_generated/",
            "/_preview/",
            "/categories/",
            "/tags/",
        )):
            fail(
                f"{lang.upper()} forbidden sitemap URL: "
                f"{url}"
            )

    return target, locs


grand_total = 0

print("=" * 68)
print("PRIMADOM — PRODUCTION BUSINESS SITEMAPS")
print("=" * 68)

for lang in LANGS:
    print(f"\n[{lang.upper()}]")

    json_routes, stale = json_paths(lang)
    generated_routes = route_paths(lang)

    if json_routes != generated_routes:
        only_json = sorted(
            json_routes - generated_routes
        )

        only_generated = sorted(
            generated_routes - json_routes
        )

        print("JSON only:", len(only_json))
        print(
            "Generated only:",
            len(only_generated),
        )

        for x in only_json[:5]:
            print(" JSON ONLY:     ", x)

        for x in only_generated[:5]:
            print(" GENERATED ONLY:", x)

        fail(
            f"{lang.upper()} "
            "JSON/generated route identity failed"
        )

    print(
        f"JSON routes:      "
        f"{len(json_routes)} / {EXPECTED}"
    )

    print(
        f"Generated routes: "
        f"{len(generated_routes)} / {EXPECTED}"
    )

    print("Route identity:   PASS")

    verify_html(lang, json_routes)

    print(
        f"HTML canonical:   "
        f"{EXPECTED} / {EXPECTED} PASS"
    )

    if stale:
        print(
            f"JSON stale canonical_url_path: "
            f"{len(stale)}"
        )
        print(
            "NOTE: not used for sitemap; "
            "HTML canonical is authoritative QA"
        )

        for file, url, canonical in stale[:3]:
            print(" STALE:", file)
            print("   URL:", url)
            print("   OLD:", canonical)
    else:
        print(
            "JSON stale canonical_url_path: 0"
        )

    target, locs = write_sitemap(
        lang,
        json_routes,
    )

    print(
        f"Sitemap LOC:      "
        f"{len(locs)} / {EXPECTED}"
    )
    print("Bad origins:      0")
    print("Service URLs:     0")
    print(
        f"File:              "
        f"{target.relative_to(ROOT)}"
    )

    print("Sample:")
    for url in locs[:3]:
        print(" ", url)

    grand_total += len(locs)


expected_total = EXPECTED * len(LANGS)

print("\n" + "=" * 68)
print(
    f"TOTAL SITEMAP URLS: "
    f"{grand_total} / {expected_total}"
)

if grand_total != expected_total:
    fail("grand total mismatch")

print(
    "PASS ✅ — PRODUCTION SITEMAPS READY"
)
print("=" * 68)
