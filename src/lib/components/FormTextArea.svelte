<script lang="ts">
  import { untrack } from 'svelte';
  import FormControl, { type FormControlProps } from './FormControl.svelte';

  interface Props extends FormControlProps {
    rows?: number;
    placeholder?: string;
  }

  let { superform, field, label, id = field, rows = 4, placeholder = '' }: Props = $props();

  let { form: formData, errors, constraints } = untrack(() => superform);
</script>

<FormControl
  {superform}
  {field}
  {label}
  {id}
>
  <textarea
    {id}
    name={field}
    bind:value={$formData[field]}
    aria-invalid={$errors[field] ? 'true' : undefined}
    class="textarea textarea-bordered w-full"
    class:textarea-error={!!$errors[field]}
    {rows}
    {placeholder}
    {...$constraints[field]}
  ></textarea>
</FormControl>
