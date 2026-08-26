import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { CompanyService } from '../../services/company.service';
import { OrderItem } from '../../models/order.model';

@Component({
  selector: 'app-dispatch-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dispatch-list.component.html',
  styleUrl: './dispatch-list.component.scss'
})
export class DispatchListComponent {
  searchQuery = signal<string>('');
  selectedCompanyFilter = signal<string>('All');

  // Modals state
  showEditOrderModal = signal<boolean>(false);
  showViewOrderModal = signal<boolean>(false);
  selectedOrder = signal<OrderItem | null>(null);

  newOrder: Partial<OrderItem> = {};

  constructor(
    public orderService: OrderService,
    public companyService: CompanyService
  ) {}

  get dispatchOrders(): OrderItem[] {
    return this.orderService.orders().filter(item => {
      const isDispatchable = item.orderStatus === 'Ready to Dispatch' || item.orderStatus === 'Dispatched';
      const matchesCompany = this.selectedCompanyFilter() === 'All' || item.companyName === this.selectedCompanyFilter();
      const query = this.searchQuery().trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.orderId.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.laserPrint.toLowerCase().includes(query);

      return isDispatchable && matchesCompany && matchesSearch;
    });
  }

  quickProcessOrder(order: OrderItem) {
    this.orderService.quickProcessOrder(order);
  }

  viewOrder(order: OrderItem) {
    this.selectedOrder.set(order);
    this.showViewOrderModal.set(true);
  }

  editOrder(order: OrderItem) {
    this.selectedOrder.set(order);
    this.newOrder = { ...order };
    this.showEditOrderModal.set(true);
  }

  saveOrder() {
    if (this.selectedOrder()) {
      this.orderService.updateOrder({
        ...this.selectedOrder()!,
        ...this.newOrder as OrderItem,
        orderId: this.selectedOrder()!.orderId
      });
    }
    this.showEditOrderModal.set(false);
  }
}
