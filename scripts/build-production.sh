#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"

TMP="$(mktemp -d)"
HOLD="$ROOT/.build-hold-$$"

mkdir -p "$HOLD"

ENRU_OUT="$TMP/enru"
HI_OUT="$TMP/hi"

HI_DATA="$ROOT/data/primadom/hi"
HI_CONTENT="$ROOT/content/_generated/hi"

HI_DATA_HOLD="$HOLD/hi-data"
HI_CONTENT_HOLD="$HOLD/hi-content"

restore_hi() {
  if [ -d "$HI_DATA_HOLD" ] && [ ! -d "$HI_DATA" ]; then
    mv "$HI_DATA_HOLD" "$HI_DATA"
  fi

  if [ -d "$HI_CONTENT_HOLD" ] && [ ! -d "$HI_CONTENT" ]; then
    mv "$HI_CONTENT_HOLD" "$HI_CONTENT"
  fi

  rmdir "$HOLD" 2>/dev/null || true
}

cleanup() {
  restore_hi
  rm -rf "$TMP"
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

mv "$HI_DATA" "$HI_DATA_HOLD"
mv "$HI_CONTENT" "$HI_CONTENT_HOLD"

hugo \
  --config hugo.toml,"$TMP/enru.toml" \
  --minify \
  --destination "$ENRU_OUT"

echo ""
echo "RESTORE HI SOURCE — START"
restore_hi
echo "RESTORE HI SOURCE — DONE"

echo ""
echo "======================================"
echo "BUILD 2/2 — HI"
echo "======================================"

hugo \
  --config hugo.toml,"$TMP/hi.toml" \
  --minify \
  --destination "$HI_OUT"

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
