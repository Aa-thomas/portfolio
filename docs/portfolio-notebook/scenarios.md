# Publishing behavior scenarios

Revision P2. All cases describe **proposed future behavior**, not passing application tests. The feature direction is agreed; detailed policies remain subject to [D-02 through D-06](spec.md#unresolved-decisions-and-readiness). Reuse these IDs in tickets and later tests. The [model](publishing.em) shows the successful state changes; the scenarios also cover rejected operations and retries, which do not imply saved domain events.

## Rule ownership

| Rule | Owner | Meaning |
| --- | --- | --- |
| INV-01 | Owner access | Every private read, preview, asset access, and mutation requires the owner session. |
| INV-02 | Publication | Public readers see only the explicitly published snapshot and permitted media. |
| INV-03 | Content saving | A failed or stale operation does not replace the last successful save. |
| INV-04 | Import and media | Files are treated as untrusted data; content and media are not invented or executed. |
| INV-05 | Publication identity | Stable entry identity, unique kind-scoped slug, and deliberate publication survive retries. |
| INV-06 | Reading presentation | Notebook styling remains readable, navigable, and usable across screen sizes. |
| INV-07 | Durability | Confirmed saved text and media survive the chosen host lifecycle and can be restored together. |

Each invariant is a proposed implementation contract. None implies a chosen database, provider, or event-sourcing architecture.

<a id="sc-01"></a>
## SC-01: Owner sign-in and sign-out

**Given** a provisioned owner and the chosen authentication method, **when** the owner signs in, **then** the private library is available. **When** the owner signs out, **then** the prior session no longer authorizes library reads or writes, including a form left open in another tab. Invalid credentials show a useful generic error and do not reveal another account. Owner: INV-01. Decision: D-03. Ticket: PF-03.

<a id="sc-02"></a>
## SC-02: Private boundaries reject a visitor

**Given** a signed-out visitor or expired session, **when** they request private library data, a draft preview, a draft photo URL, or any mutation directly, **then** no private data is returned and no content changes. Cross-origin mutation attempts cannot use an otherwise valid cookie to bypass the operation's protection. A UI redirect alone is insufficient. Owner: INV-01/02. Ticket: PF-03, extended by each content ticket.

<a id="sc-03"></a>
## SC-03: Save a project with a real photo

**Given** the owner has entered title, HTTP(S) website URL, description, and a supported photo with framing/alt text, **when** they save, **then** one private project draft and the validated photo/derivatives are durably associated. **When** they reopen it, **then** the fields and card preview match the saved values and crop. Public lists remain unchanged. Owner: INV-01/02/03/04. Decisions: D-04/06. Ticket: PF-04.

<a id="sc-04"></a>
## SC-04: No photo and incomplete drafts

**Given** the proposed optional-photo policy, **when** the owner saves without a photo or with incomplete publish-required text, **then** the draft remains editable and the preview uses the real text-only treatment. Missing required publish fields are identified before publishing. No screenshot, logo, filler claim, or image is synthesized. Owner: INV-02/04/06. Decisions: D-04/06. Ticket: PF-04.

<a id="sc-05"></a>
## SC-05: Invalid upload or unsafe project URL

**Given** a saved draft, **when** a new upload is corrupt, exceeds the agreed byte/pixel limits, or has unsupported decoded content, **then** the UI reports the problem and the prior saved photo remains. An invalid or non-HTTP(S) project URL cannot be published. The server does not fetch the URL. **When** image processing or storage fails, **then** entered form text remains available for retry and no partial replacement is reported as saved. Owner: INV-03/04. Decision: D-04. Ticket: PF-04.

<a id="sc-06"></a>
## SC-06: Publish a project

**Given** a complete saved project revision, **when** the owner previews that revision and publishes it, **then** its public detail page and project index show the same title, description, real thumbnail, and working supplied website link. Home uses the agreed selection/fallback rule. The site does not require a code change or manual rebuild. No empty case-study headings are shown when only the quick-add fields exist. Owner: INV-02/05/06. Decision: D-06. Ticket: PF-05.

<a id="sc-07"></a>
## SC-07: Import Markdown and derive the title

**Given** a valid UTF-8 `.md` file, **when** the owner imports it, **then** an article draft retains the source and suggests title from valid metadata, otherwise the first H1, otherwise the filename. **When** the first H1 provides the title, **then** the visible article title is not repeated as a second body heading. Owner changes to metadata are reflected in preview and survive save/reopen. Owner: INV-03/04. Decision: D-05. Ticket: PF-06.

<a id="sc-08"></a>
## SC-08: Preview supported Markdown

**Given** a draft containing supported headings, links, emphasis, lists, quotes, fenced code, GFM tables, and task lists, **when** previewed, **then** each structure remains readable and code is literal text. Long code and wide tables scroll within their containers on narrow screens. Task lists do not become interactive saved controls. An optional cover uses the same media rules as project photos. Owner: INV-04/06. Decisions: D-04/05. Ticket: PF-06.

<a id="sc-09"></a>
## SC-09: Reject malformed import without replacing work

**Given** an existing saved article, **when** an imported file exceeds the proposed size limit, is not valid UTF-8, or has invalid metadata syntax, **then** the prior source and metadata remain saved and the owner sees an actionable problem. A failed import does not publish an entry or silently overwrite an existing slug. Owner: INV-03/04/05. Decision: D-05. Ticket: PF-06.

<a id="sc-10"></a>
## SC-10: Markdown is data, never executable code

**Given** Markdown containing script tags, event handlers, unsafe URL schemes, raw embeds, or Svelte/MDX-like expressions, **when** previewed or published, **then** it cannot execute code or inject unsafe HTML. Frontmatter cannot set owner identity, publication state, or server timestamps. The same sanitization policy protects private preview and public reading. Owner: INV-01/02/04. Ticket: PF-06 and PF-07.

<a id="sc-11"></a>
## SC-11: Resolve article image references deliberately

**Given** the proposed first-release image policy and Markdown with missing local paths or remote image references, **when** the owner previews it, **then** each unresolved image is identified without a server fetch or invented replacement. Publishing remains blocked until references are mapped to owned uploads or removed. Final mapping UI or a narrower first-release policy must be agreed under D-05 before implementation. Owner: INV-02/04. Decision: D-05. Ticket: PF-06.

<a id="sc-12"></a>
## SC-12: Publish an article

**Given** a complete, previewed article with no blocking import errors, **when** the owner publishes, **then** its public article page, writing index, and latest-writing section show the selected published revision. Title, excerpt, cover, body, and first-publication date agree across the relevant views; source files and private metadata are not exposed. Owner: INV-02/05/06. Decisions: D-05/06. Ticket: PF-07.

<a id="sc-13"></a>
## SC-13: Save edits without changing a live entry

**Given** a published entry, **when** the owner changes text, replaces Markdown, or changes a photo and saves, **then** the private draft updates but a signed-out visitor still sees the old published snapshot. Old live media stays usable while the draft replacement remains private. The owner can distinguish saved draft changes from live content. Owner: INV-02/03. Decision: D-06. Ticket: PF-08.

<a id="sc-14"></a>
## SC-14: Republish a complete revision

**Given** a live entry and complete changed draft, **when** the owner republishes the expected draft version, **then** subsequent public reads show that complete version under the same slug and entry identity, retaining the first-publication date. A validation, media, or storage failure leaves the prior public snapshot intact. Owner: INV-02/03/05. Decision: D-06. Ticket: PF-08.

<a id="sc-15"></a>
## SC-15: Unpublish without deleting the draft

**Given** a live project or article, **when** the owner unpublishes it, **then** it leaves Home and relevant indexes, its public detail responds not-found, and its saved source remains available privately. Its unpublished assets are not served anonymously by the origin. A featured project loses its selection. A failure does not falsely announce withdrawal. Hosting-specific caches must be checked before release. Owner: INV-01/02/03. Decision: D-06. Ticket: PF-08; hosting check PF-10.

<a id="sc-16"></a>
## SC-16: Retry after an uncertain response

**Given** a save or publish reached the server but its response was lost, **when** the owner retries the same request, **then** there is one entry/revision outcome, no duplicate published item, and no reset first-publication date. Reusing a request identity with different content is rejected or explicitly reconciled, never treated as the old success. Owner: INV-03/05. Decision: D-06. Tickets: PF-04 through PF-08 for their respective operations.

<a id="sc-17"></a>
## SC-17: Two tabs cannot silently overwrite each other

**Given** two tabs opened the same draft version, **when** one saves and the other later saves or publishes its stale version, **then** the second action reports a conflict, retains unsaved text for review, and does not overwrite the newer saved or published revision. The owner can reload/review deliberately. Owner: INV-03/05. Decision: D-06. Tickets: PF-04/PF-06/PF-08.

<a id="sc-18"></a>
## SC-18: Unique and stable public URLs

**Given** an existing project or article slug, **when** another entry of the same kind attempts to publish with it, **then** publication is rejected with a field-level explanation and does not change the existing entry. Under the proposed first-release rule, the slug of an already published entry cannot be edited; unpublishing does not release its identity. Owner: INV-03/05. Decision: D-06. Tickets: PF-05/PF-07/PF-08.

<a id="sc-19"></a>
## SC-19: Choose and order featured projects

**Given** published projects, **when** the owner selects up to the agreed limit and reorders them, **then** Home shows that exact order. The control also works by keyboard without dragging. An unpublished project cannot be newly featured; a concurrent unpublish causes the selection to refresh/reject safely. Owner: INV-01/02/06. Decisions: D-02/06. Ticket: PF-09.

<a id="sc-20"></a>
## SC-20: Empty and small public collections

**Given** zero, one, or several published entries, **when** a visitor opens Home or either index, **then** the page has a deliberate empty/small-list state, no broken cards, and no pretend portfolio entries. When no featured selection exists, Home follows the agreed newest-project fallback; latest writing uses the agreed limit and stable order. Owner: INV-02/06. Decision: D-06. Tickets: PF-02/PF-05/PF-07/PF-09.

<a id="sc-21"></a>
## SC-21: Responsive, accessible reading and editing

**Given** the implemented screens at 1440, 768, 390, and 320 px plus 200% zoom, **when** browsing with pointer, keyboard, or reduced motion, **then** headings, focus, navigation, form labels, errors, and actions remain usable without page-wide horizontal overflow. Images keep their intended aspect ratio; body copy does not become hard-to-read handwriting. A broken photo request has a stable, truthful fallback. Owner: INV-06. Tickets: every UI ticket; final review PF-10.

<a id="sc-22"></a>
## SC-22: Public identity and page metadata stay truthful

**Given** supplied profile/contact values and published entries, **when** a visitor navigates the site or reads page metadata, **then** names, links, title, and description match those values. Missing email/profile links are absent or honestly pending in a local preview, never invented clickable targets. Draft detail URLs return not-found and private pages are not indexable. Owner: INV-02/04/06. Decision: D-07 for release content. Tickets: PF-02/PF-05/PF-07/PF-10.

<a id="sc-23"></a>
## SC-23: Save, restart, and restore text with photos

**Given** saved drafts, live revisions, feature choices, and their actual media, **when** the chosen host restarts/redeploys, **then** all saved associations remain readable with correct access boundaries. **When** an isolated restore is performed from backup, **then** both text and media load and no missing-media success is claimed. Owner: INV-07. Decision: D-03 and deployment gate G-02. Ticket: PF-10.

<a id="sc-24"></a>
## SC-24: No success banner before durable success

**Given** a storage error during a save, publish, unpublish, or feature update, **when** the operation finishes, **then** the owner sees a failure/retry path rather than success, and previously confirmed draft/public state remains authoritative. Retrying after recovery follows SC-16. Owner: INV-03/05/07. Tickets: every mutation ticket; host failure demonstration PF-10.

## Open questions

- [ ] D-02: review missing private screens, photo-card variants, and error/conflict states.
- [ ] D-03: select host, storage, owner sign-in, provisioning, and recovery.
- [ ] D-04: confirm the photo/crop/limit contract.
- [ ] D-05: confirm Markdown metadata, source editing, and body-image behavior.
- [ ] D-06: confirm lifecycle, slug, retry/conflict, and feature-ordering policies.

Completing the scenarios as documents does not settle these choices. G-01 still prohibits application implementation until explicitly authorized.
