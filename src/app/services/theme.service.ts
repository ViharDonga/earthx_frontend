import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // 'light' by default, or 'dark'
  currentTheme = signal<'dark' | 'light'>('light');

  constructor() {
    // Check saved local theme or default to 'light'
    const saved = localStorage.getItem('earthx-theme') as 'dark' | 'light' | null;
    const initialTheme: 'dark' | 'light' = saved === 'dark' ? 'dark' : 'light';
    this.currentTheme.set(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    effect(() => {
      const theme = this.currentTheme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('earthx-theme', theme);
    });
  }

  toggleTheme() {
    this.currentTheme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: 'dark' | 'light') {
    this.currentTheme.set(theme);
  }
}
