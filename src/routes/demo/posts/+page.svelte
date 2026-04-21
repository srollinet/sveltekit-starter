<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { z } from 'zod';
  import { createPostSchema, postStatusValues } from './schema';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let title = $state('');
  let body = $state('');
  let status = $state('draft');
  let createErrors = $state<Record<string, string[] | undefined>>({});

  function getCreateError(field: string): string | undefined {
    if (createErrors[field]?.length) return createErrors[field]![0];
    // Fallback to server errors for progressive enhancement (no-JS)
    if (form && 'action' in form && form.action === 'create' && 'errors' in form) {
      const errors = (form as { errors?: Record<string, string[] | undefined> }).errors;
      return errors?.[field]?.[0];
    }
    return undefined;
  }

  const statusBadgeClass: Record<string, string> = {
    draft: 'badge-warning',
    published: 'badge-success',
    archived: 'badge-ghost',
  };
</script>

<div class="container mx-auto space-y-8 p-6">
  <h1 class="text-2xl font-bold">Posts</h1>

  <!-- Create Form -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title">New Post</h2>

      {#if form?.action === 'create' && form?.success}
        <div class="alert alert-success mb-2">Post created successfully!</div>
      {/if}

      <form
        method="POST"
        action="?/create"
        class="space-y-4"
        use:enhance={({ cancel }) => {
          const result = createPostSchema.safeParse({
            title,
            body: body || undefined,
            status,
          });
          if (!result.success) {
            createErrors = z.flattenError(result.error).fieldErrors as Record<string, string[]>;
            cancel();
            return;
          }
          createErrors = {};

          return async ({ result: actionResult, update }) => {
            if (actionResult.type === 'failure') {
              const d = actionResult.data as { errors?: Record<string, string[]> };
              createErrors = d?.errors ?? {};
            } else {
              title = '';
              body = '';
              status = 'draft';
              createErrors = {};
            }
            await update();
          };
        }}
      >
        <div class="form-control">
          <label
            class="label"
            for="create-title"
          >
            <span class="label-text">Title <span class="text-error">*</span></span>
          </label>
          <input
            id="create-title"
            name="title"
            type="text"
            bind:value={title}
            class="input input-bordered w-full"
            class:input-error={!!getCreateError('title')}
            placeholder="Post title"
          />
          {#if getCreateError('title')}
            <p class="text-error mt-1 text-sm">{getCreateError('title')}</p>
          {/if}
        </div>

        <div class="form-control">
          <label
            class="label"
            for="create-body"
          >
            <span class="label-text">Body</span>
          </label>
          <textarea
            id="create-body"
            name="body"
            bind:value={body}
            class="textarea textarea-bordered w-full"
            rows="4"
            placeholder="Post content (optional)"
          ></textarea>
        </div>

        <div class="form-control">
          <label
            class="label"
            for="create-status"
          >
            <span class="label-text">Status</span>
          </label>
          <select
            id="create-status"
            name="status"
            bind:value={status}
            class="select select-bordered w-full"
          >
            {#each postStatusValues as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
        </div>

        <div class="card-actions justify-end">
          <button
            type="submit"
            class="btn btn-primary">Create Post</button
          >
        </div>
      </form>
    </div>
  </div>

  <!-- Posts List -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title">All Posts</h2>

      {#if data.posts.length === 0}
        <p class="text-base-content/60">No posts yet. Create one above!</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="table-zebra table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Change Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each data.posts as post (post.id)}
                <tr>
                  <td class="font-medium">{post.title}</td>
                  <td>
                    <span class="badge capitalize {statusBadgeClass[post.status] ?? 'badge-ghost'}">
                      {post.status}
                    </span>
                  </td>
                  <td>
                    <form
                      method="POST"
                      action="?/updateStatus"
                      use:enhance
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={post.id}
                      />
                      <select
                        name="status"
                        class="select select-sm select-bordered"
                        onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
                      >
                        {#each postStatusValues as s (s)}
                          <option
                            value={s}
                            selected={s === post.status}>{s}</option
                          >
                        {/each}
                      </select>
                    </form>
                  </td>
                  <td class="text-base-content/60 text-sm">
                    {post.createdAt.toLocaleDateString()}
                  </td>
                  <td>
                    <a
                      href={resolve(`/demo/posts/${post.id}/edit`)}
                      class="btn btn-outline btn-sm"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>
