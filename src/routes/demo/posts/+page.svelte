<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { createPostSchema, postStatusValues } from './schema';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const {
    form: createData,
    errors: createErrors,
    constraints: createConstraints,
    message: createMessage,
    enhance: createEnhance,
  } = superForm(
    untrack(() => data.createForm),
    {
      validators: zod4(createPostSchema),
      resetForm: true,
    },
  );

  const { enhance: updateStatusEnhance } = superForm(untrack(() => data.updateStatusForm));
  const { enhance: deleteEnhance } = superForm(
    untrack(() => data.deleteForm),
    {
      onSubmit({ cancel }) {
        if (!confirm('Are you sure you want to delete this post?')) {
          cancel();
        }
      },
    },
  );

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

      {#if $createMessage}
        <div class="alert alert-success mb-2">{$createMessage}</div>
      {/if}

      <form
        method="POST"
        action="?/create"
        class="space-y-4"
        use:createEnhance
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
            bind:value={$createData.title}
            aria-invalid={$createErrors.title ? 'true' : undefined}
            class="input input-bordered w-full"
            class:input-error={!!$createErrors.title}
            placeholder="Post title"
            {...$createConstraints.title}
          />
          {#if $createErrors.title}
            <p class="text-error mt-1 text-sm">{$createErrors.title}</p>
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
            bind:value={$createData.body}
            aria-invalid={$createErrors.body ? 'true' : undefined}
            class="textarea textarea-bordered w-full"
            class:textarea-error={!!$createErrors.body}
            rows="4"
            placeholder="Post content (optional)"
            {...$createConstraints.body}
          ></textarea>
          {#if $createErrors.body}
            <p class="text-error mt-1 text-sm">{$createErrors.body}</p>
          {/if}
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
            bind:value={$createData.status}
            aria-invalid={$createErrors.status ? 'true' : undefined}
            class="select select-bordered w-full"
            class:select-error={!!$createErrors.status}
            {...$createConstraints.status}
          >
            {#each postStatusValues as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
          {#if $createErrors.status}
            <p class="text-error mt-1 text-sm">{$createErrors.status}</p>
          {/if}
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
                      use:updateStatusEnhance
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
                    <form
                      method="POST"
                      action="?/delete"
                      use:deleteEnhance
                      class="ml-2 inline-block"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={post.id}
                      />
                      <button class="btn btn-error btn-sm btn-outline">Delete</button>
                    </form>
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
