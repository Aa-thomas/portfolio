import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Keep the Blobs SDK external so it ships as a function dependency
		// (node_modules in the deployed bundle) and the Netlify runtime can
		// auto-configure the store connection. Bundling it in hides it from
		// the runtime's dependency detection.
		external: ['@netlify/blobs']
	}
});
