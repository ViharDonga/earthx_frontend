export interface ProductMaster {
  id?: number;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: number;
  status: 'Active' | 'Inactive' | 'Inactive' | string;
  companyId?: number;
  company?: any;
  isActive?: boolean;
}
