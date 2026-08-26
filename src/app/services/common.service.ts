import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

export interface ConfirmDialogState extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  toasts = signal<ToastMessage[]>([]);
  confirmDialog = signal<ConfirmDialogState | null>(null);
  private toastCounter = 0;

  // Toast Notification
  showToast(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, type, title, message }]);
    setTimeout(() => {
      this.removeToast(id);
    }, 4500);
  }

  removeToast(id: number) {
    this.toasts.update(t => t.filter(item => item.id !== id));
  }

  /**
   * Opens an attractive, animated confirmation popup modal.
   * Returns a promise that resolves to true (confirmed) or false (cancelled).
   */
  confirm(options: ConfirmOptions | string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string'
        ? { message: options }
        : options;

      this.confirmDialog.set({
        title: opts.title || 'Confirm Action',
        message: opts.message,
        subMessage: opts.subMessage,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        type: opts.type || 'danger',
        icon: opts.icon,
        resolve: (result: boolean) => {
          this.confirmDialog.set(null);
          resolve(result);
        }
      });
    });
  }

  handleConfirmResult(result: boolean) {
    const current = this.confirmDialog();
    if (current) {
      current.resolve(result);
    }
  }

  /**
   * Returns today's date formatted as YYYY-MM-DD in local time
   */
  getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Checks whether the given date string (YYYY-MM-DD) is in the past (before today)
   */
  isPastDate(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    const today = this.getTodayDateString();
    return dateStr < today;
  }
}

