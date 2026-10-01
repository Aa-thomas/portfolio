import adapter from '@sveltejs/adapter-node';
import adapterNetlify from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Netlify sets NETLIFY during its build, so the same repository builds with
// the Netlify adapter there and the self-hosting node adapter everywhere else
// (local production runs and the e2e smoke test use `node build`).
const onNetlify = !!process.env.NETLIFY;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: onNetlify ? adapterNetlify() : adapter(),
		csrf: {
			// Blocks cross-origin form submissions so a foreign page cannot spend
			// the owner's session cookie on a mutation (SC-02).
			checkOrigin: true
		}
	}
};

export default config;
