# Superforms + Zod 4 Reference

Adapter: `zod4` from `sveltekit-superforms/adapters`. Always use `zod4`, not `zod`.

---

## Complete minimal example

### `+page.server.ts`

```ts
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

// Define schema at module level (required for adapter caching)
const schema = z.object({
  name: z.string().min(2),
  email: z.email(),
});

export const load = async () => {
  const form = await superValidate(zod4(schema));
  return { form }; // always return { form }
};

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4(schema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Custom server-side error after validation
    // if (emailExists) return setError(form, 'email', 'Already taken.');

    return message(form, 'Saved!');
  },
};
```

### `+page.svelte`

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { superForm } from 'sveltekit-superforms';

  let { data } = $props();

  const { form, errors, constraints, message, enhance } = superForm(untrack(() => data.form));
</script>

{#if $message}<p>{$message}</p>{/if}

<form
  method="POST"
  use:enhance
>
  <label>
    Name
    <input
      name="name"
      bind:value={$form.name}
      aria-invalid={$errors.name ? 'true' : undefined}
      {...$constraints.name}
    />
    {#if $errors.name}<span>{$errors.name}</span>{/if}
  </label>

  <label>
    Email
    <input
      type="email"
      name="email"
      bind:value={$form.email}
      aria-invalid={$errors.email ? 'true' : undefined}
      {...$constraints.email}
    />
    {#if $errors.email}<span>{$errors.email}</span>{/if}
  </label>

  <button>Submit</button>
</form>
```

---

## Key rules

- **Schema must be defined at module level**, not inside `load`.
- **Always `return { form }`** in every code path of `load` and actions (unless using `redirect`/`error`).
- **`name` attribute is required** on every input field.
- `use:enhance` enables progressive enhancement and unlocks client features (auto focus on error, events, etc.).
- `$constraints` spreads native HTML validation attributes (`required`, `minlength`, etc.) from the schema.

---

## Populating form from existing data (edit forms)

```ts
export const load = async ({ params }) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, params.id) });
  if (!user) error(404);

  const form = await superValidate(user, zod4(schema));
  return { form };
};
```

Errors are shown when form is populated with data. To suppress them on load: `superValidate(data, zod4(schema), { errors: false })`.

---

## Status messages

```ts
// server: success
return message(form, 'Saved!');

// server: failure with HTTP status
return message(form, 'Forbidden', { status: 403 });
```

```svelte
<!-- client -->
{#if $message}<div>{$message}</div>{/if}
```

> `message` on failure returns `fail(status, { form })` automatically.
> Messages are lost on redirect — use [sveltekit-flash-message](https://superforms.rocks/flash-messages) for redirect-safe messages.

---

## `setError` (post-validation server errors)

```ts
// Sets a field error and returns fail(400, { form })
return setError(form, 'email', 'Email already exists.');
```

For nested fields: `setError(form, 'address.city', 'Invalid city.')`.

---

## Form-level errors (cross-field validation)

Use Zod `.refine()` on the schema:

```ts
const schema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ['confirm'], // attaches to specific field; omit for form-level
  });
```

Form-level errors (no path) are in `$errors._errors`. Array errors in `$errors.fieldName._errors`.

---

## Useful `superForm` options

```ts
// You can use untrack(() => data.form) to suppress compiler warnings
const { form, errors, enhance } = superForm(
  untrack(() => data.form),
  {
    // Run client-side validation with the same schema
    validators: zod4(schema),

    // What to clear on submit (default: 'message')
    clearOnSubmit: 'errors-and-message',

    // Prevent double-submit (default: 'prevent')
    multipleSubmits: 'prevent', // | 'abort' | 'allow'

    // After successful update
    onUpdated({ form }) {
      if (form.valid) toast(form.message);
    },

    // On server error
    onError({ result }) {
      console.error(result.error.message);
    },
  },
);
```

---

## Reusable Form Controls

For simple cases, use the pre-built wrapper components (`FormTextInput`, `FormTextArea`, `FormSelect`) to avoid boilerplate. These components automatically handle labels, validation errors, and the "required" asterisk by reading the schema constraints.

To use them, keep a reference to the main `superForm` instance instead of destructuring everything immediately:

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { superForm } from 'sveltekit-superforms';
  import FormTextInput from '$lib/components/FormTextInput.svelte';

  let { data } = $props();

  // 1. Keep the main instance
  const myForm = superForm(untrack(() => data.form));

  // 2. Destructure what you need directly
  const { enhance, message } = myForm;
</script>

<form
  method="POST"
  use:enhance
>
  <!-- Pass the main instance and the field name -->
  <FormTextInput
    superform={myForm}
    field="email"
    label="Email Address"
    type="email"
  />

  <button>Submit</button>
</form>
```

Available components in `$lib/components/`:

- `<FormTextInput {superform} field="..." label="..." type="..." id="..." placeholder="..." />`
- `<FormTextArea {superform} field="..." label="..." rows={4} id="..." placeholder="..." />`
- `<FormSelect {superform} field="..." label="..." id="...">` (requires `<option>` children)

---

## Debugging

```svelte
<script lang="ts">
  import SuperDebug from 'sveltekit-superforms';
</script>

<SuperDebug data={$form} />
```

---

## Advanced topics

| Topic                                       | Link                                                |
| ------------------------------------------- | --------------------------------------------------- |
| Nested objects/arrays                       | https://superforms.rocks/concepts/nested-data       |
| Multiple forms on one page                  | https://superforms.rocks/concepts/multiple-forms    |
| File uploads                                | https://superforms.rocks/concepts/files             |
| Events (`onSubmit`, `onResult`, `onUpdate`) | https://superforms.rocks/concepts/events            |
| Client-side validation                      | https://superforms.rocks/concepts/client-validation |
| Tainted field detection                     | https://superforms.rocks/concepts/tainted           |
| SPA mode (no server)                        | https://superforms.rocks/concepts/spa               |
| Full CRUD tutorial                          | https://superforms.rocks/crud                       |
| API reference                               | https://superforms.rocks/api                        |
