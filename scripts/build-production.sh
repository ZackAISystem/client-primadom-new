#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
HOLD="$ROOT/.build-hold-$$"

mkdir -p "$HOLD/hi"
mkdir -p "$HOLD/zh"
mkdir -p "$HOLD/enru-data"
mkdir -p "$HOLD/enru-content"

ENRU_OUT="$TMP/enru"
HI_OUT="$TMP/hi"
ZH_OUT="$TMP/zh"

restore_hi() {
  if [ -d "$HOLD/hi/data" ] && [ ! -d "$ROOT/data/primadom/hi" ]; then
    mv "$HOLD/hi/data" "$ROOT/data/primadom/hi"
  fi

  if [ -d "$HOLD/hi/content" ] && [ ! -d "$ROOT/content/_generated/hi" ]; then
    mv "$HOLD/hi/content" "$ROOT/content/_generated/hi"
  fi
}

restore_zh() {
  if [ -d "$HOLD/zh/data" ] && [ ! -d "$ROOT/data/primadom/zh" ]; then
    mv "$HOLD/zh/data" "$ROOT/data/primadom/zh"
  fi

  if [ -d "$HOLD/zh/content" ] && [ ! -d "$ROOT/content/_generated/zh" ]; then
    mv "$HOLD/zh/content" "$ROOT/content/_generated/zh"
  fi
}

