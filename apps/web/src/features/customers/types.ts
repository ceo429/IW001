export interface CustomerRow {
  id: string;
  name: string;
  ceoName: string | null;
  bizNo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  discountRate: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    homes: number;
    quotes: number;
  };
}
