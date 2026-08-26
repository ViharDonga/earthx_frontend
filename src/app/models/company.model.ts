export interface CompanyItem {
  id: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  city: string;
  gstNumber: string;
  status: 'Active' | 'Inactive';
  email: string
}
