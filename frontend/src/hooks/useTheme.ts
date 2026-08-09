import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPreference ? 'dark' : 'light';
    }
    return 'light';
  });

  const [easyRead, setEasyRead] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('easyRead') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (easyRead) {
      root.classList.add('easy-read');
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('easy-read');
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('easyRead', String(easyRead));
  }, [easyRead]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleEasyRead = () => {
    setEasyRead(prev => !prev);
  };

  return { theme, toggleTheme, easyRead, toggleEasyRead };
}

