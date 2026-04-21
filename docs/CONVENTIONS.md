# Conventions

## TypeScript

- Strict mode is enabled — no implicit `any`, no unchecked nulls.
- Use explicit return types on exported functions.

## Validation with Zod

Always validate user input with Zod on **both** client and server.

- Keep the schemas close to their usage.
- Always use `schema.safeParse()` to show field-level errors without throwing.

```ts
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
});
```

## DTOs — never send DB entities to the client

Raw Drizzle table rows must never be returned from `load` functions or API routes. Always project only the fields the client needs.

```ts
// Bad
return { post };

// Good — select only what the client needs
const post = await db.select({ id: posts.id, title: posts.title }).from(posts).where(...);
return { post };
```

See [DATABASE.md](DATABASE.md) for query patterns.

## Frontend — DaisyUI

- Use [DaisyUI](https://daisyui.com) components for all UI (buttons, cards, forms, modals, etc.).
- Rely on Tailwind utility classes for layout and spacing.
- Avoid writing custom CSS unless there is no DaisyUI/Tailwind alternative.
- Never use inline `style` attributes.

## Code quality

- Keep implementation simple — avoid over-engineering and premature abstractions.
- Add comments only when the _why_ is non-obvious; use good naming instead of inline documentation.
- Write testable code: pure functions, small components, injected dependencies.
- Keep related stuff in same file, unless used at multiple places; split code when a file grows complex.
- Run `pnpm lint` and `pnpm check` before committing.
