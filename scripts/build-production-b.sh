#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WORK="$ROOT/.build-project-b"
FINAL="$ROOT/public"

LANGS=(es fr de ar)

EXPECTED=22499

cleanup() {
  rm -rf "$WORK"
}

trap cleanup EXIT INT TERM

rm -rf "$WORK" "$FINAL"

mkdir -p \
  "$WORK" \
  "$FINAL"

echo ""
echo "========================================"
echo "PRIMADOM AI — PAGES PROJECT B"
echo "ES + FR + DE + AR"
echo "========================================"

# ------------------------------------------------------------
# Source readiness
# ------------------------------------------------------------

for LANG in "${LANGS[@]}"; do

  DATA="$ROOT/data/primadom/$LANG"
  CONTENT="$ROOT/content/_generated/$LANG"

  JSON_COUNT="$(
    find "$DATA" \
      -type f \
      -name '*.json' \
      | wc -l \
      | tr -d ' '
  )"

  ROUTE_COUNT="$(
    find "$CONTENT" \
      -type f \
      -name "index.$LANG.md" \
      | wc -l \
      | tr -d ' '
  )"

  echo ""
  echo "[$LANG]"
  echo "JSON:   $JSON_COUNT / $EXPECTED"
  echo "Routes: $ROUTE_COUNT / $EXPECTED"

  if [ "$JSON_COUNT" -ne "$EXPECTED" ]; then
    echo "ERROR — $LANG JSON count mismatch"
    exit 1
  fi

  if [ "$ROUTE_COUNT" -ne "$EXPECTED" ]; then
    echo "ERROR — $LANG route count mismatch"
    exit 1
  fi

done

# ------------------------------------------------------------
# Build one language at a time.
#
# Important:
# Hugo physically sees only:
#   shared lightweight data
#   data/primadom/<LANG>
#   content/_generated/<LANG>
# ------------------------------------------------------------

BUILD_NO=0

for LANG in "${LANGS[@]}"; do

  BUILD_NO=$((BUILD_NO + 1))

  STAGE="$WORK/$LANG"
  OUT="$WORK/out-$LANG"
  CONFIG="$WORK/$LANG.toml"

  rm -rf "$STAGE" "$OUT"

  mkdir -p \
    "$STAGE/data/primadom/$LANG" \
    "$STAGE/content/_generated/$LANG" \
    "$OUT"

  echo ""
  echo "========================================"
  echo "BUILD $BUILD_NO/4 — $(printf '%s' "$LANG" | tr '[:lower:]' '[:upper:]') ONLY"
  echo "========================================"

  # Lightweight shared data only.
  rsync -a \
    --exclude='primadom/' \
    "$ROOT/data/" \
    "$STAGE/data/"

  # Only current language Primadom JSON.
  rsync -a \
    "$ROOT/data/primadom/$LANG/" \
    "$STAGE/data/primadom/$LANG/"

  # Only current language generated routes.
  rsync -a \
    "$ROOT/content/_generated/$LANG/" \
    "$STAGE/content/_generated/$LANG/"

  # Language-specific temporary Hugo override.
  case "$LANG" in

    es)
      cat > "$CONFIG" <<'TOML'
defaultContentLanguage = "es"
defaultContentLanguageInSubdir = true

dataDir = ".build-project-b/es/data"

disableLanguages = [
  "en",
  "ru",
  "hi",
  "zh",
  "fr",
  "de",
  "ar"
]

[languages.es]
  languageName = "Español"
  languageCode = "es"
  contentDir = ".build-project-b/es/content"
TOML
      ;;

    fr)
      cat > "$CONFIG" <<'TOML'
defaultContentLanguage = "fr"
defaultContentLanguageInSubdir = true

dataDir = ".build-project-b/fr/data"

disableLanguages = [
  "en",
  "ru",
  "hi",
  "zh",
  "es",
  "de",
  "ar"
]

[languages.fr]
  languageName = "Français"
  languageCode = "fr"
  contentDir = ".build-project-b/fr/content"
TOML
      ;;

    de)
      cat > "$CONFIG" <<'TOML'
defaultContentLanguage = "de"
defaultContentLanguageInSubdir = true

dataDir = ".build-project-b/de/data"

disableLanguages = [
  "en",
  "ru",
  "hi",
  "zh",
  "es",
  "fr",
  "ar"
]

[languages.de]
  languageName = "Deutsch"
  languageCode = "de"
  contentDir = ".build-project-b/de/content"
TOML
      ;;

    ar)
      cat > "$CONFIG" <<'TOML'
defaultContentLanguage = "ar"
defaultContentLanguageInSubdir = true

dataDir = ".build-project-b/ar/data"

disableLanguages = [
  "en",
  "ru",
  "hi",
  "zh",
  "es",
  "fr",
  "de"
]

[languages.ar]
  languageName = "العربية"
  languageCode = "ar"
  languageDirection = "rtl"
  contentDir = ".build-project-b/ar/content"
TOML
      ;;

  esac

  echo "DATA VISIBLE:"
  du -sh "$STAGE/data" || true

  hugo \
    --config "hugo.toml,$CONFIG" \
    --destination "$OUT" \
    --cleanDestinationDir \
    --minify

  LANG_HTML="$(
    find "$OUT/$LANG" \
      -type f \
      -name 'index.html' \
      | wc -l \
      | tr -d ' '
  )"

  echo ""
  echo "$(printf '%s' "$LANG" | tr '[:lower:]' '[:upper:]') index.html files: $LANG_HTML"

  # Business count is checked later from known route directories.
  # Here we only require the language output to exist.
  if [ ! -d "$OUT/$LANG" ]; then
    echo "ERROR — missing output directory $OUT/$LANG"
    exit 1
  fi

  # First build seeds shared/static assets into final public.
  if [ "$BUILD_NO" -eq 1 ]; then

    rsync -a \
      "$OUT/" \
      "$FINAL/"

  else

    mkdir -p \
      "$FINAL/$LANG"

    rsync -a \
      "$OUT/$LANG/" \
      "$FINAL/$LANG/"

  fi

