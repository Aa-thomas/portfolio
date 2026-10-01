<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import WritingRow from '$lib/components/WritingRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="intro" aria-labelledby="home-title">
	<div>
		<h1 id="home-title">
			I <span data-highlight>build</span> software.<br />
			I <span data-highlight>write</span> things down.
		</h1>
		<p class="lead">A notebook of projects, experiments,<br />and ideas worth keeping.</p>
		<div class="actions">
			<a class="action primary" href="/projects">Explore my projects <Icon name="arrow-right" /></a>
			<a class="action" href="/writing">Read my writing <Icon name="arrow-right" /></a>
		</div>
	</div>
	<aside class="margin-note">
		<p>A little code.<br />A little curiosity.</p>
		<small>The work, and the thinking behind it.</small>
	</aside>
</section>

<section aria-labelledby="projects-title">
	<div class="section-title">
		<h2 id="projects-title">Selected <span data-underline>projects</span></h2>
		<a class="action" href="/projects">All projects <Icon name="arrow-right" /></a>
	</div>
	{#if data.projects.length === 0}
		<p class="index-note">
			<Icon name="info" />
			Nothing published yet. Projects saved in the notebook will appear here as soon as they
			are published.
		</p>
	{:else}
		<div class="projects-grid">
			{#each data.projects as project (project.id)}
				<ProjectCard {project} />
			{/each}
		</div>
	{/if}
</section>

<section class="section" aria-labelledby="writing-title">
	<div class="section-title">
		<h2 id="writing-title">Latest <span data-underline>writing</span></h2>
		<a class="action" href="/writing">All writing <Icon name="arrow-right" /></a>
	</div>
	{#if data.articles.length === 0}
		<p class="index-note">
			<Icon name="info" />
			No writing has been published yet. The notebook keeps its quiet until something is worth
			keeping.
		</p>
	{:else}
		<div class="writing-list">
			{#each data.articles as article (article.id)}
				<WritingRow {article} />
			{/each}
		</div>
	{/if}
</section>
