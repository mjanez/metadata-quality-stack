import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const { t } = useTranslation();
  const defaultMessage = message || t('common.loading');
  
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">{t('common.loading')}</span>
      </div>
      <div className="mt-3">
        <p className="text-muted">{defaultMessage}</p>
        <small className="text-muted">
          <i>{t('common.validating_spin')}</i>
        </small>
      </div>
    </div>
  );
};

export default LoadingSpinner;
