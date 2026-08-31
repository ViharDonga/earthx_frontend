import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // 'light' is default as requested
  currentTheme = signal<'dark' | 'light'>('light');

  constructor() {
    // Check saved local theme, default to 'light'
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('earthx-theme') as 'dark' | 'light' | null;
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme.set(saved);
      } else {
        this.currentTheme.set('light');
      }
    }

    effect(() => {
      const theme = this.currentTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('earthx-theme', theme);
      }
    });
  }

  toggleTheme() {
    this.currentTheme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: 'dark' | 'light') {
    this.currentTheme.set(theme);
  }
}
