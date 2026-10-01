<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: { data: PageProps['data']; form: ActionData } = $props();
	const entry = $derived(data.entry);
</script>

<svelte:head>
	<title>Preview project — studio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/studio/projects/{entry.id}"><Icon name="arrow-left" /> Back to editing</a>
	<h1>Preview: {entry.d_title || '(untitled)'}.</h1>
	<p class="lead">
		This is the private preview of draft version {data.version}. A visitor would see exactly this
		once it is published.
	</p>
</div>

{#if form?.message}
	<p class="form-error" role="alert">{form.message}</p>
{:else if form?.withdrawn}
	<p class="form-success" role="status">
		Withdrawn. The public pages no longer show it; the draft stays in your library.
	</p>
{/if}

<div class="document-layout">
	<div>
		{#if data.photoUrl}
			<img
				class="entry-photo"
				src={data.photoUrl}
				alt={entry.d_alt || entry.d_title}
				width="800"
				height="533"
			/>
		{/if}
		{#if entry.d_url}
			<p style="margin-bottom: 20px">
				<a class="action" href={entry.d_url} rel="noopener">
					<Icon name="external-link" /> Visit the website
				</a>
			</p>
		{/if}
		<div class="prose">
			{#if entry.d_description}
				<section>
					<h2>About this project</h2>
					<p>{entry.d_description}</p>
				</section>
			{/if}
			{#if data.caseStudyHtml}
				{@html data.caseStudyHtml}
			{/if}
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
	<aside class="side-index">
		<h2>Preview notes</h2>
		<p>
			{entry.pub_version !== null
				? 'The live public version stays unchanged until you republish this draft.'
				: 'Nothing about this project is public yet.'}
		</p>
	</aside>
</div>
