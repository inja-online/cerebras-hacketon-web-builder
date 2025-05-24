import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ["/*"],
				exclude: ["<all>"],
			},
			platformProxy: {
				configPath: "wrangler.toml",
				environment: undefined,
				experimentalJsonConfig: false,
				persist: false,
			},
		}),


		prerender: {
			entries: ["/"],
		},
		csp: { mode: "auto" },
	}
};

export default config;
