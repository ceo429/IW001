import { z } from 'zod';

/**
 * Spatial mapping DTOs.
 *
 * - updateFloorPlanSchema: sets the home's SVG floor plan string. The
 *   value is sanitized server-side before storage (see
 *   apps/api/src/modules/homes/homes.service setFloorPlan()).
 * - updateDevicePositionSchema: writes normalized (0..1) coordinates
 *   to a device. We use normalized coords so the marker positions
 *   stay correct when the viewer is resized.
 */

export const updateFloorPlanSchema = z.object({
  svg: z
    .string()
    .max(500_000, 'SVG 크기는 500KB 이하여야 합니다.'),
});
export type UpdateFloorPlanDto = z.infer<typeof updateFloorPlanSchema>;

export const updateDevicePositionSchema = z.object({
  posX: z.number().min(0).max(1).nullable(),
  posY: z.number().min(0).max(1).nullable(),
});
export type UpdateDevicePositionDto = z.infer<typeof updateDevicePositionSchema>;

/**
 * A minimal default floor plan used when a home has none yet — a 1000x600
 * grid with light gridlines. Kept here so the backend seed and the
 * frontend "reset" action use the exact same markup.
 */
export const DEFAULT_FLOOR_PLAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="100%" height="100%">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#333" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="1000" height="600" fill="#0a0a0a"/>
  <rect width="1000" height="600" fill="url(#grid)"/>
  <rect x="20" y="20" width="960" height="560" fill="none" stroke="#525252" stroke-width="2" rx="4"/>
</svg>`;
