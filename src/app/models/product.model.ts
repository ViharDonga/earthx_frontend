export interface ProductMaster {
  id?: number;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: number;
  status: 'Active' | 'IN Active';
}
