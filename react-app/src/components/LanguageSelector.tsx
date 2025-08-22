import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-secondary dropdown-toggle"
        type="button"
        id="languageDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={t('language.select')}
      >
        <i className="bi bi-translate me-1"></i>
        {i18n.language === 'es' ? 'ES' : 'EN'}
      </button>
      <ul className="dropdown-menu" aria-labelledby="languageDropdown">
        <li>
          <button
            className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
          >
            🇺🇸 {t('language.english')}
          </button>
        </li>
        <li>
          <button
            className={`dropdown-item ${i18n.language === 'es' ? 'active' : ''}`}
            onClick={() => changeLanguage('es')}
          >
            🇪🇸 {t('language.spanish')}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LanguageSelector;