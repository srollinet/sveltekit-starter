import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
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
  return { posts: allPosts };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const fd = await request.formData();
    const raw = {
      title: (fd.get('title') ?? '') as string,
      body: (fd.get('body') as string) || undefined,
      status: (fd.get('status') ?? 'draft') as string,
    };

    const result = createPostSchema.safeParse(raw);
    if (!result.success) {
      return fail(422, {
        action: 'create' as const,
        success: false as const,
        errors: z.flattenError(result.error).fieldErrors as Record<string, string[]>,
        values: { title: raw.title, body: raw.body ?? '', status: raw.status },
      });
    }

    await db.insert(posts).values({
      title: result.data.title,
      body: result.data.body ?? null,
      status: result.data.status,
    });

    return { action: 'create' as const, success: true as const };
  },

  updateStatus: async ({ request }) => {
    const fd = await request.formData();
    const raw = {
      id: (fd.get('id') ?? '') as string,
      status: (fd.get('status') ?? '') as string,
    };

    const result = updateStatusSchema.safeParse(raw);
    if (!result.success) {
      return fail(422, {
        action: 'updateStatus' as const,
        success: false as const,
        errors: z.flattenError(result.error).fieldErrors as Record<string, string[]>,
      });
    }

    const updated = await db
      .update(posts)
      .set({ status: result.data.status })
      .where(eq(posts.id, result.data.id))
      .returning({ id: posts.id });

    if (updated.length === 0) {
      return fail(404, {
        action: 'updateStatus' as const,
        success: false as const,
        errors: { id: ['Post not found'] } as Record<string, string[]>,
      });
    }

    return { action: 'updateStatus' as const, success: true as const };
  },
};
