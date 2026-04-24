<script
  module
  lang="ts"
>
  import type { SuperForm } from 'sveltekit-superforms';

  export interface FormControlProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    superform: SuperForm<any, any>;
    field: string;
    label: string;
    id?: string;
  }
</script>

<script lang="ts">
  import { untrack, type Snippet } from 'svelte';

  interface Props extends FormControlProps {
    children: Snippet;
  }

  let { superform, field, label, id = field, children }: Props = $props();

  let { errors, constraints } = untrack(() => superform);

  // Extract constraint to bypass TS union with Partial<{}>
  let isRequired = $derived(!!($constraints[field] as Record<string, unknown>)?.required);
</script>

<div class="form-control">
  <label
    class="label"
    for={id}
  >
    <span class="label-text"
      >{label}
      {#if isRequired}
        <span class="text-error">*</span>
      {/if}</span
    >
  </label>

  {@render children()}

  {#if $errors[field]}
    <p class="text-error mt-1 text-sm">{$errors[field]}</p>
  {/if}
</div>
