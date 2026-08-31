import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';
import { CommonService } from './common.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private commonSvc: CommonService
  ) {}

  fetchUsers(query?: { status?: string; role?: string; search?: string }) {
    this.isLoading.set(true);
    let params: any = {};
    if (query?.status) params.status = query.status;
    if (query?.role) params.role = query.role;
    if (query?.search) params.search = query.search;

    this.http.get<User[]>(`${this.apiUrl}/users`, { params }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.users.set(res || []);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.commonSvc.showToast(
          'error',
          'Failed to load users',
          err?.error?.message || 'Error occurred while loading users from server.'
        );
      }
    });
  }

  /**
   * Approve pending user
   */
  approveUser(user: User) {
    this.http.patch<User>(`${this.apiUrl}/users/${user.id}/status`, { status: 'approved' }).subscribe({
      next: (updatedUser) => {
        this.commonSvc.showToast(
          'success',
          'User Approved',
          `User "${user.name || user.email}" has been approved successfully!`
        );
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, status: 'approved' } : u));
      },
      error: (err: any) => {
        this.commonSvc.showToast(
          'error',
          'Approval Failed',
          err?.error?.message || 'Failed to approve user. Please try again.'
        );
      }
    });
  }

  /**
   * Reject user status
   */
  rejectUser(user: User) {
    this.http.patch<User>(`${this.apiUrl}/users/${user.id}/status`, { status: 'rejected' }).subscribe({
      next: (updatedUser) => {
        this.commonSvc.showToast(
          'info',
          'User Rejected',
          `User "${user.name || user.email}" status updated to rejected.`
        );
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, status: 'rejected' } : u));
      },
      error: (err: any) => {
        this.commonSvc.showToast(
          'error',
          'Rejection Failed',
          err?.error?.message || 'Failed to reject user.'
        );
      }
    });
  }

  /**
   * Toggle Active / Inactive state for user
   */
  toggleActive(user: User, nextActiveState?: boolean) {
    const targetState = typeof nextActiveState === 'boolean' ? nextActiveState : !user.isActive;

    this.http.patch<User>(`${this.apiUrl}/users/${user.id}/active`, { isActive: targetState }).subscribe({
      next: (updatedUser) => {
        const stateLabel = targetState ? 'Activated' : 'Deactivated';
        this.commonSvc.showToast(
          'success',
          `User ${stateLabel}`,
          `User "${user.name || user.email}" is now ${targetState ? 'Active' : 'Inactive'}.`
        );
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, isActive: targetState } : u));
      },
      error: (err: any) => {
        this.commonSvc.showToast(
          'error',
          'Status Update Failed',
          err?.error?.message || 'Failed to update user active status.'
        );
      }
    });
  }

  /**
   * Update full user details or role
   */
  updateUser(id: string, payload: Partial<User>) {
    this.http.patch<User>(`${this.apiUrl}/users/${id}`, payload).subscribe({
      next: (updatedUser) => {
        this.commonSvc.showToast(
          'success',
          'User Updated',
          `User "${updatedUser.name || updatedUser.email}" updated successfully.`
        );
        this.fetchUsers();
      },
      error: (err: any) => {
        this.commonSvc.showToast(
          'error',
          'Update Failed',
          err?.error?.message || 'Failed to update user details.'
        );
      }
    });
  }

  /**
   * Delete / Deactivate user
   */
  deleteUser(id: string, name: string) {
    this.http.delete(`${this.apiUrl}/users/${id}`).subscribe({
      next: () => {
        this.commonSvc.showToast(
          'success',
          'User Deactivated',
          `User "${name}" has been deactivated.`
        );
        this.fetchUsers();
      },
      error: (err: any) => {
        this.commonSvc.showToast(
          'error',
          'Delete Failed',
          err?.error?.message || 'Failed to delete/deactivate user.'
        );
      }
    });
  }
}
