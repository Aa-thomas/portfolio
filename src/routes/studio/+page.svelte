<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const projects = $derived(data.entries.filter((e) => e.kind === 'project'));
	const articles = $derived(data.entries.filter((e) => e.kind === 'article'));
</script>

<svelte:head>
	<title>Library — Aaron's notebook</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<h1>The <span data-highlight>library.</span></h1>
	<p class="lead">Everything saved in the notebook: drafts privately, live entries publicly.</p>
</div>

<div class="library-toolbar">
	<form method="POST" action="?/createProject">
		<button type="submit"><Icon name="plus" /> New project</button>
	</form>
	<form method="POST" action="?/createArticle">
		<button type="submit"><Icon name="file-text" /> New article</button>
	</form>
	<a class="button" href="/studio/home"><Icon name="check" /> Home selection</a>
	<form method="POST" action="?/logout" style="margin-left: auto">
		<button type="submit" class="danger"><Icon name="log-out" /> Sign out</button>
	</form>
</div>

{#snippet rows(kind: 'project' | 'article', entries: typeof data.entries)}
	{#if entries.length === 0}
		<p class="index-note">
			<Icon name="info" />
			{kind === 'project'
				? 'No projects saved yet. "New project" starts a draft.'
				: 'No articles saved yet. "New article" starts one; import a .md file inside.'}
		</p>
	{:else}
		{#each entries as entry (entry.id)}
			<div class="library-row">
				<div class="titles">
					<h3>{entry.title}</h3>
					<small>
						{#if entry.slug}
							/{kind === 'project' ? 'projects' : 'writing'}/{entry.slug}
						{:else}
							no slug yet
						{/if}
						· updated {new Date(entry.updated).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}
					</small>
				</div>
				<div class="row-actions">
					{#if entry.live}
						<span class="badge live">Live</span>
					{:else}
						<span class="badge">Draft</span>
					{/if}
					{#if entry.draftChanges}
						<span class="badge draft-changes">Saved draft changes</span>
					{/if}
					<a class="button" href="/studio/{kind === 'project' ? 'projects' : 'articles'}/{entry.id}">
						<Icon name="pencil" size={16} /> Edit
					</a>
					<a class="button" href="/studio/{kind === 'project' ? 'projects' : 'articles'}/{entry.id}/preview">
						<Icon name="eye" size={16} /> Preview
					</a>
				</div>
			</div>
		{/each}
	{/if}
{/snippet}

<section class="library-section" aria-labelledby="lib-projects">
	<h2 id="lib-projects">Projects</h2>
	{@render rows('project', projects)}
</section>

<section class="library-section" aria-labelledby="lib-articles">
	<h2 id="lib-articles">Writing</h2>
	{@render rows('article', articles)}
</section>
