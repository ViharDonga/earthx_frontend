import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyItem } from '../models/company.model';
import { environment } from '../../environments/environment';
import { CommonService } from './common.service';


@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = environment.apiUrl;
  companies = signal<CompanyItem[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient, public commonSvc: CommonService) {
    this.fetchCompanies();
  }

  fetchCompanies() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/companies`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.length > 0) {
          const mapped: CompanyItem[] = res.map((c, idx) => ({
            id: c.id,
            companyName: c.name || '-',
            contactPerson: c.contactPerson || '-',
            phone: c.phone || '-',
            city: c.address || '-',
            gstNumber: c.gstNumber || '-',
            email: c.email || '-',
            status: c.isActive === false ? 'Inactive' : 'Active'
          }));
          this.companies.set(mapped);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }


  addCompany(company: Partial<CompanyItem>) {
    const payload = {
      name: company.companyName || '',
      phone: company.phone || '',
      address: company.city || '',
      email: company.email || '',
      isActive: company.status !== 'Inactive',
      contactPerson: company.contactPerson || '',
      gstNumber: company.gstNumber || '',
    };

    this.http.post<any>(`${this.apiUrl}/companies`, payload).subscribe({
      next: () => {
        this.commonSvc.showToast('success', 'Company Added', `Company "${company.companyName}" added successfully!`);
        this.fetchCompanies();
      },
      error: () => {
        this.commonSvc.showToast("error", "Failed to add company", "Error occurred while adding company, Pls Contact To admin")
      }
    });
  }

  updateCompany(company: CompanyItem) {
    const payload = {
      name: company.companyName,
      phone: company.phone || "",
      address: company.city || '',
      isActive: company.status !== 'Inactive',
      email: company.email || '',
      contactPerson: company.contactPerson || '',
      gstNumber: company.gstNumber || '',
    };

    this.http.patch(`${this.apiUrl}/companies/${company.id}`, payload).subscribe({
      next: () => {
        this.commonSvc.showToast('success', 'Company Updated', `Company "${company.companyName}" updated successfully!`);

        this.fetchCompanies();
      },
      error: (err) => {
        console.log(err);
        this.commonSvc.showToast("error", "Failed to update company", "Error occurred while updating company, Pls Contact To admin")
      }
    });
  }

  deleteCompany(id: number) {
    this.http.delete(`${this.apiUrl}/companies/${id}`).subscribe({
      next: () => {
        this.fetchCompanies();
      },
      error: () => {
        this.commonSvc.showToast("error", "Failed to delete company", "Error occurred while deleting company, Pls Contact To admin")
      }
    });
  }
}
