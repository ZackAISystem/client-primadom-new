from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

SRC = ROOT / "data/primadom/project_pages_v2"
OUT = ROOT / "data/search/project_projection_v2.json"


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
    block = blocks.get("block_11_similar_projects", {})

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
    parts = [x for x in str(href or "").split("/") if x]

    try:
        i = parts.index("projects")
        return parts[i + 1] if len(parts) > i + 1 else ""
    except ValueError:
        return ""


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

    if "city view" in q or "skyline view" in q:
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

    if "modern" in q or "contemporary" in q:
        out.append("modern")

    return sorted(set(out))


projects = []
errors = []

for fp in sorted(SRC.glob("*.json")):
    try:
        p = json.loads(fp.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append((fp.name, str(e)))
        continue

    blocks = p.get("blocks", {}) or {}

    hero = blocks.get("block_03_hero", {}) or {}
    short = blocks.get("block_05_short_answer", {}) or {}
    logic = blocks.get("block_08_project_logic", {}) or {}
    location_block = blocks.get("block_10_location", {}) or {}

    slug = str(p.get("primary_entity_slug") or fp.stem)
    url = str(p.get("url_path") or f"/en/projects/{slug}/")

    title = str(hero.get("hero_title") or slug)
    subtitle = str(hero.get("hero_subtitle") or "")

    district = get_fact(blocks, "district")
    developer = get_fact(blocks, "developer")
    property_type = get_fact(blocks, "type")
    units = get_fact(blocks, "units")
    handover = get_fact(blocks, "handover")
    payment_plan = get_fact(blocks, "payment_plan")
    status = get_fact(blocks, "status")
    size_from = get_fact(blocks, "size_from")

    price_display = str(
        hero.get("price_display")
        or get_fact(blocks, "price_from")
    )

    price_amount = hero.get("price_amount")

    address = str(location_block.get("address") or "")

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

    gallery = hero.get("gallery") or []
    gallery1 = str(gallery[0]) if gallery else ""

    chips = short.get("short_answer_chips") or []

    semantic_source = " ".join([
        " ".join(str(x) for x in chips),
        str(short.get("short_answer_summary") or ""),
        str(logic.get("project_logic_text") or ""),
    ])

    features = detect_features(semantic_source)

    similar_slugs = []

    for item in find_similar(blocks):
        if not isinstance(item, dict):
            continue

        s = slug_from_href(item.get("href"))

        if s and s != slug:
            similar_slugs.append(s)

    similar_slugs = list(dict.fromkeys(similar_slugs))

    search_terms = " ".join(
        x for x in [
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
            " ".join(str(x) for x in chips),
        ]
        if x
    ).lower()

    projects.append({
        "slug": slug,
        "entity_type": "project",
        "canonical_url": url,

        "title": title,
        "subtitle": subtitle,

        "gallery_1": gallery1,
        "image_alt": str(hero.get("image_alt") or title),

        "district": district,
        "display_location": display_location,
        "developer": developer,

        "price_display": price_display,
        "price_amount": price_amount,

        "property_type": property_type,
        "units": units,
        "handover": handover,
        "payment_plan": payment_plan,
        "status": status,
        "size_from": size_from,

        "address": address,

        "features": features,
        "similar_projects": similar_slugs,

        "search_terms": search_terms,
    })


payload = {
    "version": 2,
    "language": "en",
    "entity_type": "project",
    "count": len(projects),
    "projects": projects,
}

OUT.write_text(
    json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":")
    ),
    encoding="utf-8"
)

print("projection:", OUT)
print("projects:", len(projects))
print("parse_errors:", len(errors))
print(
    "size_mb:",
    round(OUT.stat().st_size / 1024 / 1024, 2)
)

if errors:
    for item in errors[:10]:
        print("ERROR:", item)
