import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// Blocks cross-origin form submissions so a foreign page cannot spend
			// the owner's session cookie on a mutation (SC-02).
			checkOrigin: true
		}
	}
};

export default config;
