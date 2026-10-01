<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page-heading">
	<h1>The <span data-highlight>project</span> notebook.</h1>
	<p class="lead">The work, the decisions, and what came next.</p>
</div>

{#if data.projects.length === 0}
	<p class="index-note">
		<Icon name="info" />
		No projects have been published yet. When one is, it will appear here with its title,
		description, and photo.
	</p>
{:else}
	<div class="project-list">
		{#each data.projects as project (project.id)}
			<ProjectCard {project} />
		{/each}
	</div>
{/if}

<p class="small-note">A place for the thinking, too.</p>
<div class="end-links">
	<a class="action" href="/writing">Explore the writing <Icon name="arrow-right" /></a>
	<a class="action" href="/about">About Aaron <Icon name="arrow-right" /></a>
</div>
