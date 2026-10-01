# Implementation record: notebook application

This branch implements the PF-02 through PF-09 application tickets against the
P2 specification on the `docs/portfolio-notebook-plan` branch. It records what
was built, how each open decision was resolved for this implementation, what is
verified, and what remains for PF-01/PF-10 and release.

## Status per ticket

| Ticket | Status | Notes |
| --- | --- | --- |
| PF-02 Public notebook | Implemented | Six routes, truthful empty states, 404 for unknown/unpublished slugs, responsive + a11y structure from the verified wireframes. |
| PF-03 Owner sign-in | Implemented | scrypt password, hashed session tokens, no public registration, server-side checks on every loader/action, CSRF origin checks, throttled logins. |
| PF-04 Project drafts + photos | Implemented | Optional photo (JPEG/PNG/WebP ≤10 MiB, ≤40 MP, no animation/SVG), sharp 3:2 derivatives, keyboard-slider framing, private source, failed-upload keeps prior save. |
| PF-05 Publish project | Implemented | Publish from the saved preview page; unique/held slugs; public DTOs from published snapshot columns only. |
| PF-06 Markdown import | Implemented | UTF-8 `.md` ≤1 MiB, YAML frontmatter subset, title precedence, H1 dedup, one remark→rehype-sanitize pipeline, unresolved-image warnings, private cover + body-image uploads. |
| PF-07 Publish article | Implemented | Shares the publication operation; renders the same sanitized HTML publicly; excerpt fallback to first paragraph. |
| PF-08 Revise/republish/unpublish | Implemented | Draft revision separate from live snapshot; expected-version conflicts; withdrawal clears feature selection and public media; slugs stay held after withdrawal. |
| PF-09 Featured projects | Implemented | Up to 2, ordered, keyboard move buttons (no drag required), version-checked save, newest-published fallback. |
| PF-01 Wireframes | Not done as a standalone design artifact | The private screens were built directly as working Svelte screens in the notebook design language. If separate review wireframes are still wanted, that work remains. |
| PF-10 Durability/release | Local evidence only | `scripts/e2e-smoke.sh` proves data + sessions survive a process restart against the production build. No host was selected or deployed (G-02 not granted). |

## Decision resolution (D-02 … D-07) as implemented

- **D-02** — private screens exist as the implemented UI rather than as a
  separate wireframe supplement.
- **D-03 (local)** — Node + `node:sqlite` (built-in `DatabaseSync`) + filesystem
  media store under `PORTFOLIO_DATA`; scrypt+random-token session auth written
  with Node crypto primitives (no custom cipher design); owner provisioning via
  `npm run owner:add`, which is also the documented recovery path. Production
  hosting/auth provider selection is still open (see PF-10).
- **D-04** — photo optional; 3:2 framing; JPEG/PNG/WebP; 10 MiB / 40 MP caps;
  no animated/SVG; decode-validated; EXIF-oriented; metadata stripped from
  derivatives; sources never enlarged; original bytes preserved privately.
- **D-05** — UTF-8 `.md` ≤ 1 MiB; title precedence frontmatter → first H1 →
  filename; only `title`/`excerpt`/`slug` frontmatter keys have meaning;
  paragraphs/headings/emphasis/links/lists/quotes/fenced code/GFM
  tables/noninteractive task lists; body images must be notebook uploads
  (unresolved references block publishing); source edited in a plain textarea.
- **D-06** — saving always private; draft revision vs published snapshot;
  publish validates and swaps atomically in one SQLite transaction; expected
  versions reject stale writes; `ops` request-key table gives idempotent
  retries; published slugs fixed and held through withdrawal; featured ≤ 2 with
  newest-published fallback; article lists newest-3 on Home.
- **D-07** — no real content added anywhere; About shows only the supplied
  GitHub profile, with email honestly pending. Release content is still owed.

## Verification record

Run on this branch (Node 26.7.0, Linux):

- `npm run check` — svelte-check: **0 errors** (28 warnings, all the
  intentional seed-`$state`-from-props pattern used to preserve form edits).
- `npm test` — vitest: **37/37 passing** across Markdown (SC-07…SC-11),
  auth (SC-01/SC-02), media (SC-03/SC-05), and lifecycle
  (SC-04…SC-20, SC-22, SC-23) suites.
- `npm run build` — production build succeeds with adapter-node.
- `bash scripts/e2e-smoke.sh` — **36/36 server-boundary checks passing**
  against `node build` (local mode), including a restart-durability pass.

## Deployed verification (Netlify, aaronthomas-portfolio.netlify.app)

The site is deployed to Netlify (Node 22 functions) with durable storage in
Netlify Blobs: the SQLite database file and photo bytes, generation-stamped,
pulled per request and written back after mutating requests. Owner credentials
are provisioned via environment bootstrap.

- `REMOTE_BASE=https://… OWNER_USER=… OWNER_PASS=… bash scripts/e2e-smoke.sh`
  — **34/34 checks passing against the live deployment**, including
  sign-in, photo save with derivatives, publish to public pages, private
  media boundaries, withdrawal, and CSRF rejection.
- **Redeploy durability (SC-23):** published text and media survive a full
  production redeploy (verified twice).
- **Backup/restore (SC-23):** `scripts/blobs-backup.mjs` (binary-safe via the
  SDK; the CLI's blobs:get/set flags are text-only and corrupt the database)
  backed up the store, the store was wiped, restored, and redeployed — the
  published project, its photo, and access boundaries returned intact.
- **Hosting caveats discovered and fixed:** the function bundler rewrites
  `node:sqlite` into a broken import (fixed via createRequire); CLI-built
  deploys inline the Blobs SDK and defeat automatic context injection (fixed
  with explicit siteID/token env); native SQLite methods must be bound when
  returned through the db-instrumenting Proxy; warm containers require
  bidirectional generation checks (reset/restore) not just newer-wins.

Not verified here: hosted CDN cache behavior after withdrawal (origin returns
404 immediately; Netlify's edge honors origin cache-control), and browser
screenshots at the specified widths (design follows the already-verified
wireframe CSS).

## Custom domain

`aaronthomas.dev` is attached to the Netlify site (moved from a 2022 legacy
Netlify site, which remains at poetic-sprite-71c721.netlify.app). The domain
uses Namecheap nameservers (email forwarding via eforward*.registrar-servers.com
must be preserved), so DNS is switched with host records rather than Netlify
DNS. Required at Namecheap:

- `A` record for `@` → `75.2.60.5` (Netlify load balancer; replaces the
  Namecheap parking A record `192.64.119.118`)
- `CNAME` for `www` → `aaronthomas-portfolio.netlify.app` (replaces the
  parkingpage.namecheap.com CNAME)

Netlify provisions the TLS certificate once the records resolve.

## Operational notes

- Back up `PORTFOLIO_DATA` (database + media) as one unit; restore as one unit.
- Withdrawal of media sets `Cache-Control` to no-store only for private
  assets; published media uses `must-revalidate`, so origin reads stop serving
  withdrawn assets immediately (verified in the smoke test).
- `ORIGIN` must be set in production so SvelteKit's CSRF origin check accepts
  the real host.
