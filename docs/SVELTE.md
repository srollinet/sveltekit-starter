# Svelte

## MCP Server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Svelte 5 Runes

This project uses Svelte 5 with the Runes API. Always use runes — never the legacy `$:` reactive syntax.

| Rune         | Purpose               |
| ------------ | --------------------- |
| `$state()`   | Reactive state        |
| `$props()`   | Typed component props |
| `$derived()` | Computed values       |
| `$effect()`  | Side effects          |

```svelte
<script lang="ts">
  interface Props {
    label: string;
  }

  let { label }: Props = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

## SvelteKit conventions

- Use `+page.svelte`, `+page.server.ts`, `+layout.svelte`, `+server.ts` file conventions.
- Type server load functions with `./$types` (`PageServerLoad`, `RequestHandler`).
- Return plain serializable objects from `load` — never class instances or DB rows directly (see [docs/DATABASE.md](DATABASE.md)).
