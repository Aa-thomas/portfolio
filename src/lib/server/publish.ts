import { createHash } from 'node:crypto';
import { db, getEntry, newId, now, type EntryRow } from './db';
import { MediaError, setPublishedMedia } from './media';
import { deriveExcerpt, parseMarkdown, renderBody, suggestSlug } from './markdown';

/**
 * Shared publishing lifecycle (D-06 proposal). Saving is always private.
 * A draft revision is the unit of preview and publish; publishing copies the
 * complete draft into a published snapshot in one transaction. Withdrawal
 * removes the snapshot but keeps the draft. Every mutation checks an expected
 * version (SC-17) and records idempotency for retries (SC-16). A failed
 * operation never replaces the last successful state (SC-24 / INV-03).
 */

export class ConflictError extends Error {
	constructor(
		message: string,
		readonly currentVersion: number
	) {
		super(message);
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		readonly field?: string
	) {
		super(message);
	}
}

export class NotFoundError extends Error {}

export const MAX_FEATURED = 2;
export const LATEST_ARTICLES = 3;

export function validSlug(slug: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 80;
}

export function safeHttpUrl(raw: string): URL | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	// The URL is validated, never fetched (SC-05).
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	return url;
}

type OpResult = Record<string, unknown>;

/**
 * Retry-safe operation wrapper: the first successful application of a request
 * key is recorded; an identical retry replays the recorded result instead of
 * duplicating work, while the same key with different content is rejected
 * rather than misread as the old success (SC-16).
 */
export function withIdempotency(
	requestKey: string | undefined,
	op: string,
	content: unknown,
	fn: () => OpResult
): OpResult {
	if (!requestKey) return fn();
	const contentHash = createHash('sha256')
		.update(JSON.stringify(content))
		.digest('hex');
	const prior = db
		.prepare('SELECT content_hash, result_json FROM ops WHERE request_key = ?')
		.get(requestKey) as { content_hash: string; result_json: string } | undefined;
	if (prior) {
		if (prior.content_hash !== contentHash) {
			throw new ConflictError(
				'This retry carried different content than the request that already succeeded. Reload the entry to see the saved state.',
				0
			);
		}
		return JSON.parse(prior.result_json) as OpResult;
	}
	const result = fn();
	db.prepare(
		'INSERT INTO ops (request_key, op, content_hash, result_json, created_at) VALUES (?, ?, ?, ?, ?)'
	).run(requestKey, op, contentHash, JSON.stringify(result), now());
	return result;
}

function bumpVersion(entryId: string): number {
	db.prepare('UPDATE entries SET draft_version = draft_version + 1, draft_updated_at = ? WHERE id = ?').run(
		now(),
		entryId
	);
	const row = db.prepare('SELECT draft_version FROM entries WHERE id = ?').get(entryId) as {
		draft_version: number;
	};
	return row.draft_version;
}

export function createEntry(kind: 'project' | 'article'): EntryRow {
	const id = newId(kind === 'project' ? 'prj' : 'art');
	db.prepare(
		'INSERT INTO entries (id, kind, created_at, draft_version, draft_updated_at) VALUES (?, ?, ?, 1, ?)'
	).run(id, kind, now(), now());
	return getEntry(id)!;
}

export type SaveProjectInput = {
	entryId: string;
	expectedVersion: number;
	title: string;
	url: string;
	description: string;
	alt: string;
	caseStudy: string;
};

function requireEntry(entryId: string): EntryRow {
	const entry = getEntry(entryId);
	if (!entry || (entry.kind !== 'project' && entry.kind !== 'article')) {
		throw new NotFoundError('That entry does not exist.');
	}
	return entry;
}

function checkVersion(entry: EntryRow, expectedVersion: number) {
	if (entry.draft_version !== expectedVersion) {
		throw new ConflictError(
			`This draft was changed elsewhere (saved version ${entry.draft_version}, you edited version ${expectedVersion}). Your changes are kept in the form; reload to review the newer version.`,
			entry.draft_version
		);
	}
}

/** Saving is always allowed with incomplete text (SC-04); only length caps apply. */
export function saveProjectDraft(
	input: SaveProjectInput,
	photo: { photoId: string | null; crop: string | null }
): { version: number } {
	const entry = requireEntry(input.entryId);
	checkVersion(entry, input.expectedVersion);
	const url = input.url.trim();
	if (url && !safeHttpUrl(url)) {
		throw new ValidationError(
			'The website link must be a full http:// or https:// URL.',
			'url'
		);
	}
	if (input.title.length > 200 || input.description.length > 2000 || input.alt.length > 500) {
		throw new ValidationError('One of the text fields is too long.', 'title');
	}
	db.prepare(
		`UPDATE entries SET
		   d_title = ?, d_url = ?, d_description = ?, d_alt = ?, d_case_study = ?,
		   d_photo_id = ?, d_crop = ?
		 WHERE id = ? AND draft_version = ?`
	).run(
		input.title.trim(),
		url,
		input.description.trim(),
		input.alt.trim(),
		input.caseStudy.trim() || null,
		photo.photoId,
		photo.crop,
		input.entryId,
		input.expectedVersion
	);
	return { version: bumpVersion(input.entryId) };
}

