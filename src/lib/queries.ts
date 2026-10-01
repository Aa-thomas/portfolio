import { db, getEntryByPublicSlug, type EntryRow } from './server/db';
import { MAX_FEATURED, LATEST_ARTICLES } from './server/publish';

/**
 * Public read boundary (INV-02). These queries return published snapshot
 * fields only — never draft fields, owner data, or private photo ids. All
 * lists sort by first publication date descending with a stable id tie-break
 * (D-06).
 */

export type PublicProjectCard = {
	id: string;
	slug: string;
	title: string;
	description: string;
	photoUrl: string | null;
	photoAlt: string;
	firstPublishedAt: string;
};

export type PublicArticleCard = {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	coverUrl: string | null;
	firstPublishedAt: string;
};

function cardFrom(row: EntryRow): PublicProjectCard {
	return {
		id: row.id,
		slug: row.p_slug ?? '',
		title: row.p_title ?? '',
		description: row.p_description ?? '',
		photoUrl: row.p_photo_id ? `/media/${row.p_photo_id}/card` : null,
		photoAlt: row.p_alt ?? '',
		firstPublishedAt: row.first_published_at ?? ''
	};
}

function articleCardFrom(row: EntryRow): PublicArticleCard {
	return {
		id: row.id,
		slug: row.p_slug ?? '',
		title: row.p_title ?? '',
		excerpt: row.p_excerpt ?? '',
		coverUrl: row.p_cover_id ? `/media/${row.p_cover_id}/card` : null,
		firstPublishedAt: row.first_published_at ?? ''
	};
}

const PUBLISHED_ORDER =
	"ORDER BY first_published_at DESC, id ASC";

export function listPublishedProjects(): PublicProjectCard[] {
	const rows = db
		.prepare(
			`SELECT * FROM entries WHERE kind = 'project' AND pub_version IS NOT NULL ${PUBLISHED_ORDER}`
		)
		.all() as EntryRow[];
	return rows.map(cardFrom);
}

export function listPublishedArticles(): PublicArticleCard[] {
	const rows = db
		.prepare(
			`SELECT * FROM entries WHERE kind = 'article' AND pub_version IS NOT NULL ${PUBLISHED_ORDER}`
		)
		.all() as EntryRow[];
	return rows.map(articleCardFrom);
}

/** Featured selection first; otherwise the newest projects (D-06 fallback). */
export function homeProjects(): PublicProjectCard[] {
	const featured = db
		.prepare(
			`SELECT e.* FROM featured f JOIN entries e ON e.id = f.project_id
			 WHERE e.pub_version IS NOT NULL ORDER BY f.position`
		)
		.all() as EntryRow[];
	if (featured.length > 0) return featured.map(cardFrom);
	return listPublishedProjects().slice(0, MAX_FEATURED);
}

export function latestArticles(): PublicArticleCard[] {
	return listPublishedArticles().slice(0, LATEST_ARTICLES);
}

export type PublicProjectDetail = PublicProjectCard & {
	url: string;
	caseStudyHtml: string | null;
};

export function publishedProject(slug: string): PublicProjectDetail | null {
	const row = getEntryByPublicSlug('project', slug);
	if (!row) return null;
	return {
		...cardFrom(row),
		url: row.p_url ?? '',
		caseStudyHtml: row.p_case_study_html ?? null
	};
}

export type PublicArticleDetail = {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	html: string;
	coverUrl: string | null;
	firstPublishedAt: string;
};

export function publishedArticle(slug: string): PublicArticleDetail | null {
	const row = getEntryByPublicSlug('article', slug);
	if (!row) return null;
	return {
		id: row.id,
		slug: row.p_slug ?? '',
		title: row.p_title ?? '',
		excerpt: row.p_excerpt ?? '',
		html: row.p_source_html ?? '',
		coverUrl: row.p_cover_id ? `/media/${row.p_cover_id}/card` : null,
		firstPublishedAt: row.first_published_at ?? ''
	};
}