done

# ------------------------------------------------------------
# Final business-page QA
# ------------------------------------------------------------

count_routes() {

  local dir="$1"

  if [ ! -d "$dir" ]; then
    echo 0
    return
  fi

  find "$dir" \
    -mindepth 2 \
    -maxdepth 2 \
    -type f \
    -name 'index.html' \
    | wc -l \
    | tr -d ' '
}

check_language() {

  local LANG="$1"

  local DISTRICT
  local DEVELOPER
  local DEVCOMP
  local DISTCOMP
  local BUYERS
  local PROJCOMP
  local PROJECT
  local AIANSWER
  local PROPERTYTYPE
  local BUDGET
  local INTENT
  local TOTAL

  DISTRICT="$(count_routes "$FINAL/$LANG/areas")"
  DEVELOPER="$(count_routes "$FINAL/$LANG/developers")"
  DEVCOMP="$(count_routes "$FINAL/$LANG/compare-developers")"
  DISTCOMP="$(count_routes "$FINAL/$LANG/compare-areas")"
  BUYERS="$(count_routes "$FINAL/$LANG/buyer-scenarios")"
  PROJCOMP="$(count_routes "$FINAL/$LANG/compare-projects")"
  PROJECT="$(count_routes "$FINAL/$LANG/projects")"
  AIANSWER="$(count_routes "$FINAL/$LANG/ai-answers")"
  PROPERTYTYPE="$(count_routes "$FINAL/$LANG/property-types")"
  BUDGET="$(count_routes "$FINAL/$LANG/budgets")"
  INTENT="$(count_routes "$FINAL/$LANG/intents")"

  TOTAL=$(( \
    DISTRICT + \
    DEVELOPER + \
    DEVCOMP + \
    DISTCOMP + \
    BUYERS + \
    PROJCOMP + \
    PROJECT + \
    AIANSWER + \
    PROPERTYTYPE + \
    BUDGET + \
    INTENT \
  ))

  echo ""
  echo "========================================"
  echo "$(printf '%s' "$LANG" | tr '[:lower:]' '[:upper:]') BUSINESS HTML QA"
  echo "========================================"

  printf "District:              %s / 301\n"  "$DISTRICT"
  printf "Developer:             %s / 509\n"  "$DEVELOPER"
  printf "Developer Comparison:  %s / 550\n"  "$DEVCOMP"
  printf "District Comparison:   %s / 750\n"  "$DISTCOMP"
  printf "Buyer Scenarios:       %s / 2085\n" "$BUYERS"
  printf "Project Comparison:    %s / 2250\n" "$PROJCOMP"
  printf "Project:               %s / 2571\n" "$PROJECT"
  printf "AI Answer:             %s / 1481\n" "$AIANSWER"
  printf "Property Type:         %s / 1398\n" "$PROPERTYTYPE"
  printf "Budget:                %s / 3568\n" "$BUDGET"
  printf "Intent:                %s / 7036\n" "$INTENT"

  echo "----------------------------------------"

  printf "TOTAL BUSINESS HTML:   %s / 22499\n" "$TOTAL"

  if [ "$DISTRICT" -ne 301 ] \
    || [ "$DEVELOPER" -ne 509 ] \
    || [ "$DEVCOMP" -ne 550 ] \
    || [ "$DISTCOMP" -ne 750 ] \
    || [ "$BUYERS" -ne 2085 ] \
    || [ "$PROJCOMP" -ne 2250 ] \
    || [ "$PROJECT" -ne 2571 ] \
    || [ "$AIANSWER" -ne 1481 ] \
    || [ "$PROPERTYTYPE" -ne 1398 ] \
    || [ "$BUDGET" -ne 3568 ] \
    || [ "$INTENT" -ne 7036 ] \
    || [ "$TOTAL" -ne 22499 ]; then

    echo "ERROR — $(printf '%s' "$LANG" | tr '[:lower:]' '[:upper:]') business count mismatch"
    exit 1
  fi
}

for LANG in "${LANGS[@]}"; do
  check_language "$LANG"
done

# ------------------------------------------------------------
# File-limit QA
# ------------------------------------------------------------

TOTAL_FILES="$(
  find "$FINAL" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

ES_FILES="$(
  find "$FINAL/es" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

FR_FILES="$(
  find "$FINAL/fr" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

DE_FILES="$(
  find "$FINAL/de" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

AR_FILES="$(
  find "$FINAL/ar" \
    -type f \
    | wc -l \
    | tr -d ' '
)"

echo ""
echo "========================================"
echo "PROJECT B FINAL OUTPUT"
echo "========================================"
echo "TOTAL FILES: $TOTAL_FILES"
echo "ES FILES:    $ES_FILES"
echo "FR FILES:    $FR_FILES"
echo "DE FILES:    $DE_FILES"
echo "AR FILES:    $AR_FILES"
echo "========================================"

if [ "$TOTAL_FILES" -gt 100000 ]; then
  echo "ERROR — Pages Project B exceeds 100,000 files"
  exit 1
fi

test -d "$FINAL/es"
test -d "$FINAL/fr"
test -d "$FINAL/de"
test -d "$FINAL/ar"

echo ""
echo "========================================"
echo "PROJECT B PRODUCTION OUTPUT READY ✅"
echo "ES + FR + DE + AR"
echo "89,996 BUSINESS PAGES"
echo "FILES: $TOTAL_FILES / 100000"
echo "========================================"
