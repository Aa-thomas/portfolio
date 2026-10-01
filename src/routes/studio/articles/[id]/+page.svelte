<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps } from './$types';

	let { data, form: rawForm }: { data: PageProps['data']; form: ActionData } = $props();
	const entry = $derived(data.entry);
	// Widen the action-data union into one optional-field shape for the template.
	const form = $derived(
		rawForm as null | undefined | {
			message?: string;
			field?: string;
			imported?: boolean;
			version?: number;
			usedH1?: boolean;
			ignoredKeys?: string[];
			saved?: boolean;
			values?: Record<string, string>;
			imageRef?: string;
			coverSet?: boolean;
			coverRemoved?: boolean;
		}
	);

	const v = $derived((form?.values ?? null) as Record<string, string> | null);	let title = $state((v?.title as string) ?? entry.d_title);
	let excerpt = $state((v?.excerpt as string) ?? entry.d_excerpt);
	let slug = $state((v?.slug as string) ?? entry.d_slug);
	let source = $state((v?.source as string) ?? entry.d_source ?? '');

	// A retry keeps the same request id, so an uncertain save replays rather
	// than duplicates (SC-16). A reload makes a new one.
	let requestId = $state(crypto.randomUUID());

	function newRequestId() {
		requestId = crypto.randomUUID();
	}

	function insertAtCursor(ref: string, alt: string) {
		const snippet = `![${alt || 'image'}](${ref})`;
		const area = document.getElementById('source') as HTMLTextAreaElement | null;
		if (!area) {
			source = source + '\n\n' + snippet;
			return;
		}
		const start = area.selectionStart ?? source.length;
		const end = area.selectionEnd ?? source.length;
		source = source.slice(0, start) + snippet + source.slice(end);
		newRequestId();
		area.focus();
	}
</script>

<svelte:head>
	<title>Edit article — studio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/studio"><Icon name="arrow-left" /> Library</a>
	<h1>Edit <span data-highlight>article.</span></h1>
	<p class="lead">
		{entry.pub_version !== null
			? 'Live article. Saving changes the private draft; republish replaces the public page.'
			: 'Saved work stays private until you preview and publish it.'}
	</p>
</div>

