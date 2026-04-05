<script lang="ts">
  const stackItems = [
    {
      title: 'SvelteKit 2',
      description: 'Full-stack meta-framework with file-based routing and SSR.',
      badge: 'Framework',
      badgeClass: 'badge-primary',
      ready: true,
    },
    {
      title: 'Svelte 5 (Runes)',
      description: 'Reactive UI with the new runes API — $state, $derived, $effect.',
      badge: 'UI',
      badgeClass: 'badge-primary',
      ready: true,
    },
    {
      title: 'TypeScript Strict',
      description: 'Strict mode enabled — catch type errors at compile time.',
      badge: 'Language',
      badgeClass: 'badge-secondary',
      ready: true,
    },
    {
      title: 'Tailwind CSS v4',
      description: 'Utility-first CSS with CSS-first config — no tailwind.config.js.',
      badge: 'Styling',
      badgeClass: 'badge-accent',
      ready: true,
    },
    {
      title: 'DaisyUI v5',
      description: 'Component classes built on Tailwind with light/dark theme support.',
      badge: 'Components',
      badgeClass: 'badge-accent',
      ready: true,
    },
    {
      title: 'adapter-node',
      description: 'Production-ready Node.js deployment for Docker and self-hosting.',
      badge: 'Deployment',
      badgeClass: 'badge-info',
      ready: true,
    },
    {
      title: 'PostgreSQL + Drizzle',
      description: 'Type-safe SQL database access with schema-as-code migrations.',
      badge: 'Phase 4',
      badgeClass: 'badge-ghost',
      ready: false,
    },
    {
      title: 'OpenTelemetry',
      description: 'Distributed tracing and metrics via Aspire Dashboard.',
      badge: 'Phase 5',
      badgeClass: 'badge-ghost',
      ready: false,
    },
  ] as const;
</script>

<div class="container mx-auto px-4 py-12">
  <div class="mb-10 text-center">
    <h1 class="mb-3 text-4xl font-bold">SvelteKit Battery-Included Starter</h1>
    <p class="text-base-content/70 text-lg">Everything pre-configured. Clone, run, build.</p>
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#each stackItems as item}
      <div class="card bg-base-100 border-base-200 border shadow-md">
        <div class="card-body">
          <div class="flex items-start justify-between gap-2">
            <h2 class="card-title text-base">{item.title}</h2>
            <span class="badge {item.badgeClass} badge-sm shrink-0">{item.badge}</span>
          </div>
          <p class="text-base-content/70 text-sm">{item.description}</p>
          {#if !item.ready}
            <div class="card-actions mt-2 justify-end">
              <span class="text-base-content/40 text-xs">Coming in a later phase</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
