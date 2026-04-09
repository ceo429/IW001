import { z } from 'zod';

/**
 * Announcement (공지사항) DTOs.
 *
 * The `pinned` flag sticks an announcement to the top of the list. In
 * a larger rollout we'd also add an expiry timestamp, but the spec §4.2
 * doesn't mention one and it's cheap to add later.
 */

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  pinned: z.boolean().default(false),
});
export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementSchema>;
