import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import parseYaml from 'yaml';

/**
 * The single Markdown pipeline shared by private preview and public reading
 * (D-05 proposal). Markdown is untrusted data: it is parsed as Markdown,
 * converted to HTML, then passed through an allowlist sanitizer, so it can
 * never execute code or inject unsafe HTML (SC-10). Frontmatter can suggest
 * metadata but never owner identity, publication state, or timestamps.
 */

export const MAX_MARKDOWN_BYTES = 1024 * 1024; // 1 MiB

export type Frontmatter = {
	title?: string;
	excerpt?: string;
	slug?: string;
};

export type ImageWarning = {
	url: string;
	reason: string;
};

export type ParsedMarkdown = {
	frontmatter: Frontmatter;
	frontmatterKeys: string[];
	/** Title derived by precedence: frontmatter, first H1, then filename. */
	derivedTitle: string | null;
	/** True when the first H1 was consumed as the title (not repeated in body). */
	usedH1: boolean;
	html: string;
	imageWarnings: ImageWarning[];
	/** Plain text of the first paragraph, used to suggest an excerpt. */
	firstParagraph: string | null;
};

const sanitizeSchema = structuredClone(defaultSchema);
sanitizeSchema.tagNames = [...(sanitizeSchema.tagNames ?? []), 'input'];
const sanitizeAttributes = (sanitizeSchema.attributes ??= {});
const attr = (tag: string, names: string[]) => {
	sanitizeAttributes[tag] = [...(sanitizeAttributes[tag] ?? []), ...names];
};
attr('input', ['checked', 'disabled', 'type']);
attr('code', ['className']);
attr('li', ['className']);
attr('ul', ['className']);
attr('span', ['className']);
// Heading anchors for the side index. The sanitizer's clobber guard rewrites
// these to user-content-* ids, which keeps DOM clobbering impossible.
attr('h2', ['id']);
attr('h3', ['id']);
attr('h4', ['id']);

export class MarkdownError extends Error {
	constructor(
		message: string,
		readonly code: string
	) {
		super(message);
	}
}

/** Decode bytes as strict UTF-8 or fail with an actionable error (SC-09). */
export function decodeMarkdown(bytes: Buffer | Uint8Array, filename = 'file'): string {
	if (bytes.length > MAX_MARKDOWN_BYTES) {
		throw new MarkdownError(
			'That file is larger than the 1 MiB Markdown limit.',
			'too-large'
		);
	}
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new MarkdownError(
			`${filename} is not valid UTF-8 text, so it cannot be imported.`,
			'encoding'
		);
	}
}

function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 64) || 'entry'
	);
}

export function suggestSlug(title: string): string {
	return slugify(title);
}

export function filenameTitle(filename: string): string {
	return filename.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').trim() || 'Untitled';
}

function parseFrontmatter(source: string): { fm: Frontmatter; keys: string[]; rest: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
	if (!match) return { fm: {}, keys: [], rest: source };
	let data: Record<string, unknown>;
	try {
		data = parseYaml.parse(match[1]) as Record<string, unknown>;
	} catch (err) {
		throw new MarkdownError(
			`The file's YAML frontmatter is not valid: ${(err as Error).message.split('\n')[0]}`,
			'yaml'
		);
	}
	if (data === null || typeof data !== 'object' || Array.isArray(data)) {
		throw new MarkdownError(
			'The file\'s YAML frontmatter must be a mapping of names to values.',
			'yaml'
		);
	}
	const keys = Object.keys(data);
	const pick = (key: string): string | undefined => {
		const value = data[key];
		if (typeof value === 'string' && value.trim().length > 0) return value.trim();
		return undefined;
	};
	// Only known keys have meaning; everything else is surfaced, never acted on.
	const fm: Frontmatter = {};
	const title = pick('title');
	const excerpt = pick('excerpt');
	const slug = pick('slug');
	if (title) fm.title = title.slice(0, 200);
	if (excerpt) fm.excerpt = excerpt.slice(0, 500);
	if (slug) fm.slug = slugify(slug);
	return { fm, keys, rest: match[2] };
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkFrontmatter, ['yaml'])
	.use(remarkRehype, { allowDangerousHtml: false })
	.use(rehypeSlug)
	.use(rehypeSanitize, sanitizeSchema)
	.use(rehypeStringify);

export function parseMarkdown(source: string, filename = 'file.md'): ParsedMarkdown {
	const { fm, keys, rest } = parseFrontmatter(source);

	const tree = unified().use(remarkParse).use(remarkGfm).parse(rest);

	// Title precedence (SC-07): valid frontmatter title, else first H1, else
	// filename (handled by the caller). A leading H1 used as the title is
	// removed so it is not shown twice.
	let derivedTitle: string | null = null;
	let usedH1 = false;
	if (!fm.title) {
		const first = tree.children.find((n) => n.type !== 'yaml');
		if (first && first.type === 'heading' && first.depth === 1) {
			const text = toString(first).trim();
			if (text) {
				derivedTitle = text;
				usedH1 = true;
				tree.children = tree.children.filter((n) => n !== first);
			}
		}
	}

	// Unresolved image references (SC-11): anything that is not an owned
	// /media/ upload is reported; no server fetch, no invented replacement.
	const imageWarnings: ImageWarning[] = [];
	visit(tree, 'image', (node) => {
		const url = node.url ?? '';
		if (!url.startsWith('/media/')) {
			imageWarnings.push({
				url,
				reason: url.startsWith('http')
					? 'remote image: upload it to the notebook or remove the reference'
					: 'local or missing image: upload it to the notebook or remove the reference'
			});
		}
	});

	let firstParagraph: string | null = null;
	for (const node of tree.children) {
		if (node.type === 'paragraph') {
			firstParagraph = toString(node).replace(/\s+/g, ' ').trim().slice(0, 300);
			break;
		}
	}

	const rendered = processor.runSync(tree);
	const html = processor.stringify(rendered);

	return {
		frontmatter: fm,
		frontmatterKeys: keys,
		derivedTitle,
		usedH1,
		html,
		imageWarnings,
		firstParagraph
	};
}

/** Render already-imported source for preview/publish using the same rules. */
export function renderBody(source: string): { html: string; imageWarnings: ImageWarning[] } {
	const parsed = parseMarkdown(source);
	return { html: parsed.html, imageWarnings: parsed.imageWarnings };
}

export function deriveExcerpt(source: string): string {
	const parsed = parseMarkdown(source);
	return parsed.frontmatter.excerpt ?? parsed.firstParagraph ?? '';
}
