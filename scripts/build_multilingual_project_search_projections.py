from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES_B = ROOT / "client-primadom-pages-b"

SOURCES = {
    "en": ROOT / "data/primadom/project_pages_v2",
    "ru": ROOT / "data/primadom/ru/project_pages",
    "hi": ROOT / "data/primadom/hi/project_pages",
    "zh": ROOT / "data/primadom/zh/project_pages",

    "es": PAGES_B / "data/primadom/es/project_pages",
    "fr": PAGES_B / "data/primadom/fr/project_pages",
    "de": PAGES_B / "data/primadom/de/project_pages",
    "ar": PAGES_B / "data/primadom/ar/project_pages",
}

OUT_DIR = ROOT / "static/search/project-projections-v3"


def get_fact(blocks, key):
    facts = (
        blocks.get("block_06_key_facts", {})
        .get("key_facts", [])
        or []
    )

    for item in facts:
        if item.get("key") != key:
            continue

        if item.get("value_status") == "missing":
            return ""

        value = item.get("value")

        if value in (None, "", "—"):
            return ""

        return str(value).strip()

    return ""


def find_similar(blocks):
    block = blocks.get(
        "block_11_similar_projects",
        {}
    )

    if isinstance(block, dict):
        sims = block.get("similar_projects")

        if isinstance(sims, list):
            return sims

    for block in blocks.values():
        if not isinstance(block, dict):
            continue

        sims = block.get("similar_projects")

        if isinstance(sims, list):
            return sims

    return []


def slug_from_href(href):
    parts = [
        x
        for x in str(href or "").split("/")
        if x
    ]

    try:
        i = parts.index("projects")

        return (
            parts[i + 1]
            if len(parts) > i + 1
            else ""
        )

    except ValueError:
        return ""


def similar_slugs(blocks, own_slug):
    out = []

    for item in find_similar(blocks):
        if not isinstance(item, dict):
            continue

        slug = slug_from_href(
            item.get("href")
        )

        if slug and slug != own_slug:
            out.append(slug)

    return list(dict.fromkeys(out))


def detect_features(text):
    q = str(text or "").lower()
    out = []

    if any(x in q for x in (
        "waterfront",
        "beachfront",
        "seafront",
        "near the sea",
        "near sea",
        "near the beach",
        "by the sea",
        "by the beach",
    )):
        out.append("waterfront")

    if any(x in q for x in (
        "sea view",
        "ocean view",
        "water view",
    )):
        out.append("sea-view")

    if "park view" in q:
        out.append("park-view")

    if (
        "city view" in q
        or "skyline view" in q
    ):
        out.append("city-view")

    if any(x in q for x in (
        "luxury",
        "premium",
        "high-end",
        "high end",
    )):
        out.append("luxury")

    if any(x in q for x in (
        "family",
        "family-friendly",
        "family friendly",
        "children",
        "kids",
    )):
        out.append("family")

    if any(x in q for x in (
        "investment",
        "investor",
        "rental yield",
        "roi",
    )):
        out.append("investment")

    if (
        "modern" in q
        or "contemporary" in q
    ):
        out.append("modern")

    return sorted(set(out))



EMIRATE_ADDRESS_PATTERNS = (
    (
        "Dubai",
        re.compile(r"\bdubai\b", re.I)
    ),
    (
        "Abu Dhabi",
        re.compile(
            r"\babu[\s-]+dhabi\b",
            re.I
        )
    ),
    (
        "Sharjah",
        re.compile(r"\bsharjah\b", re.I)
    ),
    (
        "Ras Al Khaimah",
        re.compile(
            r"\bras[\s-]+al[\s-]+khaimah\b",
            re.I
        )
    ),
    (
        "Ajman",
        re.compile(r"\bajman\b", re.I)
    ),
    (
        "Fujairah",
        re.compile(r"\bfujairah\b", re.I)
    ),
    (
        "Umm Al Quwain",
        re.compile(
            r"\bumm[\s-]+al[\s-]+quwain\b",
            re.I
        )
    ),
)


def machine_emirate_from_address(address):
    text = str(address or "").strip()

    found = [
        emirate
        for emirate, pattern
        in EMIRATE_ADDRESS_PATTERNS
        if pattern.search(text)
    ]

    # Never guess.
    return (
        found[0]
        if len(found) == 1
        else ""
    )

