import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, getEntry } from '$lib/server/db';
import { storePhoto } from '$lib/server/media';
import {
	ConflictError,
	createEntry,
	saveArticleDraft,
	ValidationError,
	withIdempotency
} from '$lib/server/publish';
import {
	decodeMarkdown,
	filenameTitle,
	parseMarkdown,
	renderBody,
	suggestSlug
} from '$lib/server/markdown';
import { actionFail } from '$lib/server/form';
import { isRedirect, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.owner) error(401, 'Sign in required.');
	const entry = getEntry(params.id);
	if (!entry || entry.kind !== 'article') error(404, 'No such article.');
	const rendered = entry.d_source ? renderBody(entry.d_source) : null;
	return {
		entry,
		version: entry.draft_version,
		coverUrl: entry.d_cover_id ? `/media/${entry.d_cover_id}/card` : null,
		imageWarnings: rendered?.imageWarnings ?? [],
		frontmatterKeys: entry.d_source
			? (() => {
					try {
						return parseMarkdown(entry.d_source).frontmatterKeys;
					} catch {
						return [];
					}
				})()
			: []
	};
};

export const actions: Actions = {
	import: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return actionFail(new ValidationError('Choose a .md file to import.', 'importFile'));
		}
		const bytes = Buffer.from(await file.arrayBuffer());
		try {
			const entry = getEntry(params.id);
			if (!entry || entry.kind !== 'article') throw new ValidationError('No such article.');
			// Decode + parse first; a failed import never touches the saved draft (SC-09).
			const source = decodeMarkdown(bytes, file.name || 'file.md');
			const parsed = parseMarkdown(source, file.name);
			const title = parsed.frontmatter.title ?? parsed.derivedTitle ?? filenameTitle(file.name);
			// A published slug is fixed; keep it.
			const slug = entry.held_slug ?? parsed.frontmatter.slug ?? suggestSlug(title);
			const excerpt = parsed.frontmatter.excerpt ?? parsed.firstParagraph ?? '';
			db.prepare(
				`UPDATE entries SET d_title = ?, d_excerpt = ?, d_slug = ?, d_source = ?,
				   draft_version = draft_version + 1, draft_updated_at = ? WHERE id = ?`
			).run(title, excerpt, slug, source, new Date().toISOString(), entry.id);
			return {
				imported: true,
				version: (getEntry(entry.id) as { draft_version: number }).draft_version,
				usedH1: parsed.usedH1,
				ignoredKeys: parsed.frontmatterKeys.filter((k) => !['title', 'excerpt', 'slug'].includes(k))
			};
		} catch (err) {
			return actionFail(err);
		}
	},
	save: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const form = await request.formData();
		const values = {
			title: String(form.get('title') ?? ''),
			excerpt: String(form.get('excerpt') ?? ''),
			slug: String(form.get('slug') ?? ''),
			source: String(form.get('source') ?? '')
		};
		try {
			const result = withIdempotency(String(form.get('requestId') ?? ''), 'article.save', values, () => {
				return saveArticleDraft({
					entryId: params.id,
					expectedVersion: Number(form.get('expectedVersion')),
					...values
				}) as unknown as Record<string, unknown>;
			});
			return { saved: true, version: result.version as number };
		} catch (err) {
			if (isRedirect(err)) throw err;
			return actionFail(err, { values });
		}
	},
	cover: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const form = await request.formData();
		const file = form.get('cover');
		try {
			const entry = getEntry(params.id);
			if (!entry || entry.kind !== 'article') throw new ValidationError('No such article.');
			if (form.get('removeCover') === '1') {
				db.prepare('UPDATE entries SET d_cover_id = NULL WHERE id = ?').run(entry.id);
				return { coverRemoved: true };
			}
			if (!(file instanceof File) || file.size === 0) {
				throw new ValidationError('Choose an image for the cover.', 'cover');
			}
			const bytes = Buffer.from(await file.arrayBuffer());
			const stored = await storePhoto(entry.id, 'cover', bytes);
			db.prepare('UPDATE entries SET d_cover_id = ? WHERE id = ?').run(stored.id, entry.id);
			return { coverSet: true, coverId: stored.id };
		} catch (err) {
			return actionFail(err);
		}
	},
	image: async ({ request, params, locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const form = await request.formData();
		const file = form.get('image');
		const alt = String(form.get('alt') ?? '').trim();
		try {
			const entry = getEntry(params.id);
			if (!entry || entry.kind !== 'article') throw new ValidationError('No such article.');
			if (!(file instanceof File) || file.size === 0) {
				throw new ValidationError('Choose an image to upload.', 'image');
			}
			const bytes = Buffer.from(await file.arrayBuffer());
			const stored = await storePhoto(entry.id, 'image', bytes);
			return { imageRef: `/media/${stored.id}/full`, imageAlt: alt };
		} catch (err) {
			return actionFail(err);
		}
	},
	newArticle: async ({ locals }) => {
		if (!locals.owner) return actionFail(new ConflictError('Sign in first.', 0));
		const entry = createEntry('article');
		redirect(303, `/studio/articles/${entry.id}`);
	}
};
