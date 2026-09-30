# Personal portfolio and writing notebook

Revision P2 · 30 September 2026 · Published planning specification

**Authority:** the conversation establishes the feature direction below. The user explicitly stopped implementation, then requested a specification and tickets with the wireframes. The user subsequently authorized publishing this specification, wireframes, and ticket breakdown to Aa-thomas/portfolio. This authorizes documentation and tracker publication; building, installation, and deployment remain separate. Detailed rules marked **proposed** need review before their dependent tickets can become ready.

## Problem Statement

Aaron needs one personal website for software development and writing. It should feel like a handwritten notebook, with enough structure to browse projects and read longer articles comfortably. Adding content should not require editing application code: Aaron should enter a project's website URL, title, description, and photo, or upload a Markdown article, preview the result, and choose when to publish it.

## Solution

Build the eventual site with TypeScript, Svelte, and SvelteKit. Use the selected portfolio-first layout: introduction, selected projects, latest writing, then contact. Preserve the Excalidraw-inspired paper, handwriting, annotations, and restrained color from the existing design.

Provide a private owner dashboard for projects and articles. Project photos become consistently framed thumbnails made from the real uploaded photo. Markdown becomes a readable article. Both workflows support preview, drafts, publishing, editing, and unpublishing. Publishing content should not require a code change or a manual rebuild.

### Agreed direction

- Public home, projects, project detail, writing, article, and About/contact screens.
- Portfolio-first composition, with writing visible on the homepage.
- Handwritten headings, readable body text, warm paper, blue links, and small yellow annotations.
- Real open-source libraries/components; no invented screenshots, projects, article claims, biography, contact details, or generated imagery.
- SvelteKit and TypeScript; server support for protected publishing and saved uploads.
- Private owner access, project form, photo processing and preview, Markdown import and preview, drafts, publishing, editing, unpublishing, and featured projects.
- Sharp for processing real photos; a remark-based Markdown pipeline. Exact versions are an implementation decision to verify later.

### Wireframes and their authority

The [complete wireframe inventory](wireframes.md) embeds all twelve existing desktop/mobile screenshots and links each to its interactive HTML reference. The [contact sheet](wireframes/contact-sheet.html) opens the full-size captures.

![Existing high-fidelity public wireframes](wireframes/contact-sheet-overview.png)

These six public templates are the visual starting point, not evidence of working publishing features. Placeholder project/article data must not become portfolio claims. The older generated concept images and homepage-only captures are superseded.

