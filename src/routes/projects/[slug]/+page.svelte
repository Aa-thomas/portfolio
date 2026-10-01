<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = $derived(data.project);
	const date = $derived(
		new Date(project.firstPublishedAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
	const headings = $derived(
		project.caseStudyHtml
			? [...project.caseStudyHtml.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map((m) => ({
					id: m[1],
					text: m[2].replace(/<[^>]+>/g, '')
				}))
			: []
	);
</script>

<svelte:head>
	<title>{project.title} — Aaron</title>
	<meta name="description" content={project.description} />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/projects"><Icon name="arrow-left" /> All projects</a>
	<h1>{project.title}.</h1>
	{#if project.description}
		<p class="lead">{project.description}</p>
	{/if}
	<div class="reading-meta">
		<span>Software project</span>
		<span>Published {date}</span>
	</div>
</div>

<div class="document-layout">
	<div>
		{#if project.photoUrl}
			<img
				class="entry-photo"
				src={project.photoUrl}
				alt={project.photoAlt || project.title}
				width="800"
				height="533"
			/>
		{/if}
		{#if project.url}
			<p style="margin-bottom: 20px">
				<a class="action" href={project.url} rel="noopener">
					<Icon name="external-link" /> Visit the website
				</a>
			</p>
		{/if}
		{#if project.caseStudyHtml}
			<div class="prose">
				<!-- Sanitized server-side by the shared Markdown pipeline (SC-10). -->
				{@html project.caseStudyHtml}
			</div>
		{:else if project.description}
			<div class="prose">
				<section>
					<h2>About this project</h2>
					<p>{project.description}</p>
				</section>
			</div>
		{/if}
		<div class="end-links">
			<a class="action" href="/projects">Back to projects <Icon name="arrow-right" /></a>
			<a class="action" href="/writing">Related thinking <Icon name="arrow-right" /></a>
		</div>
	</div>
	<aside class="side-index">
		{#if headings.length > 0}
			<h2>In this entry</h2>
			<nav aria-label="Case study sections">
				{#each headings as heading (heading.id)}
					<a href="#{heading.id}">{heading.text}</a>
				{/each}
			</nav>
			<p>Code and demo links will appear when provided.</p>
		{:else}
			<h2>This entry</h2>
			<p>A quick-add project: what it is, and where to find it.</p>
		{/if}
	</aside>
</div>