export type SaveArticleInput = {
	entryId: string;
	expectedVersion: number;
	title: string;
	excerpt: string;
	slug: string;
	source: string;
};

export function saveArticleDraft(input: SaveArticleInput): { version: number } {
	const entry = requireEntry(input.entryId);
	checkVersion(entry, input.expectedVersion);
	const slug = input.slug.trim();
	if (slug && !validSlug(slug)) {
		throw new ValidationError(
			'The slug can only use lowercase letters, digits and single hyphens.',
			'slug'
		);
	}
	// A published slug is fixed in the first release (D-06): ignore edits.
	const effectiveSlug = entry.held_slug ?? slug;
	if (Buffer.byteLength(input.source, 'utf8') > 1024 * 1024) {
		throw new ValidationError('The article source exceeds the 1 MiB limit.', 'source');
	}
	db.prepare(
		`UPDATE entries SET d_title = ?, d_excerpt = ?, d_slug = ?, d_source = ?
		 WHERE id = ? AND draft_version = ?`
	).run(
		input.title.trim(),
		input.excerpt.trim(),
		effectiveSlug,
		input.source,
		input.entryId,
		input.expectedVersion
	);
	return { version: bumpVersion(input.entryId) };
}

/** Missing publish-required fields are reported before anything changes (SC-04). */
function validateForPublish(entry: EntryRow): { slug: string; html: string; excerpt: string } {
	const problems: { field: string; message: string }[] = [];
	if (!entry.d_title.trim()) problems.push({ field: 'title', message: 'A title is required.' });
	let slug = entry.d_slug || suggestSlug(entry.d_title);
	if (!validSlug(slug)) {
		problems.push({
			field: 'slug',
			message: 'A valid slug (lowercase letters, digits, hyphens) is required.'
		});
	}
	if (entry.kind === 'project') {
		if (!safeHttpUrl(entry.d_url)) {
			problems.push({
				field: 'url',
				message: 'A full http(s) website link is required to publish.'
			});
		}
		if (!entry.d_description.trim()) {
			problems.push({ field: 'description', message: 'A short description is required.' });
		}
	}
	let html: string | null = null;
	if (entry.kind === 'article') {
		if (!entry.d_source?.trim()) {
			problems.push({ field: 'source', message: 'The Markdown source is required.' });
		} else {
			const rendered = renderBody(entry.d_source);
			if (rendered.imageWarnings.length > 0) {
				problems.push({
					field: 'source',
					message: `Unresolved image references block publishing: ${rendered.imageWarnings
						.map((w) => w.url)
						.join(', ')}`
				});
			}
			html = rendered.html;
		}
	} else if (entry.d_case_study?.trim()) {
		const rendered = renderBody(entry.d_case_study);
		if (rendered.imageWarnings.length > 0) {
			problems.push({
				field: 'caseStudy',
				message: `Unresolved image references in the case study block publishing: ${rendered.imageWarnings
					.map((w) => w.url)
					.join(', ')}`
			});
		}
		html = rendered.html;
	}
	if (problems.length > 0) {
		const err = new ValidationError(problems.map((p) => p.message).join(' ')) as ValidationError & {
			problems: typeof problems;
		};
		err.problems = problems;
		throw err;
	}
	const excerpt =
		entry.d_excerpt?.trim() ||
		(entry.kind === 'article' && entry.d_source ? deriveExcerpt(entry.d_source) : '');
	return { slug, html: html ?? '', excerpt };
}

function slugTaken(entry: EntryRow, slug: string): boolean {
	const row = db
		.prepare(
			`SELECT id FROM entries
			 WHERE kind = ? AND id != ? AND (held_slug = ? OR p_slug = ?) LIMIT 1`
		)
		.get(entry.kind, entry.id, slug, slug);
	return row !== undefined;
}

