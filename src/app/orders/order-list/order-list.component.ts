import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { CompanyService } from '../../services/company.service';
import { ProductService } from '../../services/product.service';
import { CommonService } from '../../services/common.service';
import { OrderItem } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent {
  // Filters
  searchQuery = signal<string>('');
  filterPriority = signal<string>('All');
  filterStatus = signal<string>('All');
  filterBox = signal<string>('All');
  filterDateFrom = signal<string>('');
  filterDateTo = signal<string>('');
  selectedCompanyFilter = signal<string>('All');

  // Modals state
  showAddOrderModal = signal<boolean>(false);
  showViewOrderModal = signal<boolean>(false);
  selectedOrder = signal<OrderItem | null>(null);

  // Drag and Drop Ranking State
  draggedOrder = signal<OrderItem | null>(null);
  dragOverOrderId = signal<string | null>(null);
  recentlyMovedOrderId = signal<string | null>(null);

  // New Order Form Model
  newOrder: Partial<OrderItem> = {
    date: '',
    companyName: '',
    productName: '',
    qty: 0,
    priority: 'High',
    laserPrint: '',
    orderStatus: 'Process',
    box: 'With Box',
    order_status: 'OPEN'
  };

  constructor(
    public orderService: OrderService,
    public companyService: CompanyService,
    public productService: ProductService,
    public commonService: CommonService,
    public authService: AuthService,
    public exportService: ExportService
  ) { }

  get minOrderDate(): string {
    return this.commonService.getTodayDateString();
  }

  // Only active companies for order creation/editing
  get activeCompanies() {
    return this.companyService.companies().filter(c =>
      (c.status === 'Active' || (c.status as any) === 'OPEN') && c.isActive !== false
    );
  }

  // Only active products for order creation/editing (filtered by selected company if chosen)
  get activeProducts() {
    return this.productService.products().filter(p => {
      const isActive = (p.status === 'Active' || (p.status as any) === 'OPEN') && p.isActive !== false;
      if (!isActive) return false;
      if (this.newOrder.companyId) {
        return Number(p.companyId) === Number(this.newOrder.companyId) || Number(p.company?.id) === Number(this.newOrder.companyId);
      }
      return true;
    });
  }

  onCompanySelectChange() {
    // When company changes, verify if currently selected product belongs to the newly selected company
    if (this.newOrder.productId) {
      const valid = this.activeProducts.some(p => p.id === Number(this.newOrder.productId));
      if (!valid) {
        this.newOrder.productId = undefined;
        this.newOrder.productName = '';
      }
    }
  }

  exportExcel() {
    this.exportService.exportToExcel(this.filteredOrders, 'EarthX_Orders_Progress');
  }

  exportPdf() {
    this.exportService.exportToPdf(this.filteredOrders, 'Orders in Progress', 'EarthX_Orders_Progress');
  }

  // All active orders without dispatch (Process and Ready to Dispatch, OPEN status)
  get nonDispatchedOrders(): OrderItem[] {
    return this.orderService.orders().filter(item =>
      (item.order_status === 'OPEN' || !item.order_status) &&
      item.orderStatus !== 'Dispatched' &&
      item.order_status !== 'CLOSE' &&
      item.order_status !== 'DELETED'
    );
  }

  // Filtered Orders
  get filteredOrders(): OrderItem[] {
    return this.nonDispatchedOrders.filter(item => {
      const query = this.searchQuery().trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.orderId.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.laserPrint.toLowerCase().includes(query);

      const matchesPriority = this.filterPriority() === 'All' || item.priority === this.filterPriority();

      let matchesStatus = true;
      if (this.filterStatus() !== 'All') {
        matchesStatus = item.orderStatus === this.filterStatus();
      }

      const matchesBox = this.filterBox() === 'All' || item.box === this.filterBox();
      const matchesCompany = this.selectedCompanyFilter() === 'All' || item.companyName === this.selectedCompanyFilter();

      let matchesDate = true;
      if (this.filterDateFrom() || this.filterDateTo()) {
        const itemDate = this.orderService.parseOrderDate(item.date);
        if (itemDate) {
          if (this.filterDateFrom()) {
            const fromDate = this.orderService.parseOrderDate(this.filterDateFrom());
            if (fromDate && itemDate < fromDate) {
              matchesDate = false;
            }
          }
          if (this.filterDateTo() && matchesDate) {
            const toDate = this.orderService.parseOrderDate(this.filterDateTo());
            if (toDate) {
              toDate.setHours(23, 59, 59, 999);
              if (itemDate > toDate) {
                matchesDate = false;
              }
            }
          }
        }
      }

      return matchesSearch && matchesPriority && matchesStatus && matchesBox && matchesCompany && matchesDate;
    });
  }

  // Active filters check
  get hasActiveFilters(): boolean {
    return (
      this.searchQuery().trim() !== '' ||
      this.filterPriority() !== 'All' ||
      this.filterStatus() !== 'All' ||
      this.filterBox() !== 'All' ||
      this.selectedCompanyFilter() !== 'All' ||
      this.filterDateFrom() !== '' ||
      this.filterDateTo() !== ''
    );
  }

  // Count active filters
  get activeFiltersCount(): number {
    let count = 0;
    if (this.searchQuery().trim()) count++;
    if (this.filterPriority() !== 'All') count++;
    if (this.filterStatus() !== 'All') count++;
    if (this.filterBox() !== 'All') count++;
    if (this.selectedCompanyFilter() !== 'All') count++;
    if (this.filterDateFrom()) count++;
    if (this.filterDateTo()) count++;
    return count;
  }

  // Reset Filters
  resetFilters() {
    this.searchQuery.set('');
    this.filterPriority.set('All');
    this.filterStatus.set('All');
    this.filterBox.set('All');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.selectedCompanyFilter.set('All');
    this.orderService.showToast('All filters have been reset.');
  }

  // --- DRAG & DROP RANKING HANDLERS ---
  onDragStart(event: DragEvent, order: OrderItem) {
    this.draggedOrder.set(order);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', order.orderId);
    }
  }

  onDragOver(event: DragEvent, order: OrderItem) {
    if (this.draggedOrder() && this.draggedOrder()?.orderId !== order.orderId) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverOrderId.set(order.orderId);
    }
  }

  onDragLeave(event: DragEvent, order: OrderItem) {
    if (this.dragOverOrderId() === order.orderId) {
      this.dragOverOrderId.set(null);
    }
  }

  onDrop(event: DragEvent, targetOrder: OrderItem) {
    event.preventDefault();
    const sourceOrder = this.draggedOrder();
    if (!sourceOrder || sourceOrder.orderId === targetOrder.orderId) {
      this.onDragEnd();
      return;
    }

    if (sourceOrder.id && targetOrder.srNo) {
      this.orderService.updateOrderRank(sourceOrder.id, targetOrder.srNo, sourceOrder.orderId);
      this.recentlyMovedOrderId.set(sourceOrder.orderId);
      setTimeout(() => {
        this.recentlyMovedOrderId.set(null);
      }, 2500);
    }

    this.onDragEnd();
  }

  onDragEnd() {
    this.draggedOrder.set(null);
    this.dragOverOrderId.set(null);
  }

  // Move Rank Up by 1 using backend
  moveRankUp(order: OrderItem) {
    this.orderService.moveOrderUp(order);
    this.recentlyMovedOrderId.set(order.orderId);
    setTimeout(() => this.recentlyMovedOrderId.set(null), 2000);
  }

  // Move Rank Down by 1 using backend
  moveRankDown(order: OrderItem) {
    this.orderService.moveOrderDown(order);
    this.recentlyMovedOrderId.set(order.orderId);
    setTimeout(() => this.recentlyMovedOrderId.set(null), 2000);
  }

  // Quick process button action (double plus icon)
  quickProcessOrder(order: OrderItem) {
    this.orderService.quickProcessOrder(order);
  }

  // Delete Order (Super User only)
  async deleteOrder(order: OrderItem) {
    if (this.authService.currentUser().role !== 'super-user') {
      this.commonService.showToast('error', 'Access Restricted', 'Only Super Users have permission to delete orders.');
      return;
    }

    const confirmed = await this.commonService.confirm({
      title: 'Delete Order',
      message: `Are you sure you want to delete Order #${order.orderId}?`,
      subMessage: `Company: ${order.companyName} | Product: ${order.productName || 'N/A'}`,
      confirmText: 'Delete Order',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      this.orderService.deleteOrder(order.orderId);
      this.commonService.showToast('success', 'Order Deleted', `Order #${order.orderId} deleted.`);
    }
  }

  // View Modal
  viewOrder(order: OrderItem) {
    this.selectedOrder.set(order);
    this.showViewOrderModal.set(true);
  }

  // Edit Modal (No Order ID field)
  editOrder(order: OrderItem) {
    this.selectedOrder.set(order);

    // Format date to YYYY-MM-DD for <input type="date">
    let formattedDate = '';
    const d = this.orderService.parseOrderDate(order.date);
    if (d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      formattedDate = `${yyyy}-${mm}-${dd}`;
    }

    // Resolve companyId and productId if not already present
    let companyId = order.companyId;
    if (!companyId && order.companyName) {
      const matched = this.companyService.companies().find(c => c.companyName === order.companyName);
      if (matched) companyId = matched.id;
    }

    let productId = order.productId;
    if (!productId && order.productName) {
      const matched = this.productService.products().find(p => p.name === order.productName);
      if (matched) productId = matched.id;
    }

    this.newOrder = {
      ...order,
      companyId,
      productId,
      date: formattedDate
    };
    this.showAddOrderModal.set(true);
  }

  // Open Create Order Modal (No Order ID field)
  openAddOrder() {
    this.selectedOrder.set(null);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;

    this.newOrder = {
      date: formattedToday,
      companyId: undefined,
      productId: undefined,
      companyName: '',
      productName: '',
      qty: 0,
      priority: 'High',
      laserPrint: '',
      orderStatus: 'Process',
      box: 'With Box'
    };
    this.showAddOrderModal.set(true);
  }

  // Save New / Edited Order
  saveOrder() {
    if (!this.newOrder.date || this.newOrder.date == '') {
      this.commonService.showToast('warning', 'Selection Required', 'Please select a Date.');
      return;
    }

    if (!this.newOrder.companyId) {
      this.commonService.showToast('warning', 'Selection Required', 'Please select a Company Name.');
      return;
    }

    if (!this.newOrder.productId) {
      this.commonService.showToast('warning', 'Selection Required', 'Please select a Product Name.');
      return;
    }

    if (!this.newOrder.qty || this.newOrder.qty <= 0) {
      this.commonService.showToast('warning', 'Selection Required', 'Please enter a Quantity greater than zero.');
      return;
    }

    // Populate companyName and productName for optimistic UI updates
    const matchedCompany = this.companyService.companies().find(c => c.id === Number(this.newOrder.companyId));
    if (matchedCompany) {
      this.newOrder.companyName = matchedCompany.companyName;
    }
    const matchedProduct = this.productService.products().find(p => p.id === Number(this.newOrder.productId));
    if (matchedProduct) {
      this.newOrder.productName = matchedProduct.name;
    }

    if (this.selectedOrder()) {
      this.orderService.updateOrder({
        ...this.selectedOrder()!,
        ...this.newOrder as OrderItem,
        orderId: this.selectedOrder()!.orderId
      });
      this.commonService.showToast('success', 'Order Updated', `Order #${this.selectedOrder()!.orderId} updated successfully!`);
    } else {
      this.orderService.addOrder(this.newOrder);
    }

    this.showAddOrderModal.set(false);
  }
}
