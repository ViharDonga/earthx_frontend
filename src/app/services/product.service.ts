import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductMaster } from '../models/product.model';
import { environment } from '../../environments/environment';
import { CommonService } from './common.service';

const INITIAL_PRODUCTS: [] = [];

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;
  products = signal<ProductMaster[]>([]);
  isLoading = signal<boolean>(false);
  showToast = inject(CommonService)

  categories = [
    'Power Supplies',
    'Controllers',
    'Adapters',
    'Motor Switches',
    'PCB Assemblies'
  ];

  constructor(private http: HttpClient) {
    this.fetchProducts();
  }

  fetchProducts() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/products`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.length > 0) {
          const mapped: ProductMaster[] = res.map((p, idx) => ({
            id: p.id,
            code: p.sku || `-`,
            name: p.name || '',
            category: p.description || '-',
            unitPrice: Number(p.price) || 0,
            unit: p.unit,
            status: p.isActive === false ? 'Inactive' : 'Active'
          }));
          this.products.set(mapped);
        } else {
          this.seedInitialProducts();
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private seedInitialProducts() {
    INITIAL_PRODUCTS.forEach((p: any) => {
      this.http.post(`${this.apiUrl}/products`, {
        name: p.name,
        sku: p.code,
        description: p.category,
        price: p.unitPrice,
        unit: 'PCS',
        isActive: true
      }).subscribe({
        next: () => this.fetchProducts()
      });
    });
  }

  addProduct(product: Partial<ProductMaster>) {
    const nextIndex = this.products().length + 1;
    const autoCode = product.code || `EX-PRD-${nextIndex < 10 ? '0' + nextIndex : nextIndex}`;
    const payload = {
      name: product.name || '',
      sku: autoCode,
      description: product.category || 'Power Supplies',
      price: Number(product.unitPrice) || 0,
      unit: Number(product.unit) || 0,
      isActive: product.status !== 'Inactive'
    };

    this.http.post<any>(`${this.apiUrl}/products`, payload).subscribe({
      next: () => {
        this.fetchProducts();
      },
      error: () => {
        this.showToast.showToast('error', 'Failed to add product!', 'Please try again.');
      }
    });
  }

  updateProduct(product: ProductMaster) {
    const payload = {
      name: product.name,
      description: product.category,
      price: Number(product.unitPrice) || 0,
      unit: Number(product.unit) || 0,
      isActive: product.status !== 'Inactive'
    };

    const targetId = product.id;
    if (targetId) {
      this.http.patch(`${this.apiUrl}/products/${targetId}`, payload).subscribe({
        next: () => this.fetchProducts(),
        error: () => {
          this.showToast.showToast('error', 'Failed to update product!', 'Please try again.');
        }
      });
    } else {
      this.showToast.showToast('error', 'Failed to update product!', 'Please try again.');
    }
  }

  deleteProduct(idOrCode: any) {
    const prod = this.products().find(p => p.id === idOrCode || p.code === idOrCode);
    if (prod && prod.id) {
      this.http.delete(`${this.apiUrl}/products/${prod.id}`).subscribe({
        next: () => this.fetchProducts(),
        error: () => {
          this.products.update(list => list.filter(p => p.code !== prod.code));
        }
      });
    } else {
      this.products.update(list => list.filter(p => p.code !== idOrCode && p.id !== idOrCode));
    }
  }
}
