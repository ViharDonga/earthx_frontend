import { Component, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { OrderService } from '../services/order.service';
import { CompanyService } from '../services/company.service';
import { ProductService } from '../services/product.service';
import { OrderListComponent } from '../orders/order-list/order-list.component';
import { DispatchListComponent } from '../orders/dispatch-list/dispatch-list.component';
import { CompanyMasterComponent } from '../master/company-master/company-master.component';
import { ProductMasterComponent } from '../master/product-master/product-master.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OrderListComponent,
    DispatchListComponent,
    CompanyMasterComponent,
    ProductMasterComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  @ViewChild(OrderListComponent) orderListRef?: OrderListComponent;
  @ViewChild(CompanyMasterComponent) companyMasterRef?: CompanyMasterComponent;
  @ViewChild(ProductMasterComponent) productMasterRef?: ProductMasterComponent;

  // Active module view: 'orders-list' | 'orders-dispatch' | 'master-company' | 'master-product'
  activeView = signal<'orders-list' | 'orders-dispatch' | 'master-company' | 'master-product'>('orders-list');

  // Sidebar open / collapsed state
  isSidebarOpen = signal<boolean>(true);

  // Submenu collapse states
  isOrderMenuOpen = signal<boolean>(true);
  isMasterMenuOpen = signal<boolean>(true);

  get dispatchCount(): number {
    return this.orderService.orders().filter(o => o.orderStatus === 'Ready to Dispatch' || o.orderStatus === 'Dispatched').length;
  }

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public orderService: OrderService,
    public companyService: CompanyService,
    public productService: ProductService,
    private router: Router
  ) {}

  ngOnInit() {
    this.companyService.fetchCompanies();
    this.productService.fetchProducts();
    this.orderService.fetchOrders();

    if (!this.authService.isAuthenticated()) {
      this.authService.currentUser.set({
        username: 'superuser@earthx.in',
        fullName: 'EarthX Super User',
        email: 'superuser@earthx.in',
        role: 'super-user',
        roleLabel: 'Super User'
      });
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isSidebarOpen.set(false);
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  selectMenuItem(view: 'orders-list' | 'orders-dispatch' | 'master-company' | 'master-product') {
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

  switchRole(role: 'super-user' | 'user') {
    this.authService.currentUser.update(u => ({
      ...u,
      role,
      roleLabel: role === 'super-user' ? 'Super User' : 'User'
    }));

    if (role === 'user' && this.activeView().startsWith('master')) {
      this.activeView.set('orders-list');
    }
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
