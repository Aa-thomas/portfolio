<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageProps } from './$types';

	let { data, form }: { data: PageProps['data']; form: ActionData } = $props();

	const entry = $derived(data.entry);
	const savedPhoto = $derived(data.photo);

	const v = $derived((form?.values ?? null) as Record<string, string> | null);
	let title = $state((v?.title as string) ?? entry.d_title);
	let url = $state((v?.url as string) ?? entry.d_url);
	let description = $state((v?.description as string) ?? entry.d_description);
	let alt = $state((v?.alt as string) ?? entry.d_alt);
	let caseStudy = $state((v?.caseStudy as string) ?? entry.d_case_study ?? '');

	// --- Photo framing (keyboard-friendly: three sliders, no drag) ---
	let fileInput = $state<HTMLInputElement | null>(null);
	let previewSrc = $state(savedPhoto ? `/media/${savedPhoto.id}/source?v=${data.version}` : '');
	let natural = $state(
		savedPhoto ? { width: savedPhoto.width, height: savedPhoto.height } : null
	);
	let removePhoto = $state(false);

	const initial = $derived(
		data.crop && natural
			? {
					fx: Math.round((data.crop.x + data.crop.w / 2) * 100),
					fy: Math.round((data.crop.y + data.crop.h / 2) * 100),
					zoom: Math.round(
						(defaultWindow().w / data.crop.w) * 100
					)
				}
			: { fx: 50, fy: 50, zoom: 100 }
	);
	let fx = $state(50);
	let fy = $state(50);
	let zoom = $state(100);
	let slidersReady = $state(false);
	$effect(() => {
		// Initialise once crop data is available.
		if (!slidersReady && (data.crop || previewSrc === '')) {
			fx = initial.fx;
			fy = initial.fy;
			zoom = initial.zoom;
			slidersReady = true;
		}
	});

	function defaultWindow() {
		const iw = natural?.width ?? 3;
		const ih = natural?.height ?? 2;
		return iw / ih >= 1.5
			? { w: (ih * 1.5) / iw, h: 1 }
			: { w: 1, h: (iw / 1.5) / ih };
	}

	const cropRect = $derived.by(() => {
		if (!natural || removePhoto) return null;
		const { width: iw, height: ih } = natural;
		const base = defaultWindow();
		const w = Math.min(base.w / (zoom / 100), 1);
		const h = Math.min(base.h / (zoom / 100), 1);
		const cx = Math.min(Math.max((fx / 100) * iw, (w * iw) / 2), iw - (w * iw) / 2);
		const cy = Math.min(Math.max((fy / 100) * ih, (h * ih) / 2), ih - (h * ih) / 2);
		return { x: (cx - (w * iw) / 2) / iw, y: (cy - (h * ih) / 2) / ih, w, h };
	});

	const previewStyle = $derived.by(() => {
		const rect = cropRect;
		if (!rect || !natural) return '';
		// Container is 3:2; scale the image so the crop window fills it.
		const scale = 1 / rect.w;
		return `width:${scale * 100}%; left:${-rect.x * scale * 100}%; top:${-rect.y * scale * 100}%; position:absolute;`;
	});

	function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		removePhoto = false;
		if (!file) return;
		previewSrc = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			natural = { width: img.naturalWidth, height: img.naturalHeight };
			fx = 50;
			fy = 50;
			zoom = 100;
		};
		img.src = previewSrc;
	}

	let saving = $state(false);
</script>

<svelte:head>
	<title>Edit project — studio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page-heading">
	<a class="back" href="/studio"><Icon name="arrow-left" /> Library</a>
	<h1>Edit <span data-highlight>project.</span></h1>
	<p class="lead">
		{entry.pub_version !== null
			? 'This project is live. Saving changes the private draft; republish replaces the public page.'
			: 'Saved work stays private until you preview and publish it.'}
	</p>
</div>