restore_enru() {
  if [ -d "$HOLD/enru-data/ru" ] && [ ! -d "$ROOT/data/primadom/ru" ]; then
    mv "$HOLD/enru-data/ru" "$ROOT/data/primadom/ru"
  fi

  for D in "$HOLD"/enru-data/*_pages_v2; do
    [ -e "$D" ] || continue
    mv "$D" "$ROOT/data/primadom/"
  done

  if [ -d "$HOLD/enru-content/en" ] && [ ! -d "$ROOT/content/_generated/en" ]; then
    mv "$HOLD/enru-content/en" "$ROOT/content/_generated/en"
  fi

  if [ -d "$HOLD/enru-content/ru" ] && [ ! -d "$ROOT/content/_generated/ru" ]; then
    mv "$HOLD/enru-content/ru" "$ROOT/content/_generated/ru"
  fi
}

cleanup() {
  restore_hi
  restore_zh
  restore_enru

  rm -rf "$TMP"

  rmdir "$HOLD/hi" 2>/dev/null || true
  rmdir "$HOLD/zh" 2>/dev/null || true
  rmdir "$HOLD/enru-data" 2>/dev/null || true
  rmdir "$HOLD/enru-content" 2>/dev/null || true
  rmdir "$HOLD" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "======================================"
echo "PRE-FLIGHT"
echo "======================================"

test -d "$ROOT/data/primadom/ru"
test -d "$ROOT/data/primadom/hi"
test -d "$ROOT/data/primadom/zh"

test -d "$ROOT/content/_generated/en"
test -d "$ROOT/content/_generated/ru"
test -d "$ROOT/content/_generated/hi"
test -d "$ROOT/content/_generated/zh"

ZH_JSON="$(
  find "$ROOT/data/primadom/zh" \
    -type f \
    -name '*.json' \
    | wc -l \
    | tr -d ' '
)"

ZH_ROUTES="$(
  find "$ROOT/content/_generated/zh" \
    -type f \
    -name 'index.zh.md' \
    | wc -l \
    | tr -d ' '
)"

echo "ZH JSON:   $ZH_JSON"
echo "ZH ROUTES: $ZH_ROUTES"

if [ "$ZH_JSON" -ne 22499 ]; then
  echo "ERROR: expected 22499 ZH JSON files"
  exit 1
fi

if [ "$ZH_ROUTES" -ne 22499 ]; then
  echo "ERROR: expected 22499 ZH routes"
  exit 1
fi

cat > "$TMP/enru.toml" <<'CFG'
disableLanguages = ["hi", "zh"]

[languages.zh]
languageName = "中文"
languageCode = "zh-CN"
weight = 5
contentDir = "content"
CFG

cat > "$TMP/hi.toml" <<'CFG'
defaultContentLanguage = "hi"
defaultContentLanguageInSubdir = true
disableLanguages = ["en", "ru", "ar", "zh"]

[languages.zh]
languageName = "中文"
languageCode = "zh-CN"
weight = 5
contentDir = "content"
CFG

cat > "$TMP/zh.toml" <<'CFG'
defaultContentLanguage = "zh"
defaultContentLanguageInSubdir = true
disableLanguages = ["en", "ru", "ar", "hi"]

[languages.zh]
languageName = "中文"
languageCode = "zh-CN"
weight = 5
contentDir = "content"
CFG

echo ""
echo "======================================"
echo "BUILD 1/3 — EN + RU + AR"
echo "======================================"

mv "$ROOT/data/primadom/hi" \
   "$HOLD/hi/data"

mv "$ROOT/content/_generated/hi" \
   "$HOLD/hi/content"

mv "$ROOT/data/primadom/zh" \
   "$HOLD/zh/data"

mv "$ROOT/content/_generated/zh" \
   "$HOLD/zh/content"

echo "DATA VISIBLE TO BUILD 1:"
du -sh "$ROOT/data"

hugo \
  --config "$ROOT/hugo.toml","$TMP/enru.toml" \
  --minify \
  --destination "$ENRU_OUT"

echo ""
echo "BUILD 1 DONE"

echo ""
echo "======================================"
echo "PREPARE HI-ONLY SOURCE"
echo "======================================"

mv "$ROOT/data/primadom/ru" \
   "$HOLD/enru-data/ru"

for D in "$ROOT"/data/primadom/*_pages_v2; do
  [ -e "$D" ] || continue
  mv "$D" "$HOLD/enru-data/"
done

mv "$ROOT/content/_generated/en" \
   "$HOLD/enru-content/en"

mv "$ROOT/content/_generated/ru" \
   "$HOLD/enru-content/ru"

restore_hi

echo "DATA VISIBLE TO BUILD 2:"
du -sh "$ROOT/data"

echo ""
echo "======================================"
echo "BUILD 2/3 — HI ONLY"
echo "======================================"

hugo \
  --config "$ROOT/hugo.toml","$TMP/hi.toml" \
  --minify \
  --destination "$HI_OUT"

echo ""
echo "BUILD 2 DONE"

echo ""
echo "======================================"
echo "PREPARE ZH-ONLY SOURCE"
echo "======================================"

mv "$ROOT/data/primadom/hi" \
   "$HOLD/hi/data"

mv "$ROOT/content/_generated/hi" \
   "$HOLD/hi/content"

restore_zh

echo "DATA VISIBLE TO BUILD 3:"
du -sh "$ROOT/data"

echo ""
echo "======================================"
echo "BUILD 3/3 — ZH ONLY"
echo "======================================"

hugo \
  --config "$ROOT/hugo.toml","$TMP/zh.toml" \
  --minify \
  --destination "$ZH_OUT"

echo ""
echo "BUILD 3 DONE"

echo ""
echo "======================================"
echo "RESTORE SOURCE TREE"
echo "======================================"

restore_hi
restore_zh
restore_enru

test -d "$ROOT/data/primadom/ru"
test -d "$ROOT/data/primadom/hi"
test -d "$ROOT/data/primadom/zh"

test -d "$ROOT/content/_generated/en"
test -d "$ROOT/content/_generated/ru"
test -d "$ROOT/content/_generated/hi"
test -d "$ROOT/content/_generated/zh"

echo "SOURCE TREE RESTORED"

echo ""
echo "======================================"
echo "MERGE"
echo "======================================"

rm -rf "$ROOT/public"
mkdir -p "$ROOT/public"

cp -a "$ENRU_OUT/." \
      "$ROOT/public/"

rm -rf "$ROOT/public/hi"
cp -a "$HI_OUT/hi" \
      "$ROOT/public/hi"

rm -rf "$ROOT/public/zh"
cp -a "$ZH_OUT/zh" \
      "$ROOT/public/zh"

cat > "$ROOT/public/sitemap.xml" <<'SITEMAP'
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://primadom.ai/en/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/ru/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/ar/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/hi/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/zh/sitemap.xml</loc></sitemap>
</sitemapindex>
SITEMAP

TOTAL="$(
  find "$ROOT/public" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

EN="$(
  find "$ROOT/public/en" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

RU="$(
  find "$ROOT/public/ru" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

HI="$(
  find "$ROOT/public/hi" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

ZH="$(
  find "$ROOT/public/zh" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

AR="$(
  find "$ROOT/public/ar" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

count_leaf() {
  local SECTION="$1"

  find "$ROOT/public/zh/$SECTION" \
    -mindepth 2 \
    -maxdepth 2 \
    -type f \
    -name 'index.html' \
    2>/dev/null \
    | wc -l \
    | tr -d ' '
}

ZH_DISTRICT="$(count_leaf areas)"
ZH_DEVELOPER="$(count_leaf developers)"
ZH_DEV_COMP="$(count_leaf compare-developers)"
ZH_DIST_COMP="$(count_leaf compare-areas)"
ZH_BUYER="$(count_leaf buyer-scenarios)"
ZH_PROJECT_COMP="$(count_leaf compare-projects)"
ZH_PROJECT="$(count_leaf projects)"
ZH_AI="$(count_leaf ai-answers)"
ZH_PROPERTY_TYPE="$(count_leaf property-types)"
ZH_BUDGET="$(count_leaf budgets)"
ZH_INTENT="$(count_leaf intents)"

ZH_AI_TOTAL="$(
  (
    echo "$ZH_DISTRICT"
    echo "$ZH_DEVELOPER"
    echo "$ZH_DEV_COMP"
    echo "$ZH_DIST_COMP"
    echo "$ZH_BUYER"
    echo "$ZH_PROJECT_COMP"
    echo "$ZH_PROJECT"
    echo "$ZH_AI"
    echo "$ZH_PROPERTY_TYPE"
    echo "$ZH_BUDGET"
    echo "$ZH_INTENT"
  ) | awk '{s += $1} END {print s}'
)"

echo ""
echo "======================================"
echo "FINAL PRODUCTION BUILD"
echo "======================================"

echo "TOTAL FILES: $TOTAL"
echo "EN:          $EN"
echo "RU:          $RU"
echo "HI:          $HI"
echo "ZH:          $ZH"
echo "AR:          $AR"

echo ""
echo "ZH AI PAGE COUNTS:"
echo "District:               $ZH_DISTRICT / 301"
echo "Developer:              $ZH_DEVELOPER / 509"
echo "Developer Comparison:   $ZH_DEV_COMP / 550"
echo "District Comparison:    $ZH_DIST_COMP / 750"
echo "Buyer Scenarios:        $ZH_BUYER / 2085"
echo "Project Comparison:     $ZH_PROJECT_COMP / 2250"
echo "Project:                $ZH_PROJECT / 2571"
echo "AI Answer:              $ZH_AI / 1481"
echo "Property Type:          $ZH_PROPERTY_TYPE / 1398"
echo "Budget:                 $ZH_BUDGET / 3568"
echo "Intent:                 $ZH_INTENT / 7036"
echo "ZH AI TOTAL:            $ZH_AI_TOTAL / 22499"

test -f "$ROOT/public/index.html"
test -f "$ROOT/public/robots.txt"
test -f "$ROOT/public/css/main.css"

test -f "$ROOT/public/en/index.html"
test -f "$ROOT/public/ru/index.html"
test -f "$ROOT/public/hi/index.html"
test -f "$ROOT/public/zh/index.html"
test -f "$ROOT/public/ar/index.html"

test -f "$ROOT/public/en/sitemap.xml"
test -f "$ROOT/public/ru/sitemap.xml"
test -f "$ROOT/public/hi/sitemap.xml"
test -f "$ROOT/public/zh/sitemap.xml"

test -f "$ROOT/public/zh/projects/1wood-residence-phase-2/index.html"
test -f "$ROOT/public/zh/budgets/aed-1m-2m-in-ajman-downtown/index.html"
test -f "$ROOT/public/zh/intents/4direction-developers-projects-in-dubailand/index.html"

grep -q \
  'https://primadom.ai/zh/sitemap.xml' \
  "$ROOT/public/sitemap.xml"

if [ "$EN" -lt 22523 ]; then
  echo "ERROR: EN output dropped below previous production baseline"
  exit 1
fi

if [ "$RU" -lt 22506 ]; then
  echo "ERROR: RU output dropped below previous production baseline"
  exit 1
fi

if [ "$HI" -lt 22522 ]; then
  echo "ERROR: HI output dropped below previous production baseline"
  exit 1
fi

if [ "$AR" -lt 7 ]; then
  echo "ERROR: AR output dropped below previous production baseline"
  exit 1
fi

if [ "$ZH" -lt 22500 ]; then
  echo "ERROR: ZH output is unexpectedly small"
  exit 1
fi

if [ "$ZH_DISTRICT" -ne 301 ]; then exit 1; fi
if [ "$ZH_DEVELOPER" -ne 509 ]; then exit 1; fi
if [ "$ZH_DEV_COMP" -ne 550 ]; then exit 1; fi
if [ "$ZH_DIST_COMP" -ne 750 ]; then exit 1; fi
if [ "$ZH_BUYER" -ne 2085 ]; then exit 1; fi
if [ "$ZH_PROJECT_COMP" -ne 2250 ]; then exit 1; fi
if [ "$ZH_PROJECT" -ne 2571 ]; then exit 1; fi
if [ "$ZH_AI" -ne 1481 ]; then exit 1; fi
if [ "$ZH_PROPERTY_TYPE" -ne 1398 ]; then exit 1; fi
if [ "$ZH_BUDGET" -ne 3568 ]; then exit 1; fi
if [ "$ZH_INTENT" -ne 7036 ]; then exit 1; fi

if [ "$ZH_AI_TOTAL" -ne 22499 ]; then
  echo "ERROR: ZH AI page total != 22499"
  exit 1
fi

if [ "$TOTAL" -lt 90000 ]; then
  echo "ERROR: final output unexpectedly below 90000 files"
  exit 1
fi

if [ "$TOTAL" -gt 100000 ]; then
  echo "ERROR: output exceeds 100000 files"
  exit 1
fi

echo ""
echo "PASS — EN/RU/HI/AR preserved"
echo "PASS — ZH 22,499 AI pages present"
echo "PASS — total output below 100,000 files"
echo "PASS — production output ready"
