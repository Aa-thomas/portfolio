#!/usr/bin/env bash
# End-to-end smoke test against the production build (server boundary).
# Covers the PF-03..PF-09 scenario checks that a signed-out visitor and a
# direct HTTP client can observe. Run from the repo root after `npm run build`.
set -u
PORT=4317
BASE="http://127.0.0.1:$PORT"
ORIGIN="Origin: http://127.0.0.1:$PORT"
DATA="$(mktemp -d /tmp/notebook-e2e.XXXXXX)"
JAR="$DATA/cookies.txt"
PASS=0; FAIL=0

say()  { printf '%s\n' "$*"; }
ok()   { PASS=$((PASS+1)); say "ok   - $1"; }
bad()  { FAIL=$((FAIL+1)); say "FAIL - $1"; }
check(){ if [ "$1" = "$2" ]; then ok "$3 ($1)"; else bad "$3 (want $2, got $1)"; fi }

check_contains(){ if grep -q "$2" <<<"$1"; then ok "$3"; else bad "$3 (missing: $2)"; fi; }
# Form actions answer HTTP 200 with a JSON body; the browser-side enhance
# layer follows {"type":"redirect","location":...}. Extract that location.
action_location(){ python3 -c "import sys,json
try: print(json.load(sys.stdin).get('location',''))
except Exception: pass"; }

# --- boot ---------------------------------------------------------------
PORT=$PORT ORIGIN="$BASE" PORTFOLIO_DATA="$DATA" node build >/dev/null 2>&1 &
SERVER=$!
for i in $(seq 1 50); do curl -sf -o /dev/null "$BASE/" && break; sleep 0.2; done

OWNER_PASSWORD='a-very-long-e2e-password' PORTFOLIO_DATA="$DATA" \
  node scripts/provision-owner.mjs aaron 'a-very-long-e2e-password' >/dev/null

# --- public reads before content ---------------------------------------
HOME_HTML=$(curl -s "$BASE/")
check_contains "$HOME_HTML" 'Nothing published yet' 'SC-20 home empty state'
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/projects/ghost")" 404 'SC-22 unknown project 404'
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/writing/ghost")" 404 'SC-22 unknown article 404'

# --- private boundary without a session ---------------------------------
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/studio")" 303 'SC-02 /studio redirects signed out'
LOGIN_PAGE=$(curl -s "$BASE/studio/login")
check_contains "$LOGIN_PAGE" 'Private notebook-keeping' 'PF-03 login page renders'
# direct mutation without cookie:
CREATE=$(curl -s -o /dev/null -w '%{http_code};%{redirect_url}' -X POST "$BASE/studio?/createProject" -H "$ORIGIN" -H "Accept: text/html" --data "x=1")
case "$CREATE" in *"/studio/projects/"*) bad 'SC-02 anonymous create must not reach an editor';; *) ok 'SC-02 anonymous create rejected';; esac
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/media/img_missing/card")" 404 'SC-02 unknown media 404'
# cross-origin POST with a foreign Origin is rejected even with the cookie
curl -s -c "$JAR" -o /dev/null -X POST "$BASE/studio/login" -H "$ORIGIN" -H "Accept: text/html" --data 'username=aaron&password=a-very-long-e2e-password'
CSRF=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/studio?/createProject" -H "Origin: https://evil.example" -H "Accept: text/html" --data "x=1")
check "$CSRF" 403 'SC-02 cross-origin mutation with cookie rejected'

# --- bad login ----------------------------------------------------------
curl -s -c "$JAR" -o /dev/null -X POST "$BASE/studio/login" -H "$ORIGIN" -H "Accept: text/html" --data 'username=aaron&password=wrong-wrong-wrong'
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/studio")" 303 'SC-01 wrong password does not sign in'

# --- sign in -------------------------------------------------------------
curl -s -c "$JAR" -o /dev/null -X POST "$BASE/studio/login" -H "$ORIGIN" -H "Accept: text/html" --data 'username=aaron&password=a-very-long-e2e-password'
LIB=$(curl -s -b "$JAR" "$BASE/studio")
check_contains "$LIB" 'library' 'SC-01 signed-in library renders'

# --- project flow (SC-03..SC-06) ----------------------------------------
CREATE_LOC=$(curl -s -b "$JAR" -o /dev/null -w '%{redirect_url}' -X POST "$BASE/studio?/createProject" -H "$ORIGIN" -H "Accept: text/html" --data "x=1")
PID=$(basename "$CREATE_LOC")
say "     project entry: $PID"

