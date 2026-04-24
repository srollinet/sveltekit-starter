<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { createPostSchema, postStatusValues } from './schema';
  import type { PageData } from './$types';

  import FormTextInput from '$lib/components/forms/FormTextInput.svelte';
  import FormTextArea from '$lib/components/forms/FormTextArea.svelte';
  import FormSelect from '$lib/components/forms/FormSelect.svelte';

  let { data }: { data: PageData } = $props();

  const createSuperForm = superForm(
    untrack(() => data.createForm),
    {
      validators: zod4(createPostSchema),
      resetForm: true,
    },
  );

  const { message: createMessage, enhance: createEnhance } = createSuperForm;

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
        <FormTextInput
          superform={createSuperForm}
          field="title"
          id="create-title"
          label="Title"
          placeholder="Post title"
        />

        <FormTextArea
          superform={createSuperForm}
          field="body"
          id="create-body"
          label="Body"
          placeholder="Post content (optional)"
        />

        <FormSelect
          superform={createSuperForm}
          field="status"
          id="create-status"
          label="Status"
        >
          {#each postStatusValues as s (s)}
            <option value={s}>{s}</option>
          {/each}
        </FormSelect>

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
