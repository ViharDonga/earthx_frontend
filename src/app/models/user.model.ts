export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super-user' | 'user' | string;
  status: 'pending' | 'approved' | 'rejected' | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  addl_attr?: any;
}

