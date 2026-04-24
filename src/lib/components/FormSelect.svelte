<script
  lang="ts"
  generics="T extends Record<string, unknown>, Path extends FormPathLeaves<T>"
>
  import { untrack, type Snippet } from 'svelte';
  import type { FormPathLeaves } from 'sveltekit-superforms';
  import { formFieldProxy } from 'sveltekit-superforms';
  import FormControl, { type FormFieldProps } from './FormControl.svelte';

  interface Props extends FormFieldProps<T, Path> {
    children: Snippet;
  }

  let { superform, field, label, id = field as string, children }: Props = $props();

  const { value, errors, constraints } = formFieldProxy(
    untrack(() => superform),
    untrack(() => field),
  );
</script>

<FormControl
  {label}
  {id}
  error={$errors}
  required={$constraints?.required}
>
  <select
    {id}
    name={field as string}
    bind:value={$value}
    aria-invalid={$errors ? 'true' : undefined}
    class="select select-bordered w-full"
    class:select-error={!!$errors}
    {...$constraints}
  >
    {@render children()}
  </select>
</FormControl>
