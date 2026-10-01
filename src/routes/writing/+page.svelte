<script lang="ts">
	import WritingRow from '$lib/components/WritingRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="page-heading">
	<h1>Things worth <span data-highlight>writing down.</span></h1>
	<p class="lead">Notes, essays, and ideas from the process.</p>
</div>

{#if data.articles.length === 0}
	<p class="index-note">
		<Icon name="info" />
		Nothing has been published here yet. Imported Markdown drafts will appear once they are
		published.
	</p>
{:else}
	<div class="writing-list">
		{#each data.articles as article (article.id)}
			<WritingRow {article} />
		{/each}
	</div>
{/if}

<div class="section">
	<h2>A little room for ideas.</h2>
	<p class="lead">Longer essays and shorter notes share one quiet reading space.</p>
	<p class="small-note">Always a work in progress.</p>
</div>
<div class="end-links">
	<a class="action" href="/projects">See the projects <Icon name="arrow-right" /></a>
	<a class="action" href="/about">About Aaron <Icon name="arrow-right" /></a>
</div>
