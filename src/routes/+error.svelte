<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4">
  <div class="text-center">
    <div class="text-base-content/20 mb-4 text-8xl font-bold">
      {page.status}
    </div>
    <h1 class="mb-2 text-2xl font-bold">
      {page.status === 404 ? 'Page not found' : 'Something went wrong'}
    </h1>
    <p class="text-base-content/60 mb-8">
      {page.error?.message ?? 'An unexpected error occurred.'}
    </p>
    <a
      href={resolve('/')}
      class="btn btn-primary">Back to home</a
    >
  </div>
</div>
