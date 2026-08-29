import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrderItem } from '../models/order.model';
import { CompanyService } from './company.service';
import { environment } from '../../environments/environment';
import { CommonService } from './common.service';
import { ProductService } from './product.service';
import { AuthService } from './auth.service';

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
    private productService: ProductService,
    private authService: AuthService
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

  // Map backend order response to OrderItem
  mapBackendOrders(res: any[]): OrderItem[] {
    if (!res || res.length === 0) return [];
    // Sort by rank ascending, then id ascending
    const sorted = [...res].sort((a, b) => (a.rank || 0) - (b.rank || 0) || (a.id || 0) - (b.id || 0));
    return sorted.map((o, idx) => {
      const rawDate = o.createdAt ? new Date(o.createdAt) : new Date();
      const dateStr = `${rawDate.getDate()}/${rawDate.getMonth() + 1}/${rawDate.getFullYear()}`;

      let laserPrint = '';
      let box: 'With Box' | 'Without Box' = 'With Box';
      if (o.notes) {
        const laserMatch = o.notes.match(/Laser:\s*([^;]+)/i);
        if (laserMatch) laserPrint = laserMatch[1].trim();
        else if (!o.notes.includes('Box:')) laserPrint = o.notes.trim();

        if (o.notes.includes('Without Box')) box = 'Without Box';
      }

      let orderStatus: 'Process' | 'Ready to Dispatch' | 'Dispatched' = 'Process';
      if (o.process === 'READY_TO_DISPATCH' || o.process === 'Ready to Dispatch') orderStatus = 'Ready to Dispatch';
      else if (o.process === 'DISPATCHED' || o.process === 'Dispatched') orderStatus = 'Dispatched';
      else orderStatus = 'Process';

      let priority: 'High' | 'Medium' | 'Low' | 'Urgent' = 'Medium';
      if (o.priority === 'HIGH') priority = 'High';
      else if (o.priority === 'LOW') priority = 'Low';
      else if (o.priority === 'URGENT') priority = 'Urgent';

      const companyId = o.companyId || (o.company && o.company.id);
      const companyName = o.company?.name || o.company?.companyName || o.customerName || '-';
      const productId = o.productId || (o.product && o.product.id);
      const productName = o.product?.name || o.productName || '-';

      return {
        id: o.id,
        srNo: o.rank || idx + 1,
        orderId: o.orderNumber || String(o.id),
        date: dateStr,
        companyId,
        companyName,
        productId,
        productName,
        qty: Number(o.quantity) || 100,
        priority,
        laserPrint: laserPrint || '-',
        orderStatus,
        box,
        order_status: o.order_status || 'OPEN',
        addl_attr: o.addl_attr || {}
      };
    });
  }

  fetchOrders() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/orders`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.orders.set(this.mapBackendOrders(res));
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.commonSvc.showToast("error", "Error fetching orders", err.error.message || "Error Fetching Order List, Pls Contact to admin");
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

    let process = 'IN_PROCESS';
    if (order.orderStatus === 'Ready to Dispatch') process = 'READY_TO_DISPATCH';
    if (order.orderStatus === 'Dispatched') process = 'DISPATCHED';

    let priority = 'HIGH';
    if (order.priority === 'Medium') priority = 'NORMAL';
    if (order.priority === 'Low') priority = 'LOW';

    const payload: any = {
      orderNumber: autoId,
      companyId: order.companyId ? Number(order.companyId) : undefined,
      productId: order.productId ? Number(order.productId) : undefined,
      quantity: Number(order.qty) || 100,
      priority,
      process,
      rank: nextSr,
      notes: `Laser: ${order.laserPrint || ''}; Box: ${order.box || 'With Box'}`,
      order_status: order.order_status || 'OPEN',
      addl_attr: order.addl_attr || {}
    };

    this.http.post<any>(`${this.apiUrl}/orders`, payload).subscribe({
      next: () => {
        this.showToast(`New Order #${autoId} created successfully!`);
        this.fetchOrders();
      },
      error: (err: any) => {
        this.commonSvc.showToast("error", "Error creating order", err.error.message || "Error Creating Order, Pls Contact to admin");
      }
    });

    return autoId;
  }

  // Update Order (Preserves original Order ID)
  updateOrder(order: OrderItem) {
    let process = 'IN_PROCESS';
    if (order.orderStatus === 'Ready to Dispatch') process = 'READY_TO_DISPATCH';
    if (order.orderStatus === 'Dispatched') process = 'DISPATCHED';

    let priority = 'HIGH';
    if (order.priority === 'Medium') priority = 'NORMAL';
    if (order.priority === 'Low') priority = 'LOW';

    const payload: any = {
      companyId: order.companyId ? Number(order.companyId) : undefined,
      productId: order.productId ? Number(order.productId) : undefined,
      quantity: Number(order.qty) || 100,
      priority,
      process,
      notes: `Laser: ${order.laserPrint || ''}; Box: ${order.box || 'With Box'}`,
      addl_attr: order.addl_attr || {}
    };

    const targetId = order.id;
    if (targetId) {
      this.http.patch(`${this.apiUrl}/orders/${targetId}`, payload).subscribe({
        next: () => {
            this.commonSvc.showToast('success', 'Order Updated', `Order #${order.orderId} updated successfully!`);
            this.fetchOrders();
          },
        error: (err: any) => {
          this.commonSvc.showToast('error', 'Order Updated', err.error.message || `Order #${order.orderId} updated successfully!`);
        }
      });
    } else {
      this.commonSvc.showToast('error', 'Order Updated', `Order #${order.orderId} Not Found.`);
    }
  }

  // Quick Action: Advance / Process Status with audit tracking in addl_attr
  quickProcessOrder(order: OrderItem) {
    const currentUser = this.authService.currentUser();
    const userName = currentUser?.fullName || currentUser?.username || 'Super User';
    const now = new Date();
    const formatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    let nextStatusText: 'Process' | 'Ready to Dispatch' | 'Dispatched' = 'Process';
    let backendProcess = 'IN_PROCESS';
    let updatedOrderStatus = order.order_status || 'OPEN';
    let feedbackMsg = '';
    const updatedAddlAttr: any = { ...(order.addl_attr || {}) };

    if (order.orderStatus === 'Process') {
      nextStatusText = 'Ready to Dispatch';
      backendProcess = 'READY_TO_DISPATCH';
      feedbackMsg = `Order #${order.orderId} moved to Ready to Dispatch!`;
      updatedAddlAttr.readyToDispatch = {
        userName: userName,
        timestamp: now.toISOString(),
        date: formatted
      };
    } else if (order.orderStatus === 'Ready to Dispatch') {
      nextStatusText = 'Dispatched';
      backendProcess = 'DISPATCHED';
      updatedOrderStatus = 'CLOSE';
      feedbackMsg = `Order #${order.orderId} marked as Dispatched & Closed!`;
      updatedAddlAttr.dispatched = {
        userName: userName,
        timestamp: now.toISOString(),
        date: formatted
      };
    } else {
      nextStatusText = 'Process';
      backendProcess = 'IN_PROCESS';
      feedbackMsg = `Order #${order.orderId} reset to In Process.`;
    }

    const payload = {
      process: backendProcess,
      order_status: updatedOrderStatus,
      addl_attr: updatedAddlAttr
    };

    const targetId = order.id;
    if (targetId) {
      this.http.patch(`${this.apiUrl}/orders/${targetId}`, payload).subscribe({
        next: () => {
          this.commonSvc.showToast('success', 'Order Status Updated', feedbackMsg);
          this.fetchOrders();
        },
        error: (err: any) => {
       
          this.commonSvc.showToast('error', 'Order Status Updated', err.error.message || feedbackMsg);
        }
      });
    } else {
      this.orders.update(list =>
        list.map(item =>
          item.orderId === order.orderId ? { ...item, orderStatus: nextStatusText, addl_attr: updatedAddlAttr } : item
        )
      );
      this.showToast(feedbackMsg);
    }
  }

  // Move single order up using backend PATCH /orders/:id/move-up
  moveOrderUp(order: OrderItem) {
    if (!order.id) return;
    this.http.patch<any[]>(`${this.apiUrl}/orders/${order.id}/move-up`, {}).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.orders.set(this.mapBackendOrders(res));
        } else {
          this.fetchOrders();
        }
        this.showToast(`Order #${order.orderId} moved up!`);
      },
      error: (err) => {
        this.commonSvc.showToast('error', 'Order Rank Updated', err.error.message + '\n' + `Order #${order.orderId} Rank Updated Failed.`);
        this.fetchOrders();
      }
    });
  }

  // Move single order down using backend PATCH /orders/:id/move-down
  moveOrderDown(order: OrderItem) {
    if (!order.id) return;
    this.http.patch<any[]>(`${this.apiUrl}/orders/${order.id}/move-down`, {}).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.orders.set(this.mapBackendOrders(res));
        } else {
          this.fetchOrders();
        }
        this.commonSvc.showToast('success', 'Order Rank Updated', `Order #${order.orderId} moved down!`);
      },
      error: (err: any) => {
        this.commonSvc.showToast('error', 'Order Rank Updated', err.error.message + '\n' + `Order #${order.orderId} Rank Updated Failed.`);
        this.fetchOrders();
      }
    });
  }

  // Update order rank using backend PATCH /orders/:id/rank
  updateOrderRank(orderId: number, newRank: number, orderNumber?: string) {
    this.http.patch<any[]>(`${this.apiUrl}/orders/${orderId}/rank`, { newRank }).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.orders.set(this.mapBackendOrders(res));
        } else {
          this.fetchOrders();
        }
        if (orderNumber) {
          this.commonSvc.showToast('success', 'Order Rank Updated', `Order #${orderNumber} moved to Rank #${newRank}!`);
        }
      },
      error: (err: any) => {
        this.commonSvc.showToast('error', 'Order Rank Updated', err.error.message + '\n' + `Order #${orderId} Rank Updated Failed.`);
        this.fetchOrders();
      }
    });
  }

  // Reorder orders by moving from source index to destination index (Drag & Drop)
  reorderOrders(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const currentList = this.orders();
    if (fromIndex >= currentList.length || toIndex >= currentList.length) return;

    const movedItem = currentList[fromIndex];
    if (movedItem && movedItem.id) {
      const targetRank = toIndex + 1;
      this.updateOrderRank(movedItem.id, targetRank, movedItem.orderId);
    }
  }

  // Move single order up or down by 1 step
  moveOrderRank(orderId: string, direction: 'up' | 'down') {
    const list = this.orders();
    const order = list.find(o => o.orderId === orderId);
    if (!order) return;

    if (direction === 'up') {
      this.moveOrderUp(order);
    } else {
      this.moveOrderDown(order);
    }
  }

  // Delete Order
  deleteOrder(orderId: string) {
    const ord = this.orders().find(o => o.orderId === orderId);
    if (ord && ord.id) {
      this.http.delete(`${this.apiUrl}/orders/${ord.id}`).subscribe({
        next: () => {
          this.commonSvc.showToast('success', 'Order Deleted', `Order #${orderId} Deleted SuccessFully.`);
          this.fetchOrders();
        },
        error: (err: any) => {
          this.commonSvc.showToast('error', 'Order Deleted', err.error.message + '\n' + `Order #${orderId} Deleted Failed.`);
        }
      });
    } else {
      this.commonSvc.showToast('error', 'Order Deleted', `Order #${orderId} Not Found.`);
    }
  }
}
