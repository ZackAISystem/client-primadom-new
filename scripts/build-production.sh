#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
HOLD="$ROOT/.build-hold-$$"

mkdir -p "$HOLD/hi"
mkdir -p "$HOLD/enru-data"
mkdir -p "$HOLD/enru-content"

ENRU_OUT="$TMP/enru"
HI_OUT="$TMP/hi"

restore_hi() {
  if [ -d "$HOLD/hi/data" ] && [ ! -d "$ROOT/data/primadom/hi" ]; then
    mv "$HOLD/hi/data" "$ROOT/data/primadom/hi"
  fi

  if [ -d "$HOLD/hi/content" ] && [ ! -d "$ROOT/content/_generated/hi" ]; then
    mv "$HOLD/hi/content" "$ROOT/content/_generated/hi"
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
  restore_enru
  rm -rf "$TMP"
  rmdir "$HOLD/hi" 2>/dev/null || true
  rmdir "$HOLD/enru-data" 2>/dev/null || true
  rmdir "$HOLD/enru-content" 2>/dev/null || true
  rmdir "$HOLD" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

cat > "$TMP/enru.toml" <<'CFG'
disableLanguages = ["hi"]
CFG

cat > "$TMP/hi.toml" <<'CFG'
defaultContentLanguage = "hi"
defaultContentLanguageInSubdir = true
disableLanguages = ["en", "ru", "ar"]
CFG

echo "======================================"
echo "BUILD 1/2 — EN + RU + AR"
echo "======================================"

mv "$ROOT/data/primadom/hi" "$HOLD/hi/data"
mv "$ROOT/content/_generated/hi" "$HOLD/hi/content"

echo "DATA VISIBLE TO BUILD 1:"
du -sh "$ROOT/data"

hugo \
  --config "$ROOT/hugo.toml","$TMP/enru.toml" \
  --minify \
  --destination "$ENRU_OUT"

echo ""
echo "BUILD 1 DONE"

restore_hi

echo ""
echo "======================================"
echo "PREPARE HI-ONLY SOURCE"
echo "======================================"

mv "$ROOT/data/primadom/ru" "$HOLD/enru-data/ru"

for D in "$ROOT"/data/primadom/*_pages_v2; do
  [ -e "$D" ] || continue
  mv "$D" "$HOLD/enru-data/"
done

mv "$ROOT/content/_generated/en" "$HOLD/enru-content/en"
mv "$ROOT/content/_generated/ru" "$HOLD/enru-content/ru"

echo "DATA VISIBLE TO BUILD 2:"
du -sh "$ROOT/data"

echo ""
echo "======================================"
echo "BUILD 2/2 — HI ONLY"
echo "======================================"

hugo \
  --config "$ROOT/hugo.toml","$TMP/hi.toml" \
  --minify \
  --destination "$HI_OUT"

echo ""
echo "BUILD 2 DONE"

restore_enru

echo ""
echo "======================================"
echo "MERGE"
echo "======================================"

rm -rf "$ROOT/public"
mkdir -p "$ROOT/public"

cp -a "$ENRU_OUT/." "$ROOT/public/"
rm -rf "$ROOT/public/hi"
cp -a "$HI_OUT/hi" "$ROOT/public/hi"

cat > "$ROOT/public/sitemap.xml" <<'SITEMAP'
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://primadom.ai/en/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/ru/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/ar/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://primadom.ai/hi/sitemap.xml</loc></sitemap>
</sitemapindex>
SITEMAP

TOTAL="$(find "$ROOT/public" -type f | wc -l | tr -d ' ')"
EN="$(find "$ROOT/public/en" -type f | wc -l | tr -d ' ')"
RU="$(find "$ROOT/public/ru" -type f | wc -l | tr -d ' ')"
HI="$(find "$ROOT/public/hi" -type f | wc -l | tr -d ' ')"
AR="$(find "$ROOT/public/ar" -type f | wc -l | tr -d ' ')"

echo ""
echo "======================================"
echo "FINAL PRODUCTION BUILD"
echo "======================================"
echo "TOTAL: $TOTAL"
echo "EN:    $EN"
echo "RU:    $RU"
echo "HI:    $HI"
echo "AR:    $AR"

test -f "$ROOT/public/index.html"
test -f "$ROOT/public/robots.txt"
test -f "$ROOT/public/css/main.css"
test -f "$ROOT/public/en/index.html"
test -f "$ROOT/public/ru/index.html"
test -f "$ROOT/public/hi/index.html"

if [ "$TOTAL" -gt 100000 ]; then
  echo "ERROR: output exceeds 100000 files"
  exit 1
fi

echo "PASS — production output ready"
