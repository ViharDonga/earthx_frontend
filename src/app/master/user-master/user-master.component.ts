import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { CommonService } from '../../services/common.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-master.component.html',
  styleUrl: './user-master.component.scss'
})
export class UserMasterComponent implements OnInit {
  userService = inject(UserService);
  commonService = inject(CommonService);

  ngOnInit() {
    this.userService.fetchUsers();
  }

  searchQuery = signal<string>('');
  selectedStatusFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  showAddUserModal = signal<boolean>(false);
  showEditUserModal = signal<boolean>(false);
  showViewUserModal = signal<boolean>(false);
  selectedUser = signal<User | null>(null);

  editFormData: Partial<User> = {
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'pending',
    isActive: true
  };

  get filteredUsers(): User[] {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedStatusFilter();

    return this.userService.users().filter(user => {
      // Status & Active Filters
      if (filter === 'PENDING' && (user.status || '').toLowerCase() !== 'pending') return false;
      if (filter === 'APPROVED' && (user.status || '').toLowerCase() !== 'approved') return false;
      if (filter === 'REJECTED' && (user.status || '').toLowerCase() !== 'rejected') return false;
      if (filter === 'ACTIVE' && !user.isActive) return false;
      if (filter === 'INACTIVE' && user.isActive) return false;

      // Text Search
      if (!query) return true;
      return (
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phone && user.phone.toLowerCase().includes(query)) ||
        (user.role && user.role.toLowerCase().includes(query)) ||
        (user.status && user.status.toLowerCase().includes(query))
      );
    });
  }

  get pendingCount(): number {
    return this.userService.users().filter(u => (u.status || '').toLowerCase() === 'pending').length;
  }

  get approvedCount(): number {
    return this.userService.users().filter(u => (u.status || '').toLowerCase() === 'approved').length;
  }

  get rejectedCount(): number {
    return this.userService.users().filter(u => (u.status || '').toLowerCase() === 'rejected').length;
  }

  get activeCount(): number {
    return this.userService.users().filter(u => u.isActive).length;
  }

  get inactiveCount(): number {
    return this.userService.users().filter(u => !u.isActive).length;
  }

  setStatusFilter(filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'INACTIVE') {
    this.selectedStatusFilter.set(filter);
  }

  /**
   * Approve User with confirmation
   */
  async approveUser(user: User) {
    const confirmed = await this.commonService.confirm({
      title: 'Approve User',
      message: `Are you sure you want to approve "${user.name || user.email}"?`,
      subMessage: `Role: ${user.role || 'user'} | Email: ${user.email}`,
      confirmText: 'Approve User',
      cancelText: 'Cancel',
      type: 'success',
      icon: 'ri-checkbox-circle-line'
    });

    if (confirmed) {
      this.userService.approveUser(user);
    }
  }

  /**
   * Reject User with confirmation
   */
  async rejectUser(user: User) {
    const confirmed = await this.commonService.confirm({
      title: 'Reject User',
      message: `Are you sure you want to reject "${user.name || user.email}"?`,
      subMessage: `This user will not be allowed system access.`,
      confirmText: 'Reject User',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'ri-close-circle-line'
    });

    if (confirmed) {
      this.userService.rejectUser(user);
    }
  }

  /**
   * Toggle User Active / Inactive
   */
  async toggleActive(user: User) {
    const nextState = !user.isActive;
    const actionWord = nextState ? 'Activate' : 'Deactivate';

    const confirmed = await this.commonService.confirm({
      title: `${actionWord} User`,
      message: `Are you sure you want to ${actionWord.toLowerCase()} "${user.name || user.email}"?`,
      subMessage: nextState ? 'User will regain active status.' : 'User will be temporarily disabled.',
      confirmText: `${actionWord} User`,
      cancelText: 'Cancel',
      type: nextState ? 'success' : 'warning',
      icon: nextState ? 'ri-toggle-fill' : 'ri-toggle-line'
    });

    if (confirmed) {
      this.userService.toggleActive(user, nextState);
    }
  }

  openEditUser(user: User) {
    this.selectedUser.set(user);
    this.editFormData = {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      status: (user.status || 'pending').toLowerCase(),
      isActive: user.isActive !== false
    };
    this.showEditUserModal.set(true);
  }

  saveEditUser() {
    if (!this.selectedUser()) return;

    this.userService.updateUser(this.selectedUser()!.id, {
      name: this.editFormData.name,
      phone: this.editFormData.phone,
      role: this.editFormData.role,
      status: this.editFormData.status,
      isActive: this.editFormData.isActive
    });

    this.showEditUserModal.set(false);
  }

  viewUser(user: User) {
    this.selectedUser.set(user);
    this.showViewUserModal.set(true);
  }

  getUserDisplayName(user: User): string {
    if (user.name && user.name.trim() && user.name.trim() !== 'null') {
      return user.name;
    }
    if (user.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'User';
  }

  getUserInitials(name?: string, email?: string): string {
    if (name && name.trim() && name.trim() !== 'null') {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
