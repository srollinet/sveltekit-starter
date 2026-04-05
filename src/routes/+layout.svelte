<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  let { children } = $props();
  let theme = $state('light');

  onMount(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    }
    document.documentElement.setAttribute('data-theme', theme);
  });

  $effect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
  }
</script>

<div class="drawer">
  <input id="nav-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
      <div class="navbar-start">
        <label for="nav-drawer" class="btn btn-ghost lg:hidden" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <a href="/" class="btn btn-ghost text-xl font-bold">SvelteKit Starter</a>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <li><a href="/">Home</a></li>
        </ul>
      </div>

      <div class="navbar-end">
        <button class="btn btn-ghost btn-circle" onclick={toggleTheme} aria-label="Toggle theme">
          {#if theme === 'light'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <main class="flex-1">
      {@render children()}
    </main>
  </div>

  <div class="drawer-side z-20">
    <label for="nav-drawer" aria-label="Close menu" class="drawer-overlay"></label>
    <ul class="menu bg-base-200 min-h-full w-64 p-4 gap-1">
      <li class="menu-title">Navigation</li>
      <li><a href="/">Home</a></li>
    </ul>
  </div>
</div>
