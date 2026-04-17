import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
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

  if (!post) {
    error(404, 'Post not found');
  }

  return { post };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const fd = await request.formData();
    const raw = {
      title: (fd.get('title') ?? '') as string,
      body: (fd.get('body') as string) || undefined,
      status: (fd.get('status') ?? 'draft') as string,
    };

    const result = updatePostSchema.safeParse(raw);
    if (!result.success) {
      return fail(422, {
        action: 'update' as const,
        success: false as const,
        errors: z.flattenError(result.error).fieldErrors as Record<string, string[]>,
        values: { title: raw.title, body: raw.body ?? '', status: raw.status },
      });
    }

    await db
      .update(posts)
      .set({
        title: result.data.title,
        body: result.data.body ?? null,
        status: result.data.status,
      })
      .where(eq(posts.id, params.id));

    throw redirect(303, '/demo/posts');
  },
};
