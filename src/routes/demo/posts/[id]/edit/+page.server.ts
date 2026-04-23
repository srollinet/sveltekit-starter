import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { updatePostSchema } from '../../schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, params.id))
    .limit(1);

  if (!post) error(404, 'Post not found');

  const form = await superValidate(
    { title: post.title, body: post.body ?? '', status: post.status },
    zod4(updatePostSchema),
    { errors: false },
  );

  return { form };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const form = await superValidate(request, zod4(updatePostSchema));
    if (!form.valid) return fail(400, { form });

    await db
      .update(posts)
      .set({
        title: form.data.title,
        body: form.data.body,
        status: form.data.status,
      })
      .where(eq(posts.id, params.id));

    redirect(303, '/demo/posts');
  },
};
