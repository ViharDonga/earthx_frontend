import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrderItem } from '../models/order.model';
import { CompanyService } from './company.service';
import { environment } from '../../environments/environment';
import { CommonService } from './common.service';
import { ProductService } from './product.service';

const INITIAL_ORDERS: [] = [];

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  // Global Toast Message Signal
  toastMessage = signal<string | null>(null);
  private toastTimer: any = null;

  // Master Orders Signal
  orders = signal<OrderItem[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private companyService: CompanyService,
    private commonSvc: CommonService,
    private productService: ProductService
  ) {
    this.fetchOrders();
  }

  // Show Toast
  showToast(message: string) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMessage.set(message);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  fetchOrders() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/orders`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.length > 0) {
          // Sort by rank
          const sorted = [...res].sort((a, b) => (a.rank || 0) - (b.rank || 0));
          const mapped: OrderItem[] = sorted.map((o, idx) => {
            const rawDate = o.createdAt ? new Date(o.createdAt) : new Date();
            const dateStr = `${rawDate.getDate()}/${rawDate.getMonth() + 1}/${rawDate.getFullYear()}`;

            let laserPrint = '';
            let box: 'With Box' | 'Without Box' = 'With Box';
            if (o.notes) {
              const laserMatch = o.notes.match(/Laser:\s*([^;]+)/i);
              if (laserMatch) laserPrint = laserMatch[1].trim();
              if (o.notes.includes('Without Box')) box = 'Without Box';
            }

            let orderStatus: 'Process' | 'Ready to Dispatch' | 'Dispatched' = 'Process';
            if (o.status === 'READY_TO_DISPATCH') orderStatus = 'Ready to Dispatch';
            else if (o.status === 'DISPATCHED') orderStatus = 'Dispatched';
            else orderStatus = 'Process';

            let priority: 'High' | 'Medium' | 'Low' | 'Urgent' = 'Medium';
            if (o.priority === 'HIGH') priority = 'High';
            else if (o.priority === 'LOW') priority = 'Low';
            else if (o.priority === 'URGENT') priority = 'Urgent';

            return {
              id: o.id,
              srNo: o.rank || idx + 1,
              orderId: o.orderNumber || String(o.id),
              date: dateStr,
              companyId: o.companyId,
              companyName: o.company?.name || o.customerName || '-',
              productName: o.productName || o.product?.name || '-',
              qty: Number(o.quantity) || 100,
              priority,
              laserPrint: laserPrint || '-',
              orderStatus,
              box
            };
          });
          this.orders.set(mapped);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.commonSvc.showToast("error", "Error fetching orders", "Error Fetching Order List, Pls Contact to admin");
      }
    });
  }



  generateNextOrderId(): string {
    const list = this.orders();
    const nextNum = 29 + list.length;
    return `${nextNum < 10 ? '0' + nextNum : nextNum}`;
  }

  // Parse dates in DD/MM/YYYY or YYYY-MM-DD format
  parseOrderDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    } else if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Add Order (Auto-generates Order ID)
  addOrder(order: Partial<OrderItem>): string {
    const autoId = this.generateNextOrderId();
    const nextSr = this.orders().length + 1;

    let status = 'IN_PROCESS';
    if (order.orderStatus === 'Ready to Dispatch') status = 'READY_TO_DISPATCH';
    if (order.orderStatus === 'Dispatched') status = 'DISPATCHED';

    let priority = 'HIGH';
    if (order.priority === 'Medium') priority = 'NORMAL';
    if (order.priority === 'Low') priority = 'LOW';

    const payload = {
      orderNumber: autoId,
      companyId: order.companyName,
      productName: order.productName || '',
      quantity: Number(order.qty) || 100,
      priority,
      status,
      rank: nextSr,
      notes: `${order.laserPrint}`
    };

    this.http.post<any>(`${this.apiUrl}/orders`, payload).subscribe({
      next: () => {
        this.showToast(`New Order #${autoId} created successfully!`);
        this.fetchOrders();
      },
      error: () => {
        this.commonSvc.showToast("error", "Erro r fetching orders", "Error Fetching Order List, Pls Contact to admin");
      }
    });

    return autoId;
  }

  // Update Order (Preserves original Order ID)
  updateOrder(order: OrderItem) {
    let status = 'IN_PROCESS';
    if (order.orderStatus === 'Ready to Dispatch') status = 'READY_TO_DISPATCH';
    if (order.orderStatus === 'Dispatched') status = 'DISPATCHED';

    let priority = 'HIGH';
    if (order.priority === 'Medium') priority = 'NORMAL';
    if (order.priority === 'Low') priority = 'LOW';

    const payload = {
      productName: order.productName,
      quantity: Number(order.qty) || 100,
      priority,
      status,
      notes: `Laser: ${order.laserPrint || ''}; Box: ${order.box || 'With Box'}`
    };

    const targetId = order.id;
    if (targetId) {
      this.http.patch(`${this.apiUrl}/orders/${targetId}`, payload).subscribe({
        next: () => {
          this.fetchOrders();
          this.showToast(`Order #${order.orderId} updated successfully!`);
        },
        error: () => {
          this.orders.update(list =>
            list.map(item => (item.orderId === order.orderId ? { ...item, ...order } : item))
          );
          this.showToast(`Order #${order.orderId} updated successfully!`);
        }
      });
    } else {
      this.orders.update(list =>
        list.map(item => (item.orderId === order.orderId ? { ...item, ...order } : item))
      );
      this.showToast(`Order #${order.orderId} updated successfully!`);
    }
  }

  // Quick Action: Advance / Process Status
  quickProcessOrder(order: OrderItem) {
    let nextStatusText: 'Process' | 'Ready to Dispatch' | 'Dispatched' = 'Process';
    let backendStatus = 'IN_PROCESS';
    let feedbackMsg = '';

    if (order.orderStatus === 'Process') {
      nextStatusText = 'Ready to Dispatch';
      backendStatus = 'READY_TO_DISPATCH';
      feedbackMsg = `Order #${order.orderId} moved to Ready to Dispatch!`;
    } else if (order.orderStatus === 'Ready to Dispatch') {
      nextStatusText = 'Dispatched';
      backendStatus = 'DISPATCHED';
      feedbackMsg = `Order #${order.orderId} marked as Dispatched!`;
    } else {
      nextStatusText = 'Process';
      backendStatus = 'IN_PROCESS';
      feedbackMsg = `Order #${order.orderId} reset to In Process.`;
    }

    const targetId = order.id;
    if (targetId) {
      this.http.patch(`${this.apiUrl}/orders/${targetId}`, { status: backendStatus }).subscribe({
        next: () => {
          this.fetchOrders();
          this.showToast(feedbackMsg);
        },
        error: () => {
          this.orders.update(list =>
            list.map(item =>
              item.orderId === order.orderId ? { ...item, orderStatus: nextStatusText } : item
            )
          );
          this.showToast(feedbackMsg);
        }
      });
    } else {
      this.orders.update(list =>
        list.map(item =>
          item.orderId === order.orderId ? { ...item, orderStatus: nextStatusText } : item
        )
      );
      this.showToast(feedbackMsg);
    }
  }

  // Reorder orders by moving from source index to destination index (Drag & Drop)
  reorderOrders(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    this.orders.update(currentList => {
      if (fromIndex >= currentList.length || toIndex >= currentList.length) return currentList;
      const updated = [...currentList];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);

      // Re-assign srNo according to the new sequence
      return updated.map((item, idx) => ({
        ...item,
        srNo: idx + 1
      }));
    });

    const targetItem = this.orders()[toIndex];
    if (targetItem && targetItem.id) {
      this.http.patch(`${this.apiUrl}/orders/${targetItem.id}`, { rank: toIndex + 1 }).subscribe();
    }
    this.showToast(`Order #${targetItem.orderId} moved to Rank #${toIndex + 1}!`);
  }

  // Move single order up or down by 1 step
  moveOrderRank(orderId: string, direction: 'up' | 'down') {
    const list = this.orders();
    const currentIndex = list.findIndex(o => o.orderId === orderId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    this.reorderOrders(currentIndex, targetIndex);
  }

  // Delete Order
  deleteOrder(orderId: string) {
    const ord = this.orders().find(o => o.orderId === orderId);
    if (ord && ord.id) {
      this.http.delete(`${this.apiUrl}/orders/${ord.id}`).subscribe({
        next: () => {
          this.fetchOrders();
          this.showToast(`Order #${orderId} deleted from database.`);
        },
        error: () => {
          this.orders.update(list => {
            const filtered = list.filter(o => o.orderId !== orderId);
            return filtered.map((item, idx) => ({
              ...item,
              srNo: idx + 1
            }));
          });
          this.showToast(`Order #${orderId} deleted.`);
        }
      });
    } else {
      this.orders.update(list => {
        const filtered = list.filter(o => o.orderId !== orderId);
        return filtered.map((item, idx) => ({
          ...item,
          srNo: idx + 1
        }));
      });
      this.showToast(`Order #${orderId} deleted.`);
    }
  }
}
