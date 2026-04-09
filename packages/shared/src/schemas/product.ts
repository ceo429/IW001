import { z } from 'zod';
import { moneySchema } from './common.js';

export const productCategorySchema = z.enum([
  'switch',
  'hub',
  'plug',
  'sensor',
  'dc',
  'media',
  'etc',
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const createProductSchema = z.object({
  category: productCategorySchema,
  name: z.string().min(1).max(200),
  model: z.string().max(120).optional(),
  unit: z.string().min(1).max(20).default('EA'),
  unitPrice: moneySchema,
  stock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  supplier: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
