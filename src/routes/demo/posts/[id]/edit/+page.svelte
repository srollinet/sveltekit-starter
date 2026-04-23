<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { updatePostSchema, postStatusValues } from '../../schema';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const { form, errors, constraints, enhance } = superForm(
    untrack(() => data.form),
    {
      validators: zod4(updatePostSchema),
    },
  );
</script>

<div class="container mx-auto max-w-2xl p-6">
  <div class="mb-6 flex items-center gap-3">
    <a
      href={resolve('/demo/posts')}
      class="btn btn-ghost btn-sm">← Back to Posts</a
    >
    <h1 class="text-2xl font-bold">Edit Post</h1>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <form
        method="POST"
        action="?/update"
        class="space-y-4"
        use:enhance
      >
        <div class="form-control">
          <label
            class="label"
            for="edit-title"
          >
            <span class="label-text">Title <span class="text-error">*</span></span>
          </label>
          <input
            id="edit-title"
            name="title"
            type="text"
            bind:value={$form.title}
            aria-invalid={$errors.title ? 'true' : undefined}
            class="input input-bordered w-full"
            class:input-error={!!$errors.title}
            placeholder="Post title"
            {...$constraints.title}
          />
          {#if $errors.title}
            <p class="text-error mt-1 text-sm">{$errors.title}</p>
          {/if}
        </div>

        <div class="form-control">
          <label
            class="label"
            for="edit-body"
          >
            <span class="label-text">Body</span>
          </label>
          <textarea
            id="edit-body"
            name="body"
            bind:value={$form.body}
            aria-invalid={$errors.body ? 'true' : undefined}
            class="textarea textarea-bordered w-full"
            class:textarea-error={!!$errors.body}
            rows="6"
            placeholder="Post content (optional)"
            {...$constraints.body}
          ></textarea>
          {#if $errors.body}
            <p class="text-error mt-1 text-sm">{$errors.body}</p>
          {/if}
        </div>

        <div class="form-control">
          <label
            class="label"
            for="edit-status"
          >
            <span class="label-text">Status</span>
          </label>
          <select
            id="edit-status"
            name="status"
            bind:value={$form.status}
            aria-invalid={$errors.status ? 'true' : undefined}
            class="select select-bordered w-full"
            class:select-error={!!$errors.status}
            {...$constraints.status}
          >
            {#each postStatusValues as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
          {#if $errors.status}
            <p class="text-error mt-1 text-sm">{$errors.status}</p>
          {/if}
        </div>

        <div class="card-actions justify-between">
          <a
            href={resolve('/demo/posts')}
            class="btn btn-ghost">Cancel</a
          >
          <button
            type="submit"
            class="btn btn-primary">Save Changes</button
          >
        </div>
      </form>
    </div>
  </div>
</div>
