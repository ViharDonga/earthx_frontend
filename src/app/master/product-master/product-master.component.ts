import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { ProductMaster } from '../../models/product.model';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-product-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-master.component.html',
  styleUrl: './product-master.component.scss'
})
export class ProductMasterComponent implements OnInit {
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  showAddProductModal = signal<boolean>(false);
  showViewProductModal = signal<boolean>(false);
  selectedProduct = signal<ProductMaster | null>(null);
  productSvc = inject(ProductService);

  newProduct: Partial<ProductMaster> = {
    code: '',
    name: '',
    category: '',
    unitPrice: 0,
    unit: 0,
    status: 'Active'
  };

  constructor(
    public productService: ProductService,
    private orderService: OrderService,
    private toast: CommonService
  ) { }
  ngOnInit(): void {
    this.productSvc.fetchProducts();
    console.log(this.productSvc.products());
  }

  get filteredProducts(): ProductMaster[] {
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.productService.products().filter(p => {
      const matchesCat = cat === 'All' || p.category === cat;
      const matchesSearch =
        !query ||
        p.code.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      return matchesCat && matchesSearch;
    });
  }

  openAddProduct() {
    this.selectedProduct.set(null);
    const nextNum = this.productService.products().length + 1;
    this.newProduct = {
      code: `EX-SMP-${nextNum < 10 ? '0' + nextNum : nextNum}`,
      name: '',
      category: 'Power Supplies',
      unitPrice: 1,
      unit: 0,
      status: 'Active'
    };
    this.showAddProductModal.set(true);
  }

  editProduct(product: ProductMaster) {
    this.selectedProduct.set(product);
    this.newProduct = { ...product };
    this.showAddProductModal.set(true);
  }

  async deleteProduct(product: ProductMaster) {
    const confirmed = await this.toast.confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"?`,
      subMessage: `Product Code: ${product.code} | Category: ${product.category || 'N/A'}`,
      confirmText: 'Delete Product',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      this.productService.deleteProduct(product.code,product.name);
    }
  }

  viewProduct(product: ProductMaster) {
    this.selectedProduct.set(product);
    this.showViewProductModal.set(true);
  }

  saveProduct() {
    if (!this.newProduct.name || !this.newProduct.code) {
      this.toast.showToast('warning', 'Missing Fields', 'Please enter Product Code and Product Name.');
      return;
    }

    if (this.selectedProduct()) {
      this.productService.updateProduct({
        ...this.selectedProduct()!,
        ...this.newProduct as ProductMaster,
        code: this.selectedProduct()!.code
      });
    } else {
      this.productService.addProduct(this.newProduct);
    }

    this.showAddProductModal.set(false);
  }
}
