import { Component, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { OrderService } from '../services/order.service';
import { CompanyService } from '../services/company.service';
import { ProductService } from '../services/product.service';
import { UserService } from '../services/user.service';
import { OrderListComponent } from '../orders/order-list/order-list.component';
import { DispatchListComponent } from '../orders/dispatch-list/dispatch-list.component';
import { DeletedOrdersComponent } from '../orders/deleted-orders/deleted-orders.component';
import { CompanyMasterComponent } from '../master/company-master/company-master.component';
import { ProductMasterComponent } from '../master/product-master/product-master.component';
import { UserMasterComponent } from '../master/user-master/user-master.component';

export type DashboardViewType = 'orders-list' | 'orders-dispatch' | 'orders-deleted' | 'master-company' | 'master-product' | 'master-user';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OrderListComponent,
    DispatchListComponent,
    DeletedOrdersComponent,
    CompanyMasterComponent,
    ProductMasterComponent,
    UserMasterComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  @ViewChild(OrderListComponent) orderListRef?: OrderListComponent;
  @ViewChild(CompanyMasterComponent) companyMasterRef?: CompanyMasterComponent;
  @ViewChild(ProductMasterComponent) productMasterRef?: ProductMasterComponent;
  @ViewChild(UserMasterComponent) userMasterRef?: UserMasterComponent;

  // Active module view: 'orders-list' | 'orders-dispatch' | 'orders-deleted' | 'master-company' | 'master-product' | 'master-user'
  activeView = signal<DashboardViewType>('orders-list');

  // Sidebar open / collapsed state
  isSidebarOpen = signal<boolean>(true);

  // Submenu collapse states
  isOrderMenuOpen = signal<boolean>(true);
  isMasterMenuOpen = signal<boolean>(true);

  get activeOrderCount(): number {
    return this.orderService.orders().filter(o => 
      (o.order_status === 'OPEN' || !o.order_status) && 
      o.orderStatus !== 'Dispatched' && 
      o.order_status !== 'CLOSE' && 
      o.order_status !== 'DELETED'
    ).length;
  }

  get dispatchCount(): number {
    return this.orderService.orders().filter(o => 
      (o.order_status === 'CLOSE' || o.orderStatus === 'Dispatched') && 
      o.order_status !== 'DELETED'
    ).length;
  }

  get deletedOrderCount(): number {
    return this.orderService.orders().filter(o => 
      o.order_status === 'DELETED' || o.order_status === 'DELETE'
    ).length;
  }

  get pendingUserCount(): number {
    return this.userService.users().filter(u => (u.status || '').toLowerCase() === 'pending').length;
  }

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public orderService: OrderService,
    public companyService: CompanyService,
    public productService: ProductService,
    public userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isSidebarOpen.set(false);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  selectMenuItem(view: DashboardViewType) {
    this.activeView.set(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isSidebarOpen.set(false);
    }
  }

  toggleOrderMenu() {
    this.isOrderMenuOpen.update(v => !v);
  }

  toggleMasterMenu() {
    this.isMasterMenuOpen.update(v => !v);
  }

  // Quick Action from top header bar
  triggerTopAction() {
    if (this.activeView() === 'orders-list' || this.activeView() === 'orders-dispatch') {
      this.orderListRef?.openAddOrder();
    } else if (this.activeView() === 'master-company') {
      this.companyMasterRef?.openAddCompany();
    } else if (this.activeView() === 'master-product') {
      this.productMasterRef?.openAddProduct();
    }
  }

  handleLogout() {
    this.authService.logout();
  }
}