node -e "const s=require('sharp');s({create:{width:900,height:500,channels:3,background:'#3a6b5f'}}).jpeg().toFile('$DATA/photo.jpg')"
SAVE=$(curl -s -b "$JAR" -X POST "$BASE/studio/projects/$PID?/save" -H "$ORIGIN" -H "Accept: text/html" \
  -F "expectedVersion=1" -F "title=Notebook E2E Project" \
  -F "url=https://example.com/e2e" -F "description=End-to-end checked project." \
  -F "alt=A plain teal rectangle" -F "caseStudy=" -F "crop=" \
  -F "photo=@$DATA/photo.jpg;type=image/jpeg")
check_contains "$SAVE" 'Saved as draft version 2' 'SC-03 photo draft saved'
check_contains "$SAVE" 'img_' 'SC-03 photo attached'

# incomplete draft cannot publish (SC-04): fresh entry with no fields
CREATE2=$(curl -s -b "$JAR" -o /dev/null -w '%{redirect_url}' -X POST "$BASE/studio?/createProject" -H "$ORIGIN" -H "Accept: text/html" --data "x=1")
PID2=$(basename "$CREATE2")
PUB2=$(curl -s -b "$JAR" -X POST "$BASE/studio/projects/$PID2/preview?/publish" -H "$ORIGIN" -H "Accept: text/html" -F "expectedVersion=1")
check_contains "$PUB2" 'required' 'SC-04 incomplete publish rejected'

# publish the real one from its preview (SC-06)
PUBLOC=$(curl -s -b "$JAR" -o /dev/null -w '%{redirect_url}' -X POST "$BASE/studio/projects/$PID/preview?/publish" -H "$ORIGIN" -H "Accept: text/html" -F "expectedVersion=2")
check "$PUBLOC" "$BASE/projects/notebook-e2e-project" 'SC-06 publish redirects to public page'
PROJ=$(curl -s "$BASE/projects/notebook-e2e-project")
check_contains "$PROJ" 'Notebook E2E Project' 'SC-06 public detail shows title'
check_contains "$PROJ" 'Visit the website' 'SC-06 website link present'
HOME2=$(curl -s "$BASE/")
check_contains "$HOME2" 'Notebook E2E Project' 'SC-20/SC-06 home fallback shows newest project'

# public media now resolves; the private source variant must not (SC-02/SC-15)
IMG_ID=$(grep -o 'img_[a-z0-9]*' <<<"$SAVE" | head -1)
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/media/$IMG_ID/card")" 200 'published card is public'
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/media/$IMG_ID/source")" 404 'source stays private'

# --- article flow (SC-07..SC-12) -----------------------------------------
cat > "$DATA/article.md" <<'MD'
---
excerpt: A short account of the reading pipeline.
---

# How the Notebook Keeps Notes

The first paragraph talks about **Markdown** as data.

## The pipeline

- parse
- sanitize
- publish

<script>alert(1)</script>

