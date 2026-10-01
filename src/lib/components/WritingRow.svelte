<script lang="ts">
	import type { PublicArticleCard } from '$lib/queries';

	let { article }: { article: PublicArticleCard } = $props();

	const date = new Date(article.firstPublishedAt).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
</script>

<article class="writing-row">
	<span class="category">Article</span>
	<h3><a href="/writing/{article.slug}">{article.title}</a></h3>
	<span class="status">{date}</span>
</article>
