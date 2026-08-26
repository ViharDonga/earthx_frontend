import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // 'dark' or 'light'
  currentTheme = signal<'dark' | 'light'>('dark');

  constructor() {
    // Check saved local theme or system preference
    const saved = localStorage.getItem('earthx-theme') as 'dark' | 'light' | null;
    if (saved) {
      this.currentTheme.set(saved);
    }

    effect(() => {
      const theme = this.currentTheme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('earthx-theme', theme);
    });
  }

  toggleTheme() {
    this.currentTheme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: 'dark' | 'light') {
    this.currentTheme.set(theme);
  }
}
