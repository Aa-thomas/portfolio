<script lang="ts">
	import '../app.css';
	import Icon from '$lib/components/Icon.svelte';
	import { site } from '$lib/site';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	const links = [
		{ href: '/projects', label: 'Projects' },
		{ href: '/writing', label: 'Writing' },
		{ href: '/about', label: 'About' }
	];

	function current(href: string): 'page' | undefined {
		const path = page.url.pathname;
		return path === href || path.startsWith(href + '/') ? 'page' : undefined;
	}

	onMount(() => {
		// Handwritten annotations (Rough Notation, loaded from /vendor). If the
		// library or the font fails, reading and navigation still work.
		const w = window as unknown as { RoughNotation?: any };
		const annotate = () => {
			if (!w.RoughNotation) return;
			for (const element of document.querySelectorAll('[data-highlight]')) {
				w.RoughNotation.annotate(element, {
					type: 'underline',
					color: '#f1df85',
					animate: false,
					strokeWidth: 9,
					padding: -3,
					iterations: 1
				}).show();
			}
			for (const element of document.querySelectorAll('[data-underline]')) {
				w.RoughNotation.annotate(element, {
					type: 'underline',
					color: '#292a24',
					animate: false,
					strokeWidth: 1,
					padding: 3,
					iterations: 1
				}).show();
			}
		};
		if (document.fonts?.ready) {
			document.fonts.ready.then(annotate).catch(annotate);
		} else {
			annotate();
		}
	});
</script>

<a class="skip" href="#main">Skip to content</a>
<div class="page">
	<header class="site-header">
		<a class="wordmark" href="/" aria-label="Aaron, home">aaron.</a>
		<nav class="site-nav" aria-label="Main navigation">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={current(link.href)}>{link.label}</a>
			{/each}
		</nav>
	</header>
	<main id="main">
		{@render children()}
	</main>
	<footer class="site-footer">
		<p>Software development &amp; writing.</p>
		<p class="closing">Always a work in progress.</p>
		<a class="action" href="/about#contact">Get in touch <Icon name="arrow-right" /></a>
	</footer>
</div>
