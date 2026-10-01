<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { site } from '$lib/site';
</script>

<svelte:head>
	<title>About — Aaron</title>
	<meta name="description" content="Aaron Thomas — software development and writing." />
</svelte:head>

<div class="page-heading">
	<h1>A little <span data-highlight>about me.</span></h1>
	<p class="lead">I'm {site.fullName}. This is a home for my software development and writing.</p>
</div>

<div class="document-layout">
	<div>
		<div class="prose">
			<section>
				<h2>The person behind the notebook</h2>
				<p>
					I build software and keep a notebook of the thinking behind it — the decisions,
					experiments, and ideas worth keeping.
				</p>
				<p class="content-note">
					A fuller biography is still to be added. No employer, location, or availability is
					claimed here.
				</p>
			</section>
			<section>
				<h2>What you'll find here</h2>
				<p>
					Projects, experiments, and ideas worth keeping. Start with the work, or spend a
					little time with the writing.
				</p>
				<div class="actions">
					<a class="action" href="/projects">Browse projects <Icon name="arrow-right" /></a>
					<a class="action" href="/writing">Browse writing <Icon name="arrow-right" /></a>
				</div>
			</section>
		</div>
		<section class="section" id="contact">
			<h2>Get in <span data-underline>touch.</span></h2>
			<p class="lead">
				{#if site.email}
					The quickest way to reach me:
				{:else}
					Contact details are still to be added.
				{/if}
			</p>
			{#if site.email}
				<div class="contact-placeholder">
					<Icon name="mail" />
					<div>
						<strong>Email</strong>
						<small><a href="mailto:{site.email}">{site.email}</a></small>
					</div>
				</div>
			{:else}
				<div class="contact-placeholder">
					<Icon name="mail" />
					<div>
						<strong>Email</strong>
						<small>Address not provided</small>
					</div>
					<span class="status">Pending</span>
				</div>
			{/if}
			{#each site.profiles as profile (profile.label)}
				<div class="contact-placeholder">
					<Icon name="code-xml" />
					<div>
						<strong>{profile.label}</strong>
						<small><a href={profile.url} rel="me noopener">{profile.url}</a></small>
					</div>
				</div>
			{/each}
		</section>
	</div>
	<aside class="side-index">
		<h2>A note on this site</h2>
		<p>
			The layout is ready for the real story. Personal details stay blank until they are
			supplied.
		</p>
	</aside>
</div>
