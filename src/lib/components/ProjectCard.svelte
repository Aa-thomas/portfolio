<script lang="ts">
	import type { PublicProjectCard } from '$lib/queries';
	import Icon from './Icon.svelte';

	let { project }: { project: PublicProjectCard } = $props();
</script>

<article class="project-entry">
	{#if project.photoUrl}
		<a href="/projects/{project.slug}" class="photo-link" tabindex="-1" aria-hidden="true">
			<img
				class="entry-photo"
				src={project.photoUrl}
				alt={project.photoAlt || project.title}
				loading="lazy"
				width="800"
				height="533"
			/>
		</a>
	{/if}
	<div class="entry-body">
		<div>
			<h3><a href="/projects/{project.slug}">{project.title}</a></h3>
		</div>
		{#if project.description}
			<p>{project.description}</p>
		{/if}
		<div class="entry-meta">
			<span class="category">Software project</span>
			<a class="action" href="/projects/{project.slug}">
				View project <Icon name="arrow-right" />
			</a>
		</div>
	</div>
</article>
