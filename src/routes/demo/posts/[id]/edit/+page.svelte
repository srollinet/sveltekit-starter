<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { z } from 'zod';
  import { updatePostSchema, postStatusValues } from '../../schema';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // untrack: capturing initial values from data intentionally for form editing
  let title = $state(untrack(() => data.post.title));
  let body = $state(untrack(() => data.post.body ?? ''));
  let status = $state(untrack(() => data.post.status));
  let updateErrors = $state<Record<string, string[] | undefined>>({});

  function getUpdateError(field: string): string | undefined {
    if (updateErrors[field]?.length) return updateErrors[field]![0];
    // Fallback to server errors for progressive enhancement (no-JS)
    if (form && 'errors' in form) {
      const errors = (form as { errors?: Record<string, string[] | undefined> }).errors;
      return errors?.[field]?.[0];
    }
    return undefined;
  }
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
        use:enhance={({ cancel }) => {
          const result = updatePostSchema.safeParse({
            title,
            body: body || undefined,
            status,
          });
          if (!result.success) {
            updateErrors = z.flattenError(result.error).fieldErrors as Record<string, string[]>;
            cancel();
            return;
          }
          updateErrors = {};

          return async ({ result: actionResult, update }) => {
            if (actionResult.type === 'failure') {
              const d = actionResult.data as { errors?: Record<string, string[]> };
              updateErrors = d?.errors ?? {};
            }
            await update();
          };
        }}
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
            bind:value={title}
            class="input input-bordered w-full"
            class:input-error={!!getUpdateError('title')}
            placeholder="Post title"
          />
          {#if getUpdateError('title')}
            <p class="text-error mt-1 text-sm">{getUpdateError('title')}</p>
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
            bind:value={body}
            class="textarea textarea-bordered w-full"
            rows="6"
            placeholder="Post content (optional)"
          ></textarea>
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
            bind:value={status}
            class="select select-bordered w-full"
          >
            {#each postStatusValues as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
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
