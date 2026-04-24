<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { superForm } from 'sveltekit-superforms';
  import { zod4 } from 'sveltekit-superforms/adapters';
  import { updatePostSchema, postStatusValues } from '../../schema';
  import type { PageData } from './$types';

  import FormTextInput from '$lib/components/FormTextInput.svelte';
  import FormTextArea from '$lib/components/FormTextArea.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';

  let { data }: { data: PageData } = $props();

  const editSuperForm = superForm(
    untrack(() => data.form),
    {
      validators: zod4(updatePostSchema),
    },
  );

  const { enhance } = editSuperForm;
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
        <FormTextInput
          superform={editSuperForm}
          field="title"
          id="edit-title"
          label="Title"
          placeholder="Post title"
        />

        <FormTextArea
          superform={editSuperForm}
          field="body"
          id="edit-body"
          label="Body"
          rows={6}
          placeholder="Post content (optional)"
        />

        <FormSelect
          superform={editSuperForm}
          field="status"
          id="edit-status"
          label="Status"
        >
          {#each postStatusValues as s (s)}
            <option value={s}>{s}</option>
          {/each}
        </FormSelect>

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
