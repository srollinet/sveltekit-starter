import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { csp } from '@nosecone/sveltekit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: csp({
      mode: 'nonce',
      directives: {
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    }),
    experimental: {
      tracing: {
        server: true,
      },
      instrumentation: {
        server: true,
      },
    },
  },
};

export default config;
