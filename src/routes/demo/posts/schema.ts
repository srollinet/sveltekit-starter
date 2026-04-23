import { z } from 'zod';

export const postStatusValues = ['draft', 'published', 'archived'] as const;

const postStatusEnum = z.enum(postStatusValues);

const postFields = {
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  body: z.string().trim().max(1000, 'Body must be 1000 characters or less'),
  status: postStatusEnum,
};

export const createPostSchema = z.object({
  ...postFields,
  status: postStatusEnum.default('draft'),
});

export const updatePostSchema = z.object(postFields);

export const updateStatusSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  status: postStatusEnum,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
