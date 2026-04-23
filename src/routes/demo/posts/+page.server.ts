import { fail } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { createPostSchema, updateStatusSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      status: posts.status,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .orderBy(desc(posts.createdAt));

  const [createForm, updateStatusForm] = await Promise.all([
    superValidate(zod4(createPostSchema)),
    superValidate(zod4(updateStatusSchema)),
  ]);

  return { posts: allPosts, createForm, updateStatusForm };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const form = await superValidate(request, zod4(createPostSchema));
    if (!form.valid) return fail(400, { form });

    await db.insert(posts).values({
      title: form.data.title,
      body: form.data.body,
      status: form.data.status,
    });

    return message(form, 'Post created!');
  },

  updateStatus: async ({ request }) => {
    const form = await superValidate(request, zod4(updateStatusSchema));
    if (!form.valid) return fail(400, { form });

    const updated = await db
      .update(posts)
      .set({ status: form.data.status })
      .where(eq(posts.id, form.data.id))
      .returning({ id: posts.id });

    if (updated.length === 0) {
      return setError(form, 'id', 'Post not found.');
    }

    return { form };
  },
};
