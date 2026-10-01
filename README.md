# Portfolio notebook

One personal website for software development and writing: a handwritten-notebook
public site plus a private owner studio for publishing projects and Markdown
articles without code changes.

- **Public site** (`/`): portfolio-first Home (featured projects, latest writing),
  `/projects`, `/projects/<slug>`, `/writing`, `/writing/<slug>`, `/about`.
- **Owner studio** (`/studio`): sign in, library of drafts and live entries,
  project editor with photo upload and 3:2 framing, Markdown article import with
  preview, publish / republish / unpublish, and featured-project selection.
- **Design**: the verified notebook wireframes (see the `docs/portfolio-notebook`
  branch) ported to Svelte components — warm paper, Patrick Hand headings,
  Rough Notation annotations, Lucide icons.
- **Legacy**: `index.html`, `styles/`, `scripts/`, `images/` are the previous
  static portfolio, kept as historical reference. They are not served by the
  SvelteKit app.

## Requirements

- Node.js 22.5+ (developed on 26; `node:sqlite` is built in — no native database
  add-on).
- A persistent `PORTFOLIO_DATA` directory for the SQLite database and uploaded
  media (default `./data`, gitignored).

## Everyday commands

```sh
npm install
npm run owner:add -- aaron        # provision the owner; prompts for a 12+ char password
npm run dev                       # http://localhost:5173
npm run check                     # svelte-check (TypeScript + Svelte)
npm test                          # vitest: Markdown, auth, media, lifecycle suites
npm run build                     # production build (adapter-node)
PORTFOLIO_DATA=./data node build  # run the production server
bash scripts/e2e-smoke.sh         # full server-boundary smoke test (builds nothing; runs `node build`)
```

The smoke script provisions a throwaway owner and data directory, then drives
the whole journey over HTTP — including signed-out rejections, CSRF, duplicate
slugs, stale versions, idempotent retries, withdrawal, and a restart-durability
check.

## Production notes (adapter-node)

Set `ORIGIN` (your public origin) and `PORTFOLIO_DATA` (persistent volume) in
the environment. Sessions are httpOnly cookies; CSRF origin checking is on.
Back up the whole `PORTFOLIO_DATA` directory — database and media together —
and restore it as one unit (see `docs/portfolio-notebook/implementation.md`).

## Layout

```
src/lib/server/   db, auth, media (sharp), markdown (remark+sanitize), publish lifecycle
src/lib/queries   public read boundary (published snapshots only)
src/routes/       public pages, /media file origin, /studio private area
static/           Patrick Hand, Rough Notation (+ licenses)
tests/            focused scenario suites
scripts/          owner provisioning, e2e smoke test
```
