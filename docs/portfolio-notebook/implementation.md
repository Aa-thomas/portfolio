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
  against `node build`, covering: empty states, unknown-URL 404s, anonymous and
  cross-origin (CSRF) rejections, wrong-password behavior, sign-in, project
  save with real photo derivatives, incomplete-draft publish rejection,
  publish → public detail/index/home, public vs private media (source variant
  stays private), Markdown import with H1 title, unresolved-image publish
  block, sanitized public article, idempotent retry, stale-version conflict,
  featured selection, withdrawal (page + media 404 for visitors), restart
  durability, and sign-out invalidation.

Not verified here: hosted cache behavior after withdrawal (PF-10), browser
screenshots at the specified widths (design follows the already-verified
wireframe CSS), and restore-from-backup on a real host.

## Operational notes

- Back up `PORTFOLIO_DATA` (database + media) as one unit; restore as one unit.
- Withdrawal of media sets `Cache-Control` to no-store only for private
  assets; published media uses `must-revalidate`, so origin reads stop serving
  withdrawn assets immediately (verified in the smoke test).
- `ORIGIN` must be set in production so SvelteKit's CSRF origin check accepts
  the real host.
