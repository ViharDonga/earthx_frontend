import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { CompanyService } from '../../services/company.service';
import { OrderItem } from '../../models/order.model';

@Component({
  selector: 'app-closed-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './closed-orders.component.html',
  styleUrl: './closed-orders.component.scss'
})
export class ClosedOrdersComponent {
  searchQuery = signal<string>('');
  selectedCompanyFilter = signal<string>('All');

  // Modals state
  showViewOrderModal = signal<boolean>(false);
  selectedOrder = signal<OrderItem | null>(null);

  constructor(
    public orderService: OrderService,
    public companyService: CompanyService
  ) {}

  get closedOrders(): OrderItem[] {
    return this.orderService.orders().filter(item => {
      const isClosed = (item.order_status === 'CLOSE' || item.orderStatus === 'Dispatched') && item.order_status !== 'DELETED';
      const matchesCompany = this.selectedCompanyFilter() === 'All' || item.companyName === this.selectedCompanyFilter();
      const query = this.searchQuery().trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.orderId.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.laserPrint.toLowerCase().includes(query);

      return isClosed && matchesCompany && matchesSearch;
    });
  }

  viewOrder(order: OrderItem) {
    this.selectedOrder.set(order);
    this.showViewOrderModal.set(true);
  }
}
