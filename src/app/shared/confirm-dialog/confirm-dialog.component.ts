import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  commonService = inject(CommonService);

  @HostListener('document:keydown.escape')
  handleEscape() {
    if (this.commonService.confirmDialog()) {
      this.cancel();
    }
  }

  @HostListener('document:keydown.enter')
  handleEnter() {
    if (this.commonService.confirmDialog()) {
      this.confirm();
    }
  }

  confirm() {
    this.commonService.handleConfirmResult(true);
  }

  cancel() {
    this.commonService.handleConfirmResult(false);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('confirm-backdrop')) {
      this.cancel();
    }
  }

  getIcon(type?: string): string {
    switch (type) {
      case 'danger':
        return 'ri-delete-bin-2-line';
      case 'warning':
        return 'ri-alert-line';
      case 'info':
        return 'ri-information-line';
      case 'success':
        return 'ri-checkbox-circle-line';
      default:
        return 'ri-question-line';
    }
  }
}
