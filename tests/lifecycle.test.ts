import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PORTFOLIO_DATA = mkdtempSync(join(tmpdir(), 'notebook-life-'));

describe('publishing lifecycle (PF-04 through PF-09)', () => {
	let publish: typeof import('../src/lib/server/publish');
	let queries: typeof import('../src/lib/queries');
	let db: typeof import('../src/lib/server/db');

	beforeAll(async () => {
		publish = await import('../src/lib/server/publish');
		queries = await import('../src/lib/queries');
		db = await import('../src/lib/server/db');
	});

	it('SC-04 saves an incomplete project draft privately', () => {
		const entry = publish.createEntry('project');
		const { version } = publish.saveProjectDraft(
			{
				entryId: entry.id,
				expectedVersion: 1,
				title: 'Half done',
				url: '',
				description: '',
				alt: '',
				caseStudy: ''
			},
			{ photoId: null, crop: null }
		);
		expect(version).toBe(2);
		expect(queries.listPublishedProjects()).toHaveLength(0);
		expect(() => publish.publishEntry(entry.id, 2)).toThrow(/website link is required/);
	});

	it('SC-05 rejects an unsafe project URL before publishing', () => {
		const entry = publish.createEntry('project');
		expect(() =>
			publish.saveProjectDraft(
				{
					entryId: entry.id,
					expectedVersion: 1,
					title: 'Bad url',
					url: 'javascript:alert(1)',
					description: 'd',
					alt: '',
					caseStudy: ''
				},
				{ photoId: null, crop: null }
			)
		).toThrow(/http/);
	});

	it('SC-06 publishes a complete project; SC-18 rejects duplicate slugs', () => {
		const a = publish.createEntry('project');
		publish.saveProjectDraft(
			{
				entryId: a.id,
				expectedVersion: 1,
				title: 'First Project',
				url: 'https://example.com',
				description: 'A real one',
				alt: '',
				caseStudy: ''
			},
			{ photoId: null, crop: null }
		);
		const { slug } = publish.publishEntry(a.id, 2);
		expect(slug).toBe('first-project');
		expect(queries.publishedProject('first-project')?.title).toBe('First Project');
		expect(queries.publishedProject('missing')).toBeNull();

		const b = publish.createEntry('project');
		publish.saveProjectDraft(
			{
				entryId: b.id,
				expectedVersion: 1,
				title: 'First Project',
				url: 'https://two.example',
				description: 'Another',
				alt: '',
				caseStudy: ''
			},
			{ photoId: null, crop: null }
		);
		expect(() => publish.publishEntry(b.id, 2)).toThrow(/slug "first-project"/);
		// The rejected publish left the public state unchanged (INV-03).
		expect(queries.listPublishedProjects()).toHaveLength(1);
	});

	it('SC-17 two tabs cannot silently overwrite each other', () => {
		const entry = publish.createEntry('project');
		publish.saveProjectDraft(
			{
				entryId: entry.id,
				expectedVersion: 1,
				title: 'Base',
				url: 'https://example.com',
				description: 'd',
				alt: '',
				caseStudy: ''
			},
			{ photoId: null, crop: null }
		);
		expect(() =>
			publish.saveProjectDraft(
				{
					entryId: entry.id,
					expectedVersion: 1,
					title: 'Stale tab',
					url: '',
					description: '',
					alt: '',
					caseStudy: ''
				},
				{ photoId: null, crop: null }
			)
		).toThrow(/changed elsewhere/);
		const saved = db.getEntry(entry.id)!;
		expect(saved.d_title).toBe('Base');
	});

	it('SC-13/SC-14 editing a live entry keeps the old snapshot until republish', () => {
		const entry = publish.createEntry('article');
		publish.saveArticleDraft({
			entryId: entry.id,
			expectedVersion: 1,
			title: 'Live One',
			excerpt: 'e',
			slug: 'live-one',
			source: '# Live One\n\nPublished body.'
		});
		publish.publishEntry(entry.id, 2);
		const firstDate = db.getEntry(entry.id)!.first_published_at;

		// Save a draft change: the public page must still show the old body.
		publish.saveArticleDraft({
			entryId: entry.id,
			expectedVersion: 2,
			title: 'Live One (edited)',
			excerpt: 'e2',
			slug: 'live-one',
			source: '# Live One (edited)\n\nDraft body.'
		});
		expect(queries.publishedArticle('live-one')?.title).toBe('Live One');
		const library = publish.libraryList().find((row) => row.id === entry.id);
		expect(library?.draftChanges).toBe(true);

		publish.publishEntry(entry.id, 3);
		const detail = queries.publishedArticle('live-one');
		expect(detail?.title).toBe('Live One (edited)');
		// First-publication time survives republish (INV-05).
		expect(db.getEntry(entry.id)!.first_published_at).toBe(firstDate);
	});

	it('SC-15 withdraw removes public content but keeps the draft and slug identity', () => {
		const entry = publish.createEntry('article');
		publish.saveArticleDraft({
			entryId: entry.id,
			expectedVersion: 1,
			title: 'Temporary',
			excerpt: '',
			slug: 'temporary-note',
			source: 'Body only.'
		});
		publish.publishEntry(entry.id, 2);
		expect(queries.publishedArticle('temporary-note')).not.toBeNull();
		publish.withdrawEntry(entry.id, db.getEntry(entry.id)!.draft_version);
		expect(queries.publishedArticle('temporary-note')).toBeNull();
		const saved = db.getEntry(entry.id)!;
		expect(saved.d_source).toBe('Body only.');
		expect(saved.held_slug).toBe('temporary-note');

		// Another article cannot steal the withdrawn slug (SC-18).
		const other = publish.createEntry('article');
		publish.saveArticleDraft({
			entryId: other.id,
			expectedVersion: 1,
			title: 'Temporary',
			excerpt: '',
			slug: 'temporary-note',
			source: 'Other body.'
		});
		expect(() => publish.publishEntry(other.id, 2)).toThrow(/temporary-note/);
	});

	it('SC-16 a repeated request replays the recorded result, different content is rejected', () => {
		const entry = publish.createEntry('article');
		const values = {
			entryId: entry.id,
			expectedVersion: 1,
			title: 'Idempotent',
			excerpt: '',
			slug: 'idem',
			source: 'Once.'
		};
		let calls = 0;
		const run = () =>
			publish.withIdempotency('req-1', 'article.save', values, () => {
				calls += 1;
				return publish.saveArticleDraft(values) as unknown as Record<string, unknown>;
			});
		const first = run();
		const second = run();
		expect(calls).toBe(1);
		expect(second).toEqual(first);

		expect(() =>
			publish.withIdempotency('req-1', 'article.save', { ...values, title: 'Different' }, () => {
				throw new Error('should not run');
			})
		).toThrow(/different content/);
	});

	it('SC-12 article publish is blocked by unresolved image references', () => {
		const entry = publish.createEntry('article');
		publish.saveArticleDraft({
			entryId: entry.id,
			expectedVersion: 1,
			title: 'With image',
			excerpt: '',
			slug: 'with-image',
			source: '![remote](https://example.com/pic.png)\n\nText.'
		});
		expect(() => publish.publishEntry(entry.id, 2)).toThrow(/Unresolved image/);
		expect(queries.publishedArticle('with-image')).toBeNull();
	});

	it('SC-19/SC-20 featured selection, ordering, limits, and withdrawal', () => {
		const ids: string[] = [];
		let offset = 30; // Gamma oldest-future, Beta +20, Alpha +30
		for (const title of ['Alpha', 'Beta', 'Gamma']) {
			const entry = publish.createEntry('project');
			publish.saveProjectDraft(
				{
					entryId: entry.id,
					expectedVersion: 1,
					title,
					url: `https://${title.toLowerCase()}.example`,
					description: 'd',
					alt: '',
					caseStudy: ''
				},
				{ photoId: null, crop: null }
			);
			publish.publishEntry(entry.id, 2);
			ids.push(entry.id);
			// Distinct future-dated publication moments keep the newest-first
			// assertion independent of entries published by earlier tests and
			// of the id tie-break.
			const stamp = new Date(Date.now() + offset * 1000).toISOString();
			db.db
				.prepare('UPDATE entries SET first_published_at = ? WHERE id = ?')
				.run(stamp, entry.id);
			offset += 10;
		}
		publish.saveFeatured([ids[2], ids[0]], publish.featuredVersion());
		expect(queries.homeProjects().map((p) => p.title)).toEqual(['Gamma', 'Alpha']);

		expect(() => publish.saveFeatured([ids[0], ids[1], ids[2]], publish.featuredVersion())).toThrow(
			/most 2/
		);
		// A stale selection save conflicts.
		expect(() => publish.saveFeatured([ids[0]], publish.featuredVersion() - 1)).toThrow(
			/changed elsewhere/
		);

		// Withdrawing a featured project removes it from Home (SC-15/SC-19).
		publish.withdrawEntry(ids[2], db.getEntry(ids[2])!.draft_version);
		expect(queries.homeProjects().map((p) => p.title)).toEqual(['Alpha']);

		// No selection at all: newest-first fallback (SC-20).
		publish.saveFeatured([], publish.featuredVersion());
		const fallback = queries.homeProjects().map((p) => p.title);
		expect(fallback[0]).toBe('Beta');
		expect(fallback).toHaveLength(2);

		// Drafts can never be featured.
		const draft = publish.createEntry('project');
		expect(() => publish.saveFeatured([draft.id], publish.featuredVersion())).toThrow(
			/Only published/
		);
	});

	it('SC-22 drafts expose nothing through public queries', () => {
		const entry = publish.createEntry('article');
		publish.saveArticleDraft({
			entryId: entry.id,
			expectedVersion: 1,
			title: 'Secret Draft',
			excerpt: '',
			slug: 'secret-draft',
			source: 'Hidden.'
		});
		expect(queries.listPublishedArticles().map((a) => a.title)).not.toContain('Secret Draft');
		expect(queries.publishedArticle('secret-draft')).toBeNull();
	});

	it('SC-23 data survives a fresh connection to the same data directory', async () => {
		// Opening the file again models a restarted process reading durable storage.
		const { DatabaseSync } = await import('node:sqlite');
		const reopened = new DatabaseSync(join(process.env.PORTFOLIO_DATA!, 'notebook.sqlite'));
		const row = reopened
			.prepare("SELECT d_title FROM entries WHERE d_title = 'Secret Draft'")
			.get() as { d_title: string };
		expect(row.d_title).toBe('Secret Draft');
		reopened.close();
	});
});
