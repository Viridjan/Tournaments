#!/bin/bash
# build.sh — Concatenates src/ files into index.html for GitHub Pages
# No npm, no node required. Just bash + cat.

set -e

OUT="index.html"
SRC="src"

cat > "$OUT" << 'HTML_HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tournament Manager</title>
<style>* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #f8f8f6; }</style>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const{useState,useReducer,useEffect,useRef,useCallback,useMemo}=React;
HTML_HEAD

# Concatenate source files in dependency order
FILES=(
  "$SRC/config.js"
  "$SRC/logic.js"
  "$SRC/storage.js"
  "$SRC/reducer.js"
  "$SRC/ui.js"
  "$SRC/components/Timer.jsx"
  "$SRC/components/DraftGroups.jsx"
  "$SRC/components/Spinner.jsx"
  "$SRC/apps-script-embed.js"
  "$SRC/components/SheetsSync.jsx"
  "$SRC/components/SeedsManager.jsx"
  "$SRC/components/RulesTab.jsx"
  "$SRC/components/LandingScreen.jsx"
  "$SRC/components/PlayersTab.jsx"
  "$SRC/components/MatchesTab.jsx"
  "$SRC/components/StandingsTab.jsx"
  "$SRC/components/SettingsTab.jsx"
  "$SRC/components/TestTab.jsx"
  "$SRC/components/AdvancedTab.jsx"
  "$SRC/components/Shell.jsx"
  "$SRC/App.jsx"
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing $f" >&2
    exit 1
  fi
  echo "" >> "$OUT"
  cat "$f" >> "$OUT"
done

cat >> "$OUT" << 'HTML_FOOT'

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script>
</body>
</html>
HTML_FOOT

echo "✓ Built $OUT ($(wc -c < "$OUT") bytes, $(wc -l < "$OUT") lines)"
