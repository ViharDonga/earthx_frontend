import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { OrderService } from '../../services/order.service';
import { CompanyItem } from '../../models/company.model';
import { CommonService } from '../../services/common.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-company-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-master.component.html',
  styleUrl: './company-master.component.scss'
})
export class CompanyMasterComponent {
  searchQuery = signal<string>('');
  showAddCompanyModal = signal<boolean>(false);
  showViewCompanyModal = signal<boolean>(false);
  selectedCompany = signal<CompanyItem | null>(null);
  toast = inject(CommonService)

  newCompany: Partial<CompanyItem> = {
    companyName: '',
    contactPerson: '',
    phone: '',
    city: '',
    gstNumber: '',
    status: 'Active',
    email: ''
  };

  constructor(
    public companyService: CompanyService,
    private orderService: OrderService,

  ) { }

  get filteredCompanies(): CompanyItem[] {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.companyService.companies();

    return this.companyService.companies().filter(c =>
      c.companyName.toLowerCase().includes(query) ||
      c.contactPerson.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.gstNumber.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }

  openAddCompany() {
    this.selectedCompany.set(null);
    this.newCompany = {
      companyName: '',
      contactPerson: '',
      phone: '',
      city: '',
      gstNumber: '',
      status: 'Active',
      email: ''
    };
    this.showAddCompanyModal.set(true);
  }

  editCompany(company: CompanyItem) {
    this.selectedCompany.set(company);
    this.newCompany = { ...company };
    this.showAddCompanyModal.set(true);
  }

  async deleteCompany(company: CompanyItem) {
    const confirmed = await this.toast.confirm({
      title: 'Delete Company',
      message: `Are you sure you want to delete "${company.companyName}"?`,
      subMessage: `Contact: ${company.contactPerson || 'N/A'} | City: ${company.city || 'N/A'}`,
      confirmText: 'Delete Company',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      this.companyService.deleteCompany(company.id, company.companyName);
     
    }
  }

  viewCompany(company: CompanyItem) {
    this.selectedCompany.set(company);
    this.showViewCompanyModal.set(true);
  }

  saveCompany() {
    if (!this.newCompany.companyName && this.newCompany.companyName == '') {
      this.toast.showToast('warning', 'Missing Field', 'Please enter Company Name.');
      return;
    }

    if (this.selectedCompany()) {
      this.companyService.updateCompany({
        ...this.selectedCompany()!,
        ...this.newCompany as CompanyItem,
        id: this.selectedCompany()!.id
      });
    } else {
      this.companyService.addCompany(this.newCompany);

    }

    this.showAddCompanyModal.set(false);
  }
}
