<script lang="ts">
  import { untrack } from 'svelte';
  import FormControl, { type FormControlProps } from './FormControl.svelte';

  interface Props extends FormControlProps {
    type?: string;
    placeholder?: string;
  }

  let { superform, field, label, id = field, type = 'text', placeholder = '' }: Props = $props();

  let { form: formData, errors, constraints } = untrack(() => superform);
</script>

<FormControl
  {superform}
  {field}
  {label}
  {id}
>
  <input
    {id}
    name={field}
    {type}
    bind:value={$formData[field]}
    aria-invalid={$errors[field] ? 'true' : undefined}
    class="input input-bordered w-full"
    class:input-error={!!$errors[field]}
    {placeholder}
    {...$constraints[field]}
  />
</FormControl>
