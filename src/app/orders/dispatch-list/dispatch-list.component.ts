import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { CompanyService } from '../../services/company.service';
import { OrderItem } from '../../models/order.model';
import { ExportService } from '../../services/export.service';

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
  filterDateFrom = signal<string>('');
  filterDateTo = signal<string>('');

  // Modals state
  showViewOrderModal = signal<boolean>(false);
  selectedOrder = signal<OrderItem | null>(null);

  // Return Process Modal state
  showReturnModal = signal<boolean>(false);
  selectedOrderForReturn = signal<OrderItem | null>(null);
  returnProcessType = signal<'Process' | 'Ready to Dispatch'>('Process');

  constructor(
    public orderService: OrderService,
    public companyService: CompanyService,
    public exportService: ExportService
  ) {
    this.setCurrentMonthFilter();
  }

  setCurrentMonthFilter() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${yyyy}-${mm}-01`;
    const lastDate = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    const lastDay = `${yyyy}-${mm}-${String(lastDate).padStart(2, '0')}`;

    this.filterDateFrom.set(firstDay);
    this.filterDateTo.set(lastDay);
  }

  clearDateFilter() {
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
  }

  exportExcel() {
    this.exportService.exportToExcel(this.dispatchOrders, 'EarthX_Dispatched_Orders');
  }

  exportPdf() {
    this.exportService.exportToPdf(this.dispatchOrders, 'Dispatched Orders Report', 'EarthX_Dispatched_Orders');
  }

  get dispatchOrders(): OrderItem[] {
    return this.orderService.orders().filter(item => {
      const isDispatched = (item.order_status === 'CLOSE' || item.orderStatus === 'Dispatched') && item.order_status !== 'DELETED';
      const matchesCompany = this.selectedCompanyFilter() === 'All' || item.companyName === this.selectedCompanyFilter();
      const query = this.searchQuery().trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.orderId.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.laserPrint.toLowerCase().includes(query);

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

      return isDispatched && matchesCompany && matchesSearch && matchesDate;
    });
  }

  quickProcessOrder(order: OrderItem) {
    this.orderService.quickProcessOrder(order);
  }

  openReturnModal(order: OrderItem) {
    this.selectedOrderForReturn.set(order);
    this.returnProcessType.set('Process');
    this.showReturnModal.set(true);
  }

  confirmReturnProcess() {
    const order = this.selectedOrderForReturn();
    if (order) {
      this.orderService.returnOrderProcess(order, this.returnProcessType());
      this.showReturnModal.set(false);
      this.selectedOrderForReturn.set(null);
    }
  }

  viewOrder(order: OrderItem) {
    this.selectedOrder.set(order);
    this.showViewOrderModal.set(true);
  }
}
