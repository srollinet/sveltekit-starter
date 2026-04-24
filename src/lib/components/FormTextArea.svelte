<script
  lang="ts"
  generics="T extends Record<string, unknown>, Path extends FormPathLeaves<T>"
>
  import { untrack } from 'svelte';
  import type { FormPathLeaves } from 'sveltekit-superforms';
  import { formFieldProxy } from 'sveltekit-superforms';
  import FormControl, { type FormFieldProps } from './FormControl.svelte';

  interface Props extends FormFieldProps<T, Path> {
    rows?: number;
    placeholder?: string;
  }

  let { superform, field, label, id = field as string, rows = 4, placeholder = '' }: Props = $props();

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
  <textarea
    {id}
    name={field as string}
    bind:value={$value}
    aria-invalid={$errors ? 'true' : undefined}
    class="textarea textarea-bordered w-full"
    class:textarea-error={!!$errors}
    {rows}
    {placeholder}
    {...$constraints}
  ></textarea>
</FormControl>
