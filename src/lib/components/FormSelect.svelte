<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import FormControl, { type FormControlProps } from './FormControl.svelte';

  interface Props extends FormControlProps {
    children: Snippet;
  }

  let { superform, field, label, id = field, children }: Props = $props();

  let { form: formData, errors, constraints } = untrack(() => superform);
</script>

<FormControl
  {superform}
  {field}
  {label}
  {id}
>
  <select
    {id}
    name={field}
    bind:value={$formData[field]}
    aria-invalid={$errors[field] ? 'true' : undefined}
    class="select select-bordered w-full"
    class:select-error={!!$errors[field]}
    {...$constraints[field]}
  >
    {@render children()}
  </select>
</FormControl>
