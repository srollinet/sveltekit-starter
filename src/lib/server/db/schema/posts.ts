import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);

export const posts = pgTable('posts', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  title: text('title').notNull(),
  body: text('body'),
  status: postStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