def extract(page, fallback_slug):
    blocks = page.get("blocks", {}) or {}

    hero = (
        blocks.get("block_03_hero", {})
        or {}
    )

    short = (
        blocks.get(
            "block_05_short_answer",
            {}
        )
        or {}
    )

    logic = (
        blocks.get(
            "block_08_project_logic",
            {}
        )
        or {}
    )

    location_block = (
        blocks.get(
            "block_10_location",
            {}
        )
        or {}
    )

    slug = str(
        page.get("primary_entity_slug")
        or fallback_slug
    )

    title = str(
        hero.get("hero_title")
        or slug
    )

    subtitle = str(
        hero.get("hero_subtitle")
        or ""
    )

    district = get_fact(
        blocks,
        "district"
    )

    developer = get_fact(
        blocks,
        "developer"
    )

    property_type = get_fact(
        blocks,
        "type"
    )

    units = get_fact(
        blocks,
        "units"
    )

    handover = get_fact(
        blocks,
        "handover"
    )

    payment_plan = get_fact(
        blocks,
        "payment_plan"
    )

    status = get_fact(
        blocks,
        "status"
    )

    size_from = get_fact(
        blocks,
        "size_from"
    )

    price_display = str(
        hero.get("price_display")
        or get_fact(
            blocks,
            "price_from"
        )
        or ""
    )

    price_amount = (
        hero.get("price_amount")
    )

    address = str(
        location_block.get(
            "address"
        )
        or ""
    )

    display_location = district

    if not display_location and address:
        fallback = re.sub(
            r",\s*UAE$",
            "",
            address,
            flags=re.I
        ).strip()

        if fallback.lower() != "uae":
            display_location = fallback

    gallery = (
        hero.get("gallery")
        or []
    )

    gallery_1 = (
        str(gallery[0])
        if gallery
        else ""
    )

    chips = (
        short.get(
            "short_answer_chips"
        )
        or []
    )

    semantic_source = " ".join([
        " ".join(
            str(x)
            for x in chips
        ),
        str(
            short.get(
                "short_answer_summary"
            )
            or ""
        ),
        str(
            logic.get(
                "project_logic_text"
            )
            or ""
        ),
    ])

    local_search_terms = " ".join(
        x
        for x in [
            slug,
            title,
            subtitle,
            district,
            display_location,
            developer,
            property_type,
            units,
            handover,
            status,
            size_from,
            address,
            " ".join(
                str(x)
                for x in chips
            ),
        ]
        if x
    ).lower()

    return {
        "slug": slug,
        "title": title,
        "subtitle": subtitle,

        "gallery_1": gallery_1,
        "image_alt": str(
            hero.get("image_alt")
            or title
        ),

        "district": district,
        "display_location":
            display_location,
        "developer": developer,

        "price_display":
            price_display,
        "price_amount":
            price_amount,

        "property_type":
            property_type,
        "units": units,
        "handover": handover,
        "payment_plan":
            payment_plan,
        "status": status,
        "size_from": size_from,

        "address": address,
        "machine_emirate":
            machine_emirate_from_address(
                address
            ),

        "similar_projects":
            similar_slugs(
                blocks,
                slug
            ),

        "semantic_source":
            semantic_source,

        "search_terms":
            local_search_terms,
    }


def load_language(lang):
    src = SOURCES[lang]

    files = sorted(
        src.glob("*.json")
    )

    out = {}

    for fp in files:
        page = json.loads(
            fp.read_text(
                encoding="utf-8"
            )
        )

        out[fp.stem] = page

    return out


print("=" * 78)
print(
    "BUILD MULTILINGUAL "
    "PROJECT SEARCH PROJECTIONS V3"
)
print("=" * 78)

all_pages = {
    lang: load_language(lang)
    for lang in SOURCES
}

en_pages = all_pages["en"]
en_slugs = set(en_pages)

errors = []
payloads = {}

