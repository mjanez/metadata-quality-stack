import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    return savedTheme || 'light';
  });

  useEffect(() => {
    // Set theme on document root for Bootstrap theme support
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialize theme on first load
  useEffect(() => {
    const initialTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      className="btn btn-outline-secondary"
      onClick={toggleTheme}
      title={t('theme.toggle')}
      aria-label={t('theme.toggle')}
    >
      {theme === 'light' ? (
        <>
          <i className="bi bi-moon-fill me-1"></i>
          {t('theme.dark')}
        </>
      ) : (
        <>
          <i className="bi bi-sun-fill me-1"></i>
          {t('theme.light')}
        </>
      )}
    </button>
  );
};

export default ThemeToggle;