export interface OrderItem {
  id?: number;
  srNo: number;
  orderId: string;
  date: string;
  companyId?: number;
  companyName: string;
  productId?: number;
  productName: string;
  qty: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  laserPrint: string;
  orderStatus: 'Process' | 'Ready to Dispatch' | 'Dispatched';
  box: 'With Box' | 'Without Box';
  order_status?: 'OPEN' | 'CLOSE' | string;
  addl_attr?: any;
}

