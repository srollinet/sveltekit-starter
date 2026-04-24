<script
  lang="ts"
  generics="T extends Record<string, unknown>, Path extends FormPathLeaves<T>"
>
  import { untrack } from 'svelte';
  import type { FormPathLeaves } from 'sveltekit-superforms';
  import { formFieldProxy } from 'sveltekit-superforms';
  import FormControl, { type FormFieldProps } from './FormControl.svelte';

  interface Props extends FormFieldProps<T, Path> {
    type?: string;
    placeholder?: string;
  }

  let { superform, field, label, id = field as string, type = 'text', placeholder = '' }: Props = $props();

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
  <input
    {id}
    name={field as string}
    {type}
    bind:value={$value}
    aria-invalid={$errors ? 'true' : undefined}
    class="input input-bordered w-full"
    class:input-error={!!$errors}
    {placeholder}
    {...$constraints}
  />
</FormControl>
