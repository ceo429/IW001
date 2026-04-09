import type { ProductCategory } from '@iw001/shared';

export interface ProductRow {
  id: string;
  category: ProductCategory | string;
  name: string;
  model: string | null;
  unit: string;
  unitPrice: number;
  stock: number;
  minStock: number;
  supplier: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsOverview {
  total: number;
  totalStock: number;
  lowStock: number;
  categoryCount: number;
  byCategory: Array<{ category: string; count: number }>;
}

export const CATEGORY_LABELS: Record<string, string> = {
  switch: '스위치',
  hub: '허브',
  plug: '플러그',
  sensor: '센서',
  dc: 'DC/전원',
  media: '미디어',
  etc: '기타',
};

export const CATEGORY_OPTIONS = [
  'switch',
  'hub',
  'plug',
  'sensor',
  'dc',
  'media',
  'etc',
] as const;
