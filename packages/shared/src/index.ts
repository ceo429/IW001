/**
 * @iw001/shared — package entry point.
 *
 * Re-exports constants, types, and zod schemas that are consumed by both
 * `apps/web` (React) and `apps/api` (NestJS). Keeping this in a single source
 * of truth is how we enforce that frontend and backend agree on every DTO.
 */

export * from './constants/index.js';
export * from './types/index.js';
export * from './schemas/index.js';
