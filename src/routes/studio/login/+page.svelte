<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Sign in — Aaron's notebook</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<h1>The <span data-highlight>studio.</span></h1>
	<p class="lead">Private notebook-keeping. Only the owner signs in here.</p>
</div>

<form class="studio-form" method="POST">
	{#if form?.message}
		<p class="form-error" role="alert">{form.message}</p>
	{/if}
	<div class="field">
		<label for="username">Username</label>
		<input id="username" name="username" type="text" autocomplete="username" required />
	</div>
	<div class="field">
		<label for="password">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			required
		/>
	</div>
	<div class="form-row">
		<button type="submit" class="primary-btn">Sign in</button>
		<a class="action" href="/">Back to the notebook</a>
	</div>
</form>
