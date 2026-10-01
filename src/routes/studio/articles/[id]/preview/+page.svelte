<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: { data: PageProps['data']; form: ActionData } = $props();
	const entry = $derived(data.entry);
</script>

<svelte:head>
	<title>Preview article — studio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/studio/articles/{entry.id}"><Icon name="arrow-left" /> Back to editing</a>
	<h1 class="article-title">Preview: {entry.d_title || '(untitled)'}.</h1>
	<p class="lead">
		Private preview of draft version {data.version}, rendered exactly as a visitor would read it.
	</p>
</div>

{#if form?.message}
	<p class="form-error" role="alert">{form.message}</p>
{:else if form?.withdrawn}
	<p class="form-success" role="status">
		Withdrawn. The public pages no longer show it; the draft stays in your library.
	</p>
{/if}

<div class="reading-column">
	{#if data.coverUrl}
		<img class="entry-photo" style="margin-bottom: 24px" src={data.coverUrl} alt="" width="800" height="533" />
	{/if}
	{#if data.excerpt}
		<p class="lead">{data.excerpt}</p>
	{/if}
	<div class="prose">
		{@html data.html}
	</div>
	{#if data.imageWarnings.length > 0}
		<p class="form-error" role="alert">
			Unresolved image references block publishing:
			{#each data.imageWarnings as warning (warning.url)}
				<code class="inline-code">{warning.url}</code>
			{/each}
			Replace them with notebook uploads or remove them before publishing.
		</p>
	{/if}
	<div class="form-row">
		<form method="POST" action="?/publish" use:enhance>
			<input type="hidden" name="expectedVersion" value={data.version} />
			<button type="submit" class="primary-btn">
				{entry.pub_version !== null ? 'Republish this version' : 'Publish this version'}
			</button>
		</form>
		{#if entry.pub_version !== null}
			<form method="POST" action="?/withdraw" use:enhance>
				<input type="hidden" name="expectedVersion" value={data.version} />
				<button type="submit" class="danger">Unpublish</button>
			</form>
		{/if}
		<a class="action" href="/studio">Back to library</a>
	</div>
</div>
