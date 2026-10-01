import { describe, expect, it } from 'vitest';
import {
	decodeMarkdown,
	filenameTitle,
	parseMarkdown,
	suggestSlug
} from '../src/lib/server/markdown';

describe('SC-07 import and title precedence', () => {
	it('uses frontmatter title first', () => {
		const parsed = parseMarkdown('---\ntitle: From frontmatter\nexcerpt: E\n---\n\n# Not this\n\nBody');
		expect(parsed.frontmatter.title).toBe('From frontmatter');
		expect(parsed.usedH1).toBe(false);
		expect(parsed.frontmatter.excerpt).toBe('E');
	});

	it('falls back to the first H1 and does not repeat it in the body', () => {
		const parsed = parseMarkdown('# The Real Title\n\nFirst paragraph.');
		expect(parsed.derivedTitle).toBe('The Real Title');
		expect(parsed.usedH1).toBe(true);
		expect(parsed.html).not.toContain('<h1');
		expect(parsed.html).toContain('First paragraph.');
	});

	it('suggests a slug from the title', () => {
		expect(suggestSlug('A Hat, Perhaps?')).toBe('a-hat-perhaps');
		expect(filenameTitle('my-note.md')).toBe('my note');
	});
});

describe('SC-09 reject malformed imports', () => {
	it('refuses invalid UTF-8', () => {
		expect(() => decodeMarkdown(Buffer.from([0xff, 0xfe, 0x00]))).toThrow(/UTF-8/);
	});
	it('refuses oversized files', () => {
		expect(() => decodeMarkdown(Buffer.alloc(1024 * 1024 + 1))).toThrow(/1 MiB/);
	});
	it('reports invalid YAML without touching data', () => {
		expect(() => parseMarkdown('---\ntitle: [unclosed\n---\n\nbody')).toThrow(/YAML/);
	});
	it('rejects non-mapping frontmatter', () => {
		expect(() => parseMarkdown('---\n- a\n- b\n---\n\nbody')).toThrow(/mapping/);
	});
});

describe('SC-10 Markdown is data, never executable code', () => {
	it('strips script tags and event handlers', () => {
		const parsed = parseMarkdown(
			'# T\n\n<script>alert(1)</script>\n\n<button onclick="steal()">x</button>\n\nOk.'
		);
		expect(parsed.html).not.toContain('script');
		expect(parsed.html).not.toContain('onclick');
		expect(parsed.html).toContain('Ok.');
	});
	it('blocks javascript: URLs in links and images', () => {
		const parsed = parseMarkdown(
			'# T\n\n[a](javascript:alert(1))\n\n![x](javascript:alert(2))\n\n[b](https://ok.example)'
		);
		expect(parsed.html).not.toContain('javascript:');
		expect(parsed.html).toContain('https://ok.example');
	});
	it('leaves Svelte/MDX-like expressions as literal text', () => {
		const parsed = parseMarkdown('# T\n\n{#if x}<b>no</b>{/if}\n\n<script context="module">no()</script>');
		expect(parsed.html).not.toContain('<script');
	});
	it('frontmatter cannot set identity or publication state', () => {
		const parsed = parseMarkdown(
			'---\ntitle: T\nowner: someone-else\npublished: true\nfirst_published_at: 2000-01-01\n---\n\nBody'
		);
		expect(parsed.frontmatterKeys).toEqual(
			expect.arrayContaining(['owner', 'published', 'first_published_at'])
		);
		// Only title/excerpt/slug are consumed; the rest have no hidden effect.
		expect(parsed.frontmatter).toEqual({ title: 'T' });
	});
});

describe('SC-08 supported Markdown renders readably', () => {
	it('renders code, tables, task lists, and quotes', () => {
		const parsed = parseMarkdown(
			[
				'# T',
				'',
				'```js',
				'const x = "<b>not html</b>";',
				'```',
				'',
				'| a | b |',
				'| --- | --- |',
				'| 1 | 2 |',
				'',
				'- [ ] todo',
				'- [x] done',
				'',
				'> quoted'
			].join('\n')
		);
		expect(parsed.html).toContain('<pre>');
		expect(parsed.html).toContain('not html');
		expect(parsed.html).toContain('<table>');
		expect(parsed.html).toMatch(/<input[^>]*disabled/);
		expect(parsed.html).toContain('<blockquote>');
	});
	it('code inside <pre> stays literal text', () => {
		const parsed = parseMarkdown('```\n<script>alert(1)</script>\n```');
		expect(parsed.html).not.toContain('<script');
		expect(parsed.html).toContain('alert(1)');
	});
});

describe('SC-11 image references', () => {
	it('warns about remote and local images, accepts owned uploads', () => {
		const parsed = parseMarkdown(
			'# T\n\n![remote](https://example.com/x.png)\n\n![local](./pic.png)\n\n![owned](/media/img_abc/full)'
		);
		expect(parsed.imageWarnings.map((w) => w.url)).toEqual([
			'https://example.com/x.png',
			'./pic.png'
		]);
	});
});