{#if form?.message}
	<p class="form-error" role="alert">{form.message}</p>
{/if}

<div class="studio-form">
	<form method="POST" action="?/import" enctype="multipart/form-data" use:enhance>
		<div class="field">
			<label for="file">Import a Markdown file</label>
			<input id="file" name="file" type="file" accept=".md,text/markdown" />
			<span class="hint">
				UTF-8 .md up to 1 MiB. Optional YAML frontmatter may set title, excerpt, slug; anything
				else in it is listed and ignored.
			</span>
			{#if form?.field === 'importFile'}<span class="field-error">{form.message}</span>{/if}
		</div>
		<div class="form-row" style="margin-top: 0">
			<button type="submit"><Icon name="upload" size={16} /> Import</button>
			{#if form?.imported}
				<span class="form-success" role="status" style="margin: 0">
					Imported as draft version {form.version}. {form.usedH1 ? 'The first heading became the title. ' : ''}
					{form.ignoredKeys?.length
						? `Ignored frontmatter keys: ${form.ignoredKeys.join(', ')}.`
						: ''}
				</span>
			{/if}
		</div>
	</form>
</div>

<form class="studio-form" method="POST" action="?/save" use:enhance>
	<input type="hidden" name="expectedVersion" value={data.version} />
	<input type="hidden" name="requestId" value={requestId} />

	{#if form?.saved}
		<p class="form-success" role="status">
			Saved as draft version {form.version}. <a href="/studio/articles/{entry.id}/preview">Preview it</a>
		</p>
	{/if}

	<div class="field">
		<label for="title">Title</label>
		<input id="title" name="title" type="text" bind:value={title} maxlength="200" required />
		{#if form?.field === 'title'}<span class="field-error">{form.message}</span>{/if}
	</div>

	<div class="field">
		<label for="slug">Slug</label>
		<input
			id="slug"
			name="slug"
			type="text"
			bind:value={slug}
			{...(entry.held_slug ? { disabled: true, title: 'Published slugs stay fixed' } : {})}
		/>
		<input type="hidden" name="slug" value={slug} />
		<span class="hint">
			Part of the public URL: /writing/<strong>{slug || '…'}</strong>. Once published, it stays fixed.
		</span>
		{#if form?.field === 'slug'}<span class="field-error">{form.message}</span>{/if}
	</div>

	<div class="field">
		<label for="excerpt">Excerpt</label>
		<input id="excerpt" name="excerpt" type="text" bind:value={excerpt} maxlength="500" />
		<span class="hint">One or two sentences under the title. Left empty, the first paragraph is used.</span>
	</div>

	<div class="field">
		<label for="source">Markdown source</label>
		<textarea
			id="source"
			name="source"
			bind:value={source}
			oninput={newRequestId}
			spellcheck="false"
		></textarea>
		{#if form?.field === 'source'}<span class="field-error">{form.message}</span>{/if}
	</div>

	{#if data.imageWarnings.length > 0}
		<p class="form-error" role="alert">
			<strong>Unresolved image references</strong> — publishing stays blocked until each is an
			owned upload or removed:
			{#each data.imageWarnings as warning (warning.url)}
				<br /><code class="inline-code">{warning.url}</code> ({warning.reason})
			{/each}
		</p>
	{/if}

	<div class="form-row">
		<button type="submit" class="primary-btn">Save draft</button>
		<a class="action" href="/studio/articles/{entry.id}/preview">Preview</a>
		<span class="muted" style="font-size: 13px">Draft version {data.version}</span>
	</div>
</form>

<div class="studio-form" style="margin-top: 40px">
	<h2 style="margin-bottom: 14px">Images</h2>

	<form method="POST" action="?/cover" enctype="multipart/form-data" use:enhance>
		<div class="field">
			<label for="cover">Cover (optional)</label>
			{#if data.coverUrl}
				<img class="entry-photo" style="max-width: 420px" src={data.coverUrl} alt="Current cover" width="800" height="533" />
			{/if}
			<input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
			<span class="hint">Same rules as project photos: JPEG/PNG/WebP up to 10 MiB, framed 3:2.</span>
			{#if form?.field === 'cover'}<span class="field-error">{form.message}</span>{/if}
		</div>
		<div class="form-row" style="margin-top: 0">
			<button type="submit"><Icon name="image" size={16} /> {data.coverUrl ? 'Replace cover' : 'Add cover'}</button>
			{#if data.coverUrl}<button type="submit" name="removeCover" value="1" class="danger">Remove cover</button>{/if}
		</div>
	</form>

	<form method="POST" action="?/image" enctype="multipart/form-data" use:enhance={() =>
		async ({ result }) => {
			if (result.type === 'success' && 'imageRef' in (result.data ?? {})) {
				const d = result.data as { imageRef: string; imageAlt?: string };
				insertAtCursor(d.imageRef, d.imageAlt ?? '');
			}
		}}>
		<div class="field">
			<label for="image">Body image</label>
			<input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
			<input id="image-alt" name="alt" type="text" placeholder="Describe the image (alt text)" style="margin-top: 8px" />
			<span class="hint">
				Uploaded privately and inserted into the source as a notebook link. Without JavaScript,
				the link appears after uploading for you to copy in.
			</span>
			{#if form?.field === 'image'}<span class="field-error">{form.message}</span>{/if}
		</div>
		<div class="form-row" style="margin-top: 0">
			<button type="submit"><Icon name="upload" size={16} /> Upload and insert</button>
			{#if form?.imageRef}
				<code class="inline-code">{form.imageRef}</code>
			{/if}
		</div>
	</form>
</div>
