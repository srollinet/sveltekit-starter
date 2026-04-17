<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<div class="container mx-auto space-y-4 p-6">
  <h1 class="text-2xl font-bold">Demo</h1>
  <ul class="menu bg-base-200 rounded-box w-56">
    <li><a href={resolve('/demo/posts')}>Posts (Drizzle + Zod)</a></li>
    <li><a href={resolve('/demo/playwright')}>Playwright</a></li>
  </ul>
</div>