export function publishEntry(entryId: string, expectedVersion: number): { slug: string } {
	const entry = requireEntry(entryId);
	checkVersion(entry, expectedVersion);
	const { slug: wanted, html, excerpt } = validateForPublish(entry);
	// Published slugs are fixed; once held, the entry keeps its slug (SC-18).
	const slug = entry.held_slug ?? wanted;
	if (slugTaken(entry, slug)) {
		throw new ValidationError(
			`The slug "${slug}" is already used by another published ${entry.kind}. Choose a different slug.`,
			'slug'
		);
	}
	if (entry.d_photo_id && entry.kind === 'project' && !entry.d_crop) {
		throw new ValidationError('The photo framing must be saved before publishing.', 'photo');
	}
	const first = entry.first_published_at ?? now();
	db.exec('BEGIN');
	try {
		db.prepare(
			`UPDATE entries SET
			   pub_version = ?, first_published_at = ?, published_updated_at = ?,
			   p_title = ?, p_slug = ?, p_url = ?, p_description = ?, p_alt = ?,
			   p_photo_id = ?, p_crop = ?, p_case_study_html = ?,
			   p_excerpt = ?, p_source_html = ?, p_cover_id = ?, held_slug = ?
			 WHERE id = ?`
		).run(
			entry.draft_version,
			first,
			now(),
			entry.d_title.trim(),
			slug,
			entry.kind === 'project' ? entry.d_url : '',
			entry.kind === 'project' ? entry.d_description : '',
			entry.d_alt,
			entry.d_photo_id,
			entry.d_crop,
			entry.kind === 'project' ? html || null : null,
			excerpt,
			entry.kind === 'article' ? html : '',
			entry.d_cover_id,
			slug,
			entryId
		);
		const publishedIds = [entry.d_photo_id, entry.d_cover_id].filter(
			(id): id is string => typeof id === 'string'
		);
		if (entry.kind === 'article' && html) {
			for (const match of html.matchAll(/\/media\/([a-z0-9_]+)\//g)) {
				publishedIds.push(match[1]);
			}
		}
		setPublishedMedia(entryId, [...new Set(publishedIds)]);
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
	return { slug };
}

export function withdrawEntry(entryId: string, expectedVersion: number): void {
	const entry = requireEntry(entryId);
	if (entry.pub_version === null) {
		throw new ValidationError('That entry is not published.');
	}
	checkVersion(entry, expectedVersion);
	db.exec('BEGIN');
	try {
		db.prepare(
			`UPDATE entries SET
			   pub_version = NULL, published_updated_at = NULL,
			   p_title = NULL, p_slug = NULL, p_url = NULL, p_description = NULL,
			   p_alt = NULL, p_photo_id = NULL, p_crop = NULL, p_case_study_html = NULL,
			   p_excerpt = NULL, p_source_html = NULL, p_cover_id = NULL
			 WHERE id = ?`
		).run(entryId);
		db.prepare('DELETE FROM published_media WHERE entry_id = ?').run(entryId);
		// Withdrawal clears any feature selection (SC-15/SC-19).
		db.prepare('DELETE FROM featured WHERE project_id = ?').run(entryId);
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

export function featuredVersion(): number {
	const row = db.prepare("SELECT value FROM kv WHERE key = 'featured_version'").get() as
		| { value: string }
		| undefined;
	return row ? Number(row.value) : 0;
}

export function saveFeatured(projectIds: string[], expectedVersion: number): void {
	if (expectedVersion !== featuredVersion()) {
		throw new ConflictError(
			'The featured selection was changed elsewhere. Reload to review the current selection.',
			featuredVersion()
		);
	}
	if (new Set(projectIds).size !== projectIds.length) {
		throw new ValidationError('The same project cannot be featured twice.');
	}
	if (projectIds.length > MAX_FEATURED) {
		throw new ValidationError(`At most ${MAX_FEATURED} projects can be featured.`);
	}
	for (const id of projectIds) {
		const row = db
			.prepare(
				"SELECT 1 FROM entries WHERE id = ? AND kind = 'project' AND pub_version IS NOT NULL"
			)
			.get(id);
		if (!row) {
			throw new ValidationError('Only published projects can be featured.');
		}
	}
	db.exec('BEGIN');
	try {
		db.prepare('DELETE FROM featured').run();
		const insert = db.prepare('INSERT INTO featured (project_id, position) VALUES (?, ?)');
		projectIds.forEach((id, index) => insert.run(id, index));
		db.prepare(
			"INSERT INTO kv (key, value) VALUES ('featured_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
		).run(String(featuredVersion() + 1));
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

export function libraryList(): Array<{
	id: string;
	kind: 'project' | 'article';
	title: string;
	slug: string;
	live: boolean;
	draftChanges: boolean;
	updated: string;
}> {
	const rows = db
		.prepare('SELECT * FROM entries ORDER BY COALESCE(draft_updated_at, created_at) DESC')
		.all() as EntryRow[];
	return rows.map((row) => ({
		id: row.id,
		kind: row.kind,
		title: row.d_title || '(untitled)',
		slug: row.held_slug ?? row.d_slug,
		live: row.pub_version !== null,
		draftChanges: row.pub_version !== null && row.pub_version !== row.draft_version,
		updated: row.draft_updated_at ?? row.created_at
	}));
}

export { MediaError };