<form class="studio-form" method="POST" action="?/save" enctype="multipart/form-data" use:enhance>
	<input type="hidden" name="expectedVersion" value={data.version} />
	<input type="hidden" name="crop" value={cropRect ? JSON.stringify(cropRect) : ''} />
	<input type="hidden" name="removePhoto" value={removePhoto ? '1' : ''} />

	{#if form?.message}
		<p class="form-error" role="alert">{form.message}</p>
	{:else if form?.saved}
		<p class="form-success" role="status">
			Saved as draft version {form.version}. <a href="/studio/projects/{entry.id}/preview">Preview it</a>
		</p>
	{/if}

	<div class="field">
		<label for="title">Title</label>
		<input id="title" name="title" type="text" bind:value={title} maxlength="200" required />
		{#if form?.field === 'title'}<span class="field-error">{form.message}</span>{/if}
	</div>

	<div class="field">
		<label for="url">Website link</label>
		<input
			id="url"
			name="url"
			type="url"
			bind:value={url}
			placeholder="https://example.com"
			inputmode="url"
		/>
		<span class="hint">Full http(s) URL of the project site. It is checked, never fetched.</span>
		{#if form?.field === 'url'}<span class="field-error">{form.message}</span>{/if}
	</div>

	<div class="field">
		<label for="description">Short description</label>
		<textarea id="description" name="description" bind:value={description} maxlength="2000" style="min-height:110px; font-family: system-ui"></textarea>
		{#if form?.field === 'description'}<span class="field-error">{form.message}</span>{/if}
	</div>

	<fieldset class="field" style="border:0; padding:0; margin:0 0 18px">
		<legend style="font: 21px var(--hand); margin-bottom: 8px">Photo (optional)</legend>
		{#if previewSrc && !removePhoto}
			<div class="crop-preview" aria-label="Photo framing preview">
				<img src={previewSrc} alt="Photo framing preview" style={previewStyle} />
			</div>
			<div class="crop-controls">
				<label for="crop-x">Horizontal focus</label>
				<input id="crop-x" type="range" min="0" max="100" bind:value={fx} />
				<label for="crop-y">Vertical focus</label>
				<input id="crop-y" type="range" min="0" max="100" bind:value={fy} />
				<label for="crop-zoom">Zoom</label>
				<input id="crop-zoom" type="range" min="100" max="400" step="5" bind:value={zoom} />
			</div>
			<p class="hint">The 3:2 thumbnail keeps this framing exactly, on preview and publish.</p>
		{/if}
		<div style="margin-top: 10px; display: flex; gap: 12px; flex-wrap: wrap">
			<input
				bind:this={fileInput}
				id="photo"
				name="photo"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				aria-label="Upload a project photo (JPEG, PNG or WebP, up to 10 MiB)"
				onchange={onFileChange}
			/>
			{#if previewSrc}
				<button
					type="button"
					class="danger"
					onclick={() => {
						removePhoto = true;
						if (fileInput) fileInput.value = '';
					}}>Remove photo</button
				>
			{/if}
		</div>
		{#if form?.field === 'photo'}<span class="field-error">{form.message}</span>{/if}
	</fieldset>

	<div class="field">
		<label for="alt">Photo description (alt text)</label>
		<input id="alt" name="alt" type="text" bind:value={alt} maxlength="500" />
		<span class="hint">What someone using a screen reader should know about the photo.</span>
	</div>

	<div class="field">
		<label for="caseStudy">Case study (optional Markdown)</label>
		<textarea id="caseStudy" name="caseStudy" bind:value={caseStudy}></textarea>
		<span class="hint">Quick-add projects do not need this. Image references must be notebook uploads.</span>
	</div>

	<div class="form-row">
		<button type="submit" class="primary-btn" disabled={saving} onclick={() => (saving = true)}>
			Save draft
		</button>
		<a class="action" href="/studio/projects/{entry.id}/preview">Preview</a>
		<span class="muted" style="font-size: 13px">Draft version {data.version}</span>
	</div>
</form>