The later photo-thumbnail requirement changes Home and Projects; their current wireframes are text-only. The private dashboard, login, project form, Markdown import, crop controls, and publish/error states have no existing wireframes. [PF-01](tickets.md#pf-01) covers those additions without replacing the notebook direction. Their detailed layout remains provisional.

## User Stories

1. As a visitor, I want to understand that Aaron builds software and writes, so I can choose what to explore.
2. As a visitor, I want selected projects near the top of Home, so I can find representative work quickly.
3. As a visitor, I want to browse all published projects, so I can explore beyond the featured work.
4. As a visitor, I want a project's title, description, and real photo to form a clear card, so I can decide whether to open it.
5. As a visitor, I want a project detail page and its website link, so I can understand the work and visit it.
6. As a visitor, I want only real supplied claims, so I can trust what I read.
7. As a visitor, I want recent writing visible on Home, so I can discover articles alongside projects.
8. As a visitor, I want a writing index and individual article pages, so I can browse and read easily.
9. As a reader, I want headings, paragraphs, lists, quotes, links, and code blocks to display clearly, so the imported Markdown keeps its meaning.
10. As a reader, I want long text, code, and tables to work on my phone, so reading does not require scrolling the whole page sideways.
11. As a visitor using a keyboard or assistive technology, I want clear navigation, headings, focus, and labels, so I can use the site independently.
12. As a visitor, I want accurate About and contact information, so I know who made the work and how to reach them.
13. As the owner, I want to sign in privately, so only I can change the site.
14. As the owner, I want to see drafts and published entries in one library, so I know what is saved and what visitors see.
15. As the owner, I want to enter a project's website URL, title, and description, so I can add it without changing code.
16. As the owner, I want to upload a real photo and get a consistent thumbnail, so project entries look considered without manual graphic design.
17. As the owner, I want to adjust the photo framing and preview it, so important content is not cropped out.
18. As the owner, I want to save incomplete work as a draft, so I can return to it later.
19. As the owner, I want to upload a `.md` file, so I can write in my preferred editor.
20. As the owner, I want a sensible suggested title and editable metadata, so import needs little cleanup.
21. As the owner, I want to inspect the article exactly as a visitor will read it, so I can fix formatting before publishing.
22. As the owner, I want clear errors that keep my entered work, so a bad upload or failed save does not make me start over.
23. As the owner, I want to publish deliberately, so a saved draft does not appear publicly by accident.
24. As the owner, I want to edit and republish existing entries, so corrections are easy.
25. As the owner, I want to unpublish an entry, so it leaves the public website while remaining available to me.
26. As the owner, I want to select and order featured projects, so Home reflects the work I want to show first.
27. As the owner, I want saved content and photos to survive a restart or deployment, so publishing does not depend on temporary server files.
28. As the owner, I want retries and a second editing tab to avoid losing or duplicating work, so uncertainty does not damage my library.

## Implementation Decisions

### Observed starting point

The selected repository is Aa-thomas/portfolio, inspected at baseline commit 15b5d360af23186e9806898b798cfee1c8ecdaef. Its current application is a static portfolio with HTML, CSS/Sass, local images, menu navigation, typed heading text, and intersection-observer animation. It has no package manifest, backend publishing workflow, authentication, content database, application test suite, Event Model, or repository agent-policy file in the inspected tree. Existing markup and styles are legacy reference; the notebook wireframes are the new visual authority. The planning package includes six connected public design screens, local open-source assets, screenshots, and browser-check evidence.

### Proposed boundaries

Keep one SvelteKit application with four responsibilities: public reading, owner publishing, content/media transformation, and durable storage. These are ownership boundaries, not separate services. Server operations own validation, authorization, saved state, and publication. Browser state holds only unsaved form edits and preview controls.

Use TypeScript strict checking and Svelte-aware checks when implementation begins. Favor native semantic form controls and links. Reuse the real Rough Notation, Lucide, and Patrick Hand assets/visual patterns already inspected. Do not embed Excalidraw as an editor merely to obtain the appearance.

SvelteKit form actions are a proposed request boundary because they accept server-side form submissions and can progressively enhance feedback. [Official form-action documentation](https://svelte.dev/docs/kit/form-actions) supports that capability. The final transport choice must preserve the same rules; it is not a reason to introduce a separate API service.

### Shared terms and data

| Term | Meaning and owner |
| --- | --- |
| Entry | Stable identity for one project or article. The publishing operation owns it. |
| Draft revision | Saved editable content visible only to the owner. It can be incomplete. |
| Published revision | A complete snapshot explicitly made visible to visitors. |
| Slug | Human-readable part of the public URL, unique within projects or writing. |
| Photo | An owner-uploaded source file; it is never fabricated from a website URL. |
| Thumbnail | A derivative of a real photo with stored crop/framing settings. |
| Preview | A private rendering of a particular draft using the public presentation rules. |
| Featured project | A published project selected for ordered placement on Home. |

**Proposed contract:** an entry has a stable ID, kind, draft version, optional published revision, slug, and timestamps. A project has title, website URL, description, optional photo, crop, alt text, and optional case-study Markdown. An article has title, excerpt, slug, original Markdown, and optional cover photo. Owner identity comes from the server session, never an owner ID supplied by the browser. Distinct project/article shapes should prevent invalid mixtures of fields.

The existing detail wireframe shows a case study, but the agreed quick-add form must work with the four supplied inputs alone. Optional case-study text must not be manufactured or required to publish a basic project. The exact editing control is part of PF-01.

### Project and media workflow

Enter project details, select a photo, adjust framing, preview the card, save a private draft, and publish separately. The website URL is a validated HTTP(S) link; automatic website scraping or screenshot capture is not part of the agreed workflow.

**Proposed defaults for review (D-04):** photo optional with the existing text-only design as fallback; a 3:2 thumbnail frame; JPEG, PNG, and WebP uploads up to 10 MiB and 40 megapixels decoded; no animated images or SVG in the first release. Preserve the source privately and generate responsive derivatives without stretching or enlarging a small source. Apply orientation, remove unnecessary metadata, and record crop settings so preview and final output agree. [Sharp's resize documentation](https://sharp.pixelplumbing.com/api-resize/) supports crop/fit and no-enlargement controls; these particular settings are our proposal.

Show actual title/description as HTML beside the photo, not text baked into a pretend screenshot. If no usable photo is supplied, preserve an intentional text-only layout. A photo-processing error must keep the previous saved revision and explain what can be retried. Upload boundaries must check decoded content as well as the filename. Unpublished media must require owner access.

### Markdown workflow

Import the file as data, preserve its source text, parse optional YAML metadata, and render through a shared preview/public Markdown pipeline. Use remark and a sanitizing HTML stage; Markdown must never run Svelte/JavaScript or use uploaded MDX as executable code. [remark](https://github.com/remarkjs/remark) provides Markdown processing; [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) provides an allowlist-based HTML sanitization stage.

**Proposed defaults (D-05):** UTF-8 `.md`, at most 1 MiB; title precedence is valid frontmatter title, first top-level heading, then filename; the owner can change title, excerpt, and slug before saving. A leading heading used as the title is not duplicated in the article body. Support paragraphs, headings, emphasis, links, lists, quotes, fenced code, GFM tables, and noninteractive task lists. Keep plain code legible; syntax coloring is optional and not an extra product requirement.

Unknown frontmatter keys do not create hidden behavior. Invalid YAML produces an actionable error without overwriting a saved draft. Frontmatter cannot publish content, choose an owner, or override publication timestamps. Proposed first-release handling for Markdown images is to show unresolved-image warnings in preview and block publication until each reference is replaced with an owned uploaded asset or removed. No arbitrary server fetch of article URLs or local filesystem paths. Supporting article-body image mapping remains a D-05 decision; an optional separately uploaded cover uses the same media boundary.

### Publishing lifecycle and consistency

**Proposed rules (D-06):** saving is always private. Editing a live entry creates a draft revision while the last published revision stays visible. Publish validates a complete saved revision and switches public content as one operation; republish preserves the entry's identity and original publication date. Unpublish withdraws the public revision without deleting the draft. Published slugs stay fixed in the first release; redirects and slug changes after publication are deferred.

Use a submitted expected version to reject stale saves/publish actions. Preserve local edits and offer reload/review rather than silently overwriting. Repeated submission of the same save/publish request must not create duplicate entries or reset publication dates. The exact storage transaction/idempotency mechanism is not chosen by this specification.

Published list/detail queries return published fields only. Drafts, draft assets, private previews, administrative responses, and failure details do not enter public page data or shared caches. A successful unpublish must be reflected in subsequent origin reads; hosting-specific cache invalidation must be verified before release. Previously downloaded copies cannot be recalled.

Proposed public routes: `/`, `/projects`, `/projects/<slug>`, `/writing`, `/writing/<slug>`, and `/about`. These describe browser URLs, not required code paths. Missing or unpublished entries return a real not-found response. Publish updates home/index/detail views without a manual rebuild. Use accurate page titles/descriptions and social metadata from published values; missing photos do not generate fictional share images.

### Home and content ordering

**Proposed defaults (D-06):** display up to two featured projects in owner-selected order; when none are selected, show the two most recently published projects. Show the three most recently published articles. All-project and writing indexes sort by first publication date descending with a stable ID tie-break. Unpublishing a featured project removes its feature selection; republishing does not silently reselect it. Zero and one-item states keep the layout intentional.

### Access and durable hosting

One owner; no public sign-up or reader accounts. All owner reads, previews, file operations, and writes need server-side access checks. Sign-out must end the session; an expired session cannot authorize a pending save. Use an established open-source authentication library after the host and sign-in/recovery method are chosen. Avoid custom password or token cryptography.

Hosting, database, media store, authentication provider, backup destination, and deployment adapter are unresolved (D-03). SQLite, Better Auth, and a Node host were previously suggested by the assistant, not separately accepted by Aaron. No existing dependency choice in this static repository settles those decisions. The chosen deployment must support durable content/media and demonstrate a restore; storage on an ephemeral deployment filesystem cannot satisfy that requirement.

## Event Model and Scenarios

- Editable proposed model: [publishing.em](publishing.em).
- Rendered model: [publishing.svg](publishing.svg).
- Authoritative behavior cases: [scenarios.md](scenarios.md), stable IDs SC-01 through SC-24.
- Observed tooling and checks: [verification.md](verification.md).
- Shared ticket model action: **reuse**, updating only if a reviewed decision changes the contract.

The model is proposed behavior, not a description of running code. It models owner access, private project/article drafts, publication, revisions, withdrawal, and featured selection. Detailed rejection/retry/concurrency cases live in the linked scenarios. Diagram events express facts; they do not require an event-sourced database or message bus.

The editable sources now belong to the selected Aa-thomas/portfolio repository. No repository-pinned modeling tool is configured yet; the package preserves the observed 1.13.0 check record for later adoption. Visible model issues deliberately retain the unresolved decisions. Structural validation cannot approve those decisions or prove application behavior.

## Testing Decisions

Test observable behavior at the highest practical boundary: owner browser form through the server operation and durable storage, followed by a separate signed-out visitor read. Use focused transformation tests for unsafe Markdown, corrupt/oversized media, and title/frontmatter behavior. Use server-boundary requests where the UI alone cannot demonstrate authorization or concurrency.

Reuse the inspected preview's visual tokens, layouts, and screenshots as comparison references, not its placeholder data as production fixtures. The recovered design was recaptured using its original procedure; its verification record reports 18 screen/viewport checks. Those checks did not exercise authentication, uploads, storage, or publication; there is no existing application suite.

Each implementation slice must demonstrate its own success and important failure cases. Test desktop 1440 px, intermediate 768 px, and mobile 390 px; additionally inspect 320 px width and 200% zoom when the layout is implemented. Check keyboard operation, visible focus, semantic headings, announced field errors, reduced motion, and page overflow. Code/table overflow may scroll within its own container.

For mutation tests, verify exact saved/public content and the unchanged prior version on failure. Cover retry after an uncertain response, stale versions across two tabs, unauthorized direct requests, a storage or processor failure, and logout/session expiry. Real hosting acceptance must include restart/redeploy persistence and restore of text plus media. Test files may use clearly labeled synthetic content and technical image fixtures; such fixtures must not become portfolio claims or shipped imagery.

All application checks described here are future work. This planning task validates document links, artifact integrity, ticket dependencies, and the event model. It also restored and rechecked the static public design after files disappeared from the project mirror; no application behavior was implemented or tested.

## Unresolved Decisions and Readiness

All implementation tickets retain **proposed** status when published. None is `ready-for-agent`; publication does not resolve the open decisions. An explicit later instruction is required to begin implementation (G-01) or deployment (G-02).

| ID | Decision / resolver | Current proposal or missing fact | Work affected |
| --- | --- | --- | --- |
| D-01 | Repository and tracker destination / resolved | Aa-thomas/portfolio; GitHub issues. User authorized publication. | Resolved for this publication; G-01 still blocks application work. |
| D-02 | Publishing and photo-card wireframes / design review with Aaron | Create missing screens and states in PF-01. | PF-03 through PF-09 where new UI is needed. PF-02 can follow existing public layouts. |
| D-03 | Host, durable storage, owner login/recovery / Aaron with implementer | No provider selected; SQLite/Better Auth/Node remain candidates. | PF-03 onward for persistence/auth; PF-10 for real hosting proof. |
| D-04 | Media contract / Aaron reviewing PF-01 | Review optional photo, 3:2 crop, types/limits, alt text, replacement and cover behavior. | PF-04, photo parts of PF-05/PF-06/PF-07, PF-08. |
| D-05 | Markdown import contract / Aaron | Review metadata precedence, 1 MiB limit, GFM subset, body-image handling, source editing. | PF-06, PF-07, article parts of PF-08. |
| D-06 | Publishing/editing/ordering contract / Aaron | Review stable published slugs, separate draft revisions, conflict/retry rules, feature limits and ordering. | PF-04 through PF-09 as specified in each ticket. |
| D-07 | Real content and contact details / Aaron | No actual projects, articles, photos, biography, or contact targets supplied. | Public release; not local work with explicitly labeled fixtures. |

Open questions are recorded rather than turned into invented approvals. The numbered proposal can be reviewed without resolving a host or publishing tickets today.

## Out of Scope

- Building or deploying the website during this planning task.
- Publishing to any repository other than Aa-thomas/portfolio.
- AI image generation, fictional content, site scraping, or automatic screenshots of entered URLs.
- Multi-user CMS, public registration, comments, newsletters, payments, scheduled publishing, or analytics dashboards.
- A rich-text editor, arbitrary HTML/MDX execution, a public upload API, or mandatory code syntax coloring.
- Permanent deletion, full version-history browsing, and published-slug redirects in the first proposed release.
- Changing unrelated projects, editing synced `sources/`, or treating candidate dependencies as accepted architecture.

## Further Notes

The [wireframe document](wireframes.md) maps screens to tickets and calls out missing states. [Tickets](tickets.md) reuse the same model, scenario IDs, rules, and decision register. Their acceptance criteria are plans for verification, not claims that any feature has passed.

The design principle is a notebook that is easy to read and update. Handwriting belongs mainly in headings and short labels; long text, validation messages, and controls must remain legible. An attractive thumbnail means thoughtful presentation of a supplied photo and text, not the invention of an asset.