for lang, pages in all_pages.items():
    print()
    print(f"===== {lang.upper()} =====")

    slugs = set(pages)

    if slugs != en_slugs:
        errors.append(
            f"{lang}: filename identity mismatch "
            f"missing={len(en_slugs - slugs)} "
            f"extra={len(slugs - en_slugs)}"
        )

        continue

    rows = []

    price_mismatch = 0
    gallery_mismatch = 0
    relation_mismatch = 0
    group_mismatch = 0
    language_mismatch = 0
    route_mismatch = 0

    for slug in sorted(en_slugs):
        en_page = en_pages[slug]
        local_page = pages[slug]

        en = extract(
            en_page,
            slug
        )

        local = extract(
            local_page,
            slug
        )

        if (
            local_page.get(
                "canonical_group_key"
            )
            !=
            en_page.get(
                "canonical_group_key"
            )
        ):
            group_mismatch += 1

        if (
            local_page.get(
                "language_code"
            )
            != lang
        ):
            language_mismatch += 1

        url = str(
            local_page.get(
                "url_path"
            )
            or ""
        )

        expected_prefix = (
            f"/{lang}/projects/"
        )

        if not url.startswith(
            expected_prefix
        ):
            route_mismatch += 1

        if (
            local["price_amount"]
            != en["price_amount"]
        ):
            price_mismatch += 1

        if (
            local["gallery_1"]
            != en["gallery_1"]
        ):
            gallery_mismatch += 1

        if (
            local["similar_projects"]
            != en["similar_projects"]
        ):
            relation_mismatch += 1

        # --------------------------------------------------
        # DISPLAY = localized canonical page.
        # MACHINE = stable EN facets used by shared Search.
        # --------------------------------------------------

        rows.append({
            "slug": slug,
            "entity_type": "project",
            "language": lang,

            "canonical_group_key":
                local_page.get(
                    "canonical_group_key"
                ),

            "canonical_url": url,

            # Localized display fields
            "title": local["title"],
            "subtitle":
                local["subtitle"],

            "gallery_1":
                local["gallery_1"],
            "image_alt":
                local["image_alt"],

            "district":
                local["district"],
            "display_location":
                local[
                    "display_location"
                ],
            "developer":
                local["developer"],

            "price_display":
                local[
                    "price_display"
                ],
            "price_amount":
                en["price_amount"],

            "property_type":
                local[
                    "property_type"
                ],
            "units":
                local["units"],
            "handover":
                local["handover"],
            "payment_plan":
                local[
                    "payment_plan"
                ],
            "status":
                local["status"],
            "size_from":
                local["size_from"],

            "address":
                local["address"],

            # Stable machine facets
            "machine_district":
                en["district"],
            "machine_emirate":
                en["machine_emirate"],
            "machine_developer":
                en["developer"],
            "machine_property_type":
                en[
                    "property_type"
                ],
            "machine_units":
                en["units"],
            "machine_handover":
                en["handover"],
            "machine_payment_plan":
                en[
                    "payment_plan"
                ],
            "machine_status":
                en["status"],
            "machine_size_from":
                en["size_from"],

            # Stable semantic/relation layer
            "features":
                detect_features(
                    en[
                        "semantic_source"
                    ]
                ),

            "similar_projects":
                en[
                    "similar_projects"
                ],

            # Localized retrieval text
            "search_terms":
                local[
                    "search_terms"
                ],
        })

    print(
        "projects:",
        len(rows)
    )

    print(
        "group_mismatch:",
        group_mismatch
    )

    print(
        "language_mismatch:",
        language_mismatch
    )

    print(
        "route_mismatch:",
        route_mismatch
    )

    print(
        "price_mismatch:",
        price_mismatch
    )

    print(
        "gallery_mismatch:",
        gallery_mismatch
    )

    print(
        "relation_mismatch:",
        relation_mismatch
    )

    if len(rows) != 2571:
        errors.append(
            f"{lang}: "
            f"rows={len(rows)}"
        )

    if group_mismatch:
        errors.append(
            f"{lang}: "
            f"group_mismatch="
            f"{group_mismatch}"
        )

    if language_mismatch:
        errors.append(
            f"{lang}: "
            f"language_mismatch="
            f"{language_mismatch}"
        )

    if route_mismatch:
        errors.append(
            f"{lang}: "
            f"route_mismatch="
            f"{route_mismatch}"
        )

    if price_mismatch:
        errors.append(
            f"{lang}: "
            f"price_mismatch="
            f"{price_mismatch}"
        )

    if gallery_mismatch:
        errors.append(
            f"{lang}: "
            f"gallery_mismatch="
            f"{gallery_mismatch}"
        )

    if relation_mismatch:
        errors.append(
            f"{lang}: "
            f"relation_mismatch="
            f"{relation_mismatch}"
        )

    payloads[lang] = {
        "version": 3,
        "language": lang,
        "entity_type": "project",
        "count": len(rows),
        "projects": rows,
    }


if errors:
    print()
    print("=" * 78)
    print("VALIDATION FAILED ❌")
    print("=" * 78)

    for error in errors:
        print("ERROR:", error)

    raise SystemExit(1)


OUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

for lang, payload in payloads.items():
    out = (
        OUT_DIR /
        f"{lang}.json"
    )

    out.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":")
        ),
        encoding="utf-8"
    )

    print(
        f"WRITE {lang}:",
        out,
        "|",
        round(
            out.stat().st_size
            / 1024
            / 1024,
            2
        ),
        "MB"
    )


print()
print("=" * 78)
print("FINAL: PASS ✅")
print("languages:", len(payloads))
print(
    "projects_total:",
    sum(
        p["count"]
        for p in payloads.values()
    )
)
print("=" * 78)