![remote](https://example.com/nope.png)
MD
ALOC=$(curl -s -b "$JAR" -o /dev/null -w '%{redirect_url}' -X POST "$BASE/studio?/createArticle" -H "$ORIGIN" -H "Accept: text/html" --data "x=1")
AID=$(basename "$ALOC")
IMP=$(curl -s -b "$JAR" -X POST "$BASE/studio/articles/$AID?/import" -H "$ORIGIN" -H "Accept: text/html" -F "file=@$DATA/article.md;type=text/markdown")
check_contains "$IMP" 'first heading became the title' 'SC-07 H1 title used'
PUBA=$(curl -s -b "$JAR" -X POST "$BASE/studio/articles/$AID/preview?/publish" -H "$ORIGIN" -H "Accept: text/html" -F "expectedVersion=2")
check_contains "$PUBA" 'Unresolved image' 'SC-11 unresolved image blocks publish'

# remove the remote image, save, publish
SRC_CLEAN=$(sed 's#!\[remote\](https://example.com/nope.png)#Removed.#' "$DATA/article.md")
SRC_FIELD=$(python3 - "$DATA/article.md" <<'PY'
import sys, urllib.parse, re
text = open(sys.argv[1]).read()
text = re.sub(r'!\[remote\]\(https://example\.com/nope\.png\)', 'Removed.', text)
print(urllib.parse.quote(text))
PY
)
curl -s -b "$JAR" -o /dev/null -X POST "$BASE/studio/articles/$AID?/save" -H "$ORIGIN" -H "Accept: text/html" \
  --data "expectedVersion=2&requestId=e2e-req-1&title=How%20the%20Notebook%20Keeps%20Notes&slug=&excerpt=A%20short%20account%20of%20the%20reading%20pipeline.&source=$SRC_FIELD"
APUB=$(curl -s -b "$JAR" -o /dev/null -w '%{redirect_url}' -X POST "$BASE/studio/articles/$AID/preview?/publish" -H "$ORIGIN" -H "Accept: text/html" -F "expectedVersion=3")
check "$APUB" "$BASE/writing/how-the-notebook-keeps-notes" 'SC-12 article published at slug'
ART=$(curl -s "$BASE/writing/how-the-notebook-keeps-notes")
check_contains "$ART" 'How the Notebook Keeps Notes' 'SC-12 public article title'
if grep -q 'alert(1)' <<<"$ART"; then bad 'SC-10 script payload leaked into article'; else ok 'SC-10 script payload not in public article'; fi
check_contains "$ART" 'user-content-the-pipeline' 'SC-08 sanitized heading anchor present'
WRIT=$(curl -s "$BASE/writing")
check_contains "$WRIT" 'How the Notebook Keeps Notes' 'SC-12 writing index lists article'

# --- idempotent retry (SC-16) --------------------------------------------
RETRY=$(curl -s -b "$JAR" -X POST "$BASE/studio/articles/$AID?/save" -H "$ORIGIN" -H "Accept: text/html" \
  --data "expectedVersion=3&requestId=e2e-req-1&title=How%20the%20Notebook%20Keeps%20Notes&slug=&excerpt=A%20short%20account%20of%20the%20reading%20pipeline.&source=$SRC_FIELD")
check_contains "$RETRY" 'version 3' 'SC-16 retry replays recorded result'

# --- stale version (SC-17) ------------------------------------------------
STALE=$(curl -s -b "$JAR" -X POST "$BASE/studio/articles/$AID?/save" -H "$ORIGIN" -H "Accept: text/html" \
  --data "expectedVersion=1&requestId=e2e-req-2&title=Stale&slug=&excerpt=&source=x")
check_contains "$STALE" 'changed elsewhere' 'SC-17 stale save conflicts'

# --- featured (SC-19) + home ordering --------------------------------------
ORDER=$(python3 -c "import json,urllib.parse;print(urllib.parse.quote(json.dumps(['$PID'])))")
FEAT=$(curl -s -b "$JAR" -X POST "$BASE/studio/home?/save" -H "$ORIGIN" -H "Accept: text/html" --data "expectedVersion=0&order=$ORDER")
check_contains "$FEAT" 'Saved' 'SC-19 featured selection saved'
HOME3=$(curl -s "$BASE/")
check_contains "$HOME3" 'Notebook E2E Project' 'SC-19 home shows featured project'

# --- withdraw (SC-15) ------------------------------------------------------
WV=$(curl -s -b "$JAR" -X POST "$BASE/studio/projects/$PID/preview?/withdraw" -H "$ORIGIN" -H "Accept: text/html" -F "expectedVersion=2")
check_contains "$WV" 'Withdrawn' 'SC-15 withdraw succeeds'
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/projects/notebook-e2e-project")" 404 'SC-15 withdrawn page 404'
check "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/media/$IMG_ID/card")" 404 'SC-15 withdrawn media not served anonymously'

# --- restart durability (SC-23, local evidence for PF-10) ------------------
kill $SERVER 2>/dev/null; wait $SERVER 2>/dev/null
PORT=$PORT ORIGIN="$BASE" PORTFOLIO_DATA="$DATA" node build >/dev/null 2>&1 &
SERVER=$!
for i in $(seq 1 50); do curl -sf -o /dev/null "$BASE/" && break; sleep 0.2; done
ART2=$(curl -s "$BASE/writing/how-the-notebook-keeps-notes")
check_contains "$ART2" 'How the Notebook Keeps Notes' 'SC-23 article survives restart'
LIB2=$(curl -s -b "$JAR" "$BASE/studio")
check_contains "$LIB2" 'Notebook E2E Project' 'SC-23 session and drafts survive restart'

# --- sign out (SC-01) ------------------------------------------------------
curl -s -b "$JAR" -c "$JAR" -o /dev/null -X POST "$BASE/studio?/logout" -H "$ORIGIN" -H "Accept: text/html" --data "x=1"
check "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/studio")" 303 'SC-01 signed-out session cannot read studio'

kill $SERVER 2>/dev/null; wait $SERVER 2>/dev/null
say ""
say "data dir kept for inspection: $DATA"
say "passed: $PASS  failed: $FAIL"
[ "$FAIL" -eq 0 ]
