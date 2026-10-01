<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: { data: PageProps['data']; form: ActionData } = $props();

	// Ordered selection, kept client-side; move buttons reorder it. Checking a
	// project appends it; the order is exactly what Home will show (SC-19).
	let selected = $state<string[]>([...data.featured]);
	const loadedVersion = data.version;
	$effect(() => {
		// After a save (or a concurrent change discovered on reload), the
		// server's saved selection is authoritative.
		if (data.version !== loadedVersion) selected = [...data.featured];
	});

	const rows = $derived(
		selected
			.map((id) => data.published.find((p) => p.id === id))
			.filter((p): p is { id: string; title: string; slug: string } => !!p)
			.map((p, index) => ({ ...p, position: index + 1 }))
	);
	const unselected = $derived(data.published.filter((p) => !selected.includes(p.id)));

	function move(id: string, delta: number) {
		const index = selected.indexOf(id);
		const target = index + delta;
		if (index < 0 || target < 0 || target >= selected.length) return;
		const next = [...selected];
		[next[index], next[target]] = [next[target], next[index]];
		selected = next;
	}
</script>

<svelte:head>
	<title>Home selection — studio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/studio"><Icon name="arrow-left" /> Library</a>
	<h1>The <span data-highlight>front page.</span></h1>
	<p class="lead">
		Choose up to {data.max} published projects for Home, in order. With none chosen, the newest
		{data.max} are shown instead.
	</p>
</div>

{#if form?.message}
	<p class="form-error" role="alert">{form.message}</p>
{:else if form?.saved}
	<p class="form-success" role="status">Saved. <a href="/">See the home page</a></p>
{/if}

<form method="POST" action="?/save" use:enhance>
	<input type="hidden" name="expectedVersion" value={data.version} />
	<input type="hidden" name="order" value={JSON.stringify(selected)} />

	{#if rows.length === 0}
		<p class="index-note">
			<Icon name="info" />
			No projects are featured right now — Home falls back to the newest published projects.
		</p>
	{:else}
		<ul class="ordered-list" aria-label="Featured projects in order">
			{#each rows as row (row.id)}
				<li class="ordered-item">
					<span class="ordering-label">Position {row.position}</span>
					<span class="titles">{row.title} <small class="muted">/{row.slug}</small></span>
					<button
						type="button"
						aria-label={`Move ${row.title} up`}
						disabled={row.position === 1}
						onclick={() => move(row.id, -1)}><Icon name="arrow-up" size={16} /></button
					>
					<button
						type="button"
						aria-label={`Move ${row.title} down`}
						disabled={row.position === rows.length}
						onclick={() => move(row.id, 1)}><Icon name="arrow-down" size={16} /></button
					>
					<button type="button" class="danger" onclick={() => (selected = selected.filter((id) => id !== row.id))}>
						<Icon name="x" size={16} /><span class="sr-only">Remove {row.title}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if selected.length >= data.max}
		<p class="index-note"><Icon name="info" /> Featured limit reached ({data.max}).</p>
	{/if}

	{#if unselected.length > 0}
		<h2 style="margin: 26px 0 10px">Published projects</h2>
		<ul class="ordered-list">
			{#each unselected as project (project.id)}
				<li class="ordered-item">
					<span class="titles">{project.title} <small class="muted">/{project.slug}</small></span>
					<button
						type="button"
						disabled={selected.length >= data.max}
						onclick={() => (selected = [...selected, project.id])}
					>
						<Icon name="plus" size={16} /> Feature
					</button>
				</li>
			{/each}
		</ul>
	{:else if rows.length > 0}
		<p class="index-note"><Icon name="info" /> Every published project is listed above.</p>
	{/if}

	<div class="form-row">
		<button type="submit" class="primary-btn" disabled={selected.length > data.max}>
			Save selection
		</button>
		<a class="action" href="/">View home</a>
	</div>
</form>
