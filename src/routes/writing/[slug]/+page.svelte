<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const article = $derived(data.article);
	const date = $derived(
		new Date(article.firstPublishedAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
</script>

<svelte:head>
	<title>{article.title} — Aaron</title>
	{#if article.excerpt}
		<meta name="description" content={article.excerpt} />
	{/if}
</svelte:head>

<div class="page-heading">
	<a class="back" href="/writing"><Icon name="arrow-left" /> All writing</a>
	<h1 class="article-title">{article.title}.</h1>
	<div class="reading-meta">
		<span>Article</span>
		<span>By Aaron</span>
		<span>{date}</span>
	</div>
</div>

<div class="reading-column">
	{#if article.coverUrl}
		<img
			class="entry-photo"
			src={article.coverUrl}
			alt=""
			width="800"
			height="533"
			style="margin-bottom: 24px"
		/>
	{/if}
	<div class="prose">
		<!-- One shared sanitizer protects this public page exactly as it
		     protected the private preview (SC-10). -->
		{@html article.html}
	</div>
	<div class="end-links">
		<a class="action" href="/writing">Back to all writing <Icon name="arrow-right" /></a>
		<a class="action" href="/projects">See the projects <Icon name="arrow-right" /></a>
	</div>
</div>
