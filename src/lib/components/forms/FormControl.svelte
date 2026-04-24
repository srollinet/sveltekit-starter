<script
  module
  lang="ts"
>
  import type { SuperForm, FormPathLeaves } from 'sveltekit-superforms';

  export interface FormFieldProps<T extends Record<string, unknown>, Path extends FormPathLeaves<T>> {
    superform: SuperForm<T, unknown>;
    field: Path;
    label: string;
    id?: string;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    id: string;
    error?: string[] | undefined;
    required?: boolean;
    children: Snippet;
  }

  let { label, id, error, required = false, children }: Props = $props();
</script>

<div class="form-control">
  <label
    class="label"
    for={id}
  >
    <span class="label-text"
      >{label}
      {#if required}
        <span class="text-error">*</span>
      {/if}</span
    >
  </label>

  {@render children()}

  {#if error}
    <p class="text-error mt-1 text-sm">{error}</p>
  {/if}
</div>
