import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

export interface UserRole {
  id: string;
  name: string;
  badge: string;
  icon: string;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  // Current active view: 'login' | 'register'
  activeTab = signal<'login' | 'register'>('login');

  // Password visibility toggles
  showLoginPassword = signal(false);
  showRegisterPassword = signal(false);
  showRegisterConfirmPassword = signal(false);

  // Submitting state
  isSubmitting = signal(false);

  // Login Form Data
  loginData = {
    username: '',
    password: '',
    rememberMe: true
  };

  // Register Form Data (Dropdown role: Super User or User)
  registerData = {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    selectedRoleId: 'user', // Default to User
    password: '',
    confirmPassword: '',
    agreeTerms: true,
    status: 'pending'
  };

  // Roles: Super User & User
  availableRoles: UserRole[] = [
    { id: 'super-user', name: 'Super User', badge: 'Full Control & Master Access', icon: 'ri-shield-user-line' },
    { id: 'user', name: 'User', badge: 'Standard Operations', icon: 'ri-user-3-line' }
  ];

  // Toasts
  toasts = signal<ToastMessage[]>([]);
  private toastCounter = 0;

  constructor(
    private router: Router,
    public authService: AuthService,
    public themeService: ThemeService
  ) { }

  // Selected Role
  selectedRole = computed(() => {
    return this.availableRoles.find(r => r.id === this.registerData.selectedRoleId) || this.availableRoles[0];
  });

  // Password Strength
  passwordStrength = computed(() => {
    const pwd = this.registerData.password || '';
    if (!pwd) return { score: 0, text: 'Not entered', color: '#64748b', width: '0%' };

    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;

    if (score <= 25) return { score, text: 'Weak', color: '#ef4444', width: '25%' };
    if (score <= 50) return { score, text: 'Fair', color: '#f59e0b', width: '50%' };
    if (score <= 75) return { score, text: 'Good', color: '#3b82f6', width: '75%' };
    return { score, text: 'Strong & Secure', color: '#10b981', width: '100%' };
  });

  // Switch tab
  switchTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
  }

  // Handle Login with NestJS Backend API
  handleLogin() {
    if (!this.loginData.username || !this.loginData.password) {
      this.showToast('warning', 'Missing Credentials', 'Please enter your email and password.');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.login({
      email: this.loginData.username.trim(),
      password: this.loginData.password
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast('success', 'Authentication Successful', `Welcome back, ${res.user.name}! Redirecting...`);
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 600);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMsg = Array.isArray(err.error?.message)
          ? err.error.message.join(', ')
          : (err.error?.message || 'Login failed. Please check your credentials or backend server.');
        this.showToast('error', 'Authentication Failed', errorMsg);
      }
    });
  }

  // Handle Register with NestJS Backend API
  handleRegister() {
    if (!this.registerData.fullName || !this.registerData.email || !this.registerData.password) {
      this.showToast('warning', 'Incomplete Form', 'Please complete all required fields.');
      return;
    }

    if (this.registerData.password.length < 6) {
      this.showToast('warning', 'Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.showToast('error', 'Password Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    this.isSubmitting.set(true);

    const phoneVal = (this.registerData.phone || '').trim();

    this.authService.register({
      name: this.registerData.fullName.trim(),
      email: this.registerData.email.trim(),
      password: this.registerData.password,
      role: this.registerData.selectedRoleId,
      phone: phoneVal,
      status: 'pending'
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast('success', 'Registration Complete', `Account created successfully for ${res.user.name}. Please Contact Admin and Get Approved Login Request.`);
        this.loginData.username = this.registerData.email;
        this.activeTab.set('login');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMsg = Array.isArray(err.error?.message)
          ? err.error.message.join(', ')
          : (err.error?.message || 'Registration failed. Please check backend server.');
        this.showToast('error', 'Registration Failed', errorMsg);
      }
    });
  }

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
}
