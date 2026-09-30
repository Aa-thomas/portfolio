# Proposed P1 behavior. This is not implemented and does not mandate event sourcing.
# Rejections, retries, and concurrency cases: scenarios.md. Decisions: spec.md.
model "Portfolio publishing - proposed P1"
persona Owner
persona Visitor
context Access
context Content

type Crop { x: Number, y: Number, aspectRatio: String }
type ProjectFields { title: String, slug: String, websiteUrl: String, description: String, caseStudyMarkdown: String, photoRef: OptionalAssetId, altText: String, crop: OptionalCrop }
type ArticleFields { title: String, slug: String, excerpt: String, sourceMarkdown: String, coverRef: OptionalAssetId, altText: String }
type PublishedEntry { entryId: UUID, kind: ProjectOrArticle, slug: String, publishedVersion: Integer, title: String, description: String, html: SanitizedHTML, photoRef: AssetId, firstPublishedAt: Instant }

slice "Open owner session" {
  ui Owner sign in @Owner
  command Sign in note "scenarios.md" issue "D-03: choose owner sign-in and recovery" { credential: Secret }
  event Owner session opened @Access { ownerId: UUID assigned, sessionId: OpaqueId assigned, expiresAt: Instant assigned }
}
slice "Read owner access" {
  view Owner access from "Owner session opened" { ownerId: UUID, sessionId: OpaqueId, expiresAt: Instant, allowed: Boolean derived }
  ui Private library access @Owner
}
slice "Save project draft" {
  ui Project editor @Owner
  command Save project note "scenarios.md" issue "D-04: confirm photo policy and limits" { entryId: UUID, expectedVersion: Integer, requestId: UUID, fields: ProjectFields, photoUpload: UploadedBytes }
  event Project draft saved @Content { entryId: UUID, fields: ProjectFields, draftVersion: Integer assigned, thumbnailRef: OptionalAssetId assigned, ownerId: UUID assigned }
}
slice "Preview project" {
  view Project draft from "Project draft saved" note "scenarios.md" { entryId: UUID, fields: ProjectFields, draftVersion: Integer, thumbnailRef: OptionalAssetId, ownerId: UUID }
  ui Private project preview @Owner
}
slice "Import article draft" {
  ui Markdown upload @Owner
  command Import Markdown note "scenarios.md" issue "D-05: confirm metadata and body-image rules" { entryId: UUID, expectedVersion: Integer, requestId: UUID, markdownFile: UploadedBytes }
  event Article draft imported @Content { entryId: UUID, fields: ArticleFields assigned, draftVersion: Integer assigned, warnings: StringList assigned, ownerId: UUID assigned }
}
slice "Preview article" {
  view Article draft from "Article draft imported" note "scenarios.md" { entryId: UUID, fields: ArticleFields, draftVersion: Integer, warnings: StringList, ownerId: UUID, previewHtml: SanitizedHTML derived }
  ui Private article preview @Owner
}
slice "Publish entry" {
  ui Publish reviewed draft @Owner
  command Publish entry note "scenarios.md" issue "D-06: confirm lifecycle and stable slug rules" { entryId: UUID, expectedVersion: Integer, requestId: UUID, slug: String }
  event Entry published @Content { entryId: UUID, slug: String, snapshot: PublishedEntry assigned }
}
slice "Read public entries" {
  view Public entries from "Entry published" note "scenarios.md" { entries: PublishedEntryList derived, visible: Boolean derived }
  ui Home indexes and detail @Visitor
}
slice "Save revised draft" {
  ui Edit saved entry @Owner
  command Save revision note "scenarios.md" { entryId: UUID, expectedVersion: Integer, requestId: UUID, fields: ProjectFieldsOrArticleFields, mediaUpload: UploadedBytes }
  event Draft revision saved @Content { entryId: UUID, fields: ProjectFieldsOrArticleFields, draftVersion: Integer assigned, publishedVersion: OptionalInteger assigned, ownerId: UUID assigned }
}
slice "Read revised draft" {
  view Working revision from "Draft revision saved" note "scenarios.md" { entryId: UUID, fields: ProjectFieldsOrArticleFields, draftVersion: Integer, publishedVersion: OptionalInteger, ownerId: UUID }
  ui Saved changes preview @Owner
}
slice "Republish entry" {
  ui Publish saved changes @Owner
  command Republish entry note "scenarios.md" { entryId: UUID, expectedVersion: Integer, requestId: UUID }
  event Entry republished @Content { entryId: UUID, snapshot: PublishedEntry assigned }
}
slice "Read updated public entries" {
  view Public entries again from "Entry republished" { entries: PublishedEntryList derived, visible: Boolean derived }
  ui Updated public reading @Visitor
}
slice "Withdraw entry" {
  ui Published entry actions @Owner
  command Unpublish entry note "scenarios.md" { entryId: UUID, expectedVersion: Integer, requestId: UUID }
  event Entry unpublished @Content { entryId: UUID, retainedDraftVersion: Integer assigned, featuredSelectionRemoved: Boolean assigned }
}
slice "Read after withdrawal" {
  view Public entries again from "Entry unpublished" { entries: PublishedEntryList derived, visible: Boolean derived }
  ui Updated lists and not found @Visitor
}
slice "Choose featured projects" {
  ui Featured project controls @Owner
  command Set featured projects note "scenarios.md" issue "D-06: confirm limit order and fallback" { orderedProjectIds: UUIDList, expectedVersion: Integer, requestId: UUID }
  event Featured selection saved @Content { orderedProjectIds: UUIDList, selectionVersion: Integer assigned }
}
slice "Read selected home" {
  view Featured selection from "Featured selection saved", "Entry unpublished" note "scenarios.md" { orderedProjectIds: UUIDList, selectionVersion: Integer, visibleProjectIds: UUIDList derived }
  ui Selected projects on Home @Visitor
}
slice "Close owner session" {
  ui Sign out action @Owner
  command Sign out note "scenarios.md" { sessionId: OpaqueId }
  event Owner session closed @Access { sessionId: OpaqueId, closedAt: Instant assigned }
}
slice "Read revoked access" {
  view Owner access again from "Owner session closed" { sessionId: OpaqueId, allowed: Boolean derived }
  ui Sign in required @Owner
}
