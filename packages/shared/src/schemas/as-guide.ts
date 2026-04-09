import { z } from 'zod';

/**
 * AS guide entry (기획서 §4.6.3) — 4-field knowledge base used by
 * engineers to look up symptom → root cause → action for a device type.
 *
 * deviceType is a free-string rather than a Prisma enum so operations can
 * add new device types without a schema migration (a common operational
 * need — new IoT hardware shows up faster than backend releases).
 */

export const deviceTypeSchema = z.enum([
  'switch',
  'hub',
  'plug',
  'sensor',
  'dc',
  'media',
  'etc',
]);
export type GuideDeviceType = z.infer<typeof deviceTypeSchema>;

export const DEVICE_TYPE_LABELS: Record<GuideDeviceType, string> = {
  switch: '스위치',
  hub: '허브',
  plug: '플러그',
  sensor: '센서',
  dc: 'DC/전원',
  media: '미디어',
  etc: '기타',
};

export const createAsGuideSchema = z.object({
  deviceType: deviceTypeSchema,
  symptom: z.string().min(1).max(500),
  rootCause: z.string().min(1).max(2000),
  action: z.string().min(1).max(2000),
  tips: z.string().max(2000).optional(),
  caseCount: z.number().int().nonnegative().default(0),
});
export type CreateAsGuideDto = z.infer<typeof createAsGuideSchema>;

export const updateAsGuideSchema = createAsGuideSchema.partial();
export type UpdateAsGuideDto = z.infer<typeof updateAsGuideSchema>;
