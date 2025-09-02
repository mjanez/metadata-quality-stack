import React from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationTab } from '../types';

interface ValidationTabsProps {
  tabs: ValidationTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  maxTabs: number;
}

const ValidationTabs: React.FC<ValidationTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  maxTabs
}) => {
  const { t } = useTranslation();

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return t('time.justNow');
    } else if (diffMinutes < 60) {
      return t('time.minutesAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('time.hoursAgo', { count: diffHours });
    } else {
      return t('time.daysAgo', { count: diffDays });
    }
  };

  const getTabIcon = (tab: ValidationTab) => {
    if (tab.isValidating) {
      return <i className="bi bi-hourglass-split me-2 text-warning"></i>;
    }
    if (tab.error) {
      return <i className="bi bi-exclamation-triangle me-2 text-danger"></i>;
    }
    if (tab.result) {
      const percentage = tab.result.quality.percentage;
      // Usar icono de información con el mismo color que el badge
      if (percentage >= 85) {
        return <i className="bi bi-info-circle me-2 text-success"></i>;      // Excellent - Verde oscuro
      } else if (percentage >= 55) {
        return <i className="bi bi-info-circle me-2 text-success-light"></i>; // Good - Verde claro
      } else if (percentage >= 30) {
        return <i className="bi bi-info-circle me-2 text-warning"></i>;      // Sufficient - Amarillo
      } else {
        return <i className="bi bi-info-circle me-2 text-danger"></i>;       // Poor - Rojo
      }
    }
    return <i className="bi bi-file-earmark me-2"></i>;
  };

  const getTabBadge = (tab: ValidationTab) => {
    if (tab.result) {
      const percentage = tab.result.quality.percentage;
      // Usar la misma escala de colores que la aplicación principal
      let badgeClass: string;
      
      if (percentage >= 85) {
        badgeClass = 'bg-success';      // Excellent - Verde oscuro (85%+)
      } else if (percentage >= 55) {
        badgeClass = 'bg-success-light';      // Good - Verde (55-84%) - usaremos style para el color claro
      } else if (percentage >= 30) {
        badgeClass = 'bg-warning';      // Sufficient - Amarillo (30-54%)
      } else {
        badgeClass = 'bg-danger';       // Poor - Rojo (0-29%)
      }
      
      const isGoodRating = percentage >= 55 && percentage < 85;
      
      return (
        <span 
          className={`badge ${badgeClass} ms-2`}
          style={isGoodRating ? { backgroundColor: '#7dd87d' } : undefined}
        >
          {percentage.toFixed(1)}%
        </span>
      );
    }
    return null;
  };

  const getTabTitle = (tab: ValidationTab) => {
    const timeAgo = formatTimeAgo(tab.createdAt);
    
    let status = t('tabs.new');
    if (tab.isValidating) {
      status = t('tabs.validating');
    } else if (tab.error) {
      status = t('tabs.error');
    } else if (tab.result) {
      status = `${tab.result.quality.percentage.toFixed(1)}% - ${t(`profiles.${tab.result.profile}`)}`;
    }

    return `${tab.name}\n${status}\n${timeAgo}`;
  };

  return (
    <div className="validation-tabs mb-3">
      <ul className="nav nav-tabs" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item d-flex" role="presentation">
            <button
              className={`nav-link d-flex align-items-center ${
                activeTabId === tab.id ? 'active' : ''
              }`}
              onClick={() => onTabSelect(tab.id)}
              type="button"
              role="tab"
              title={getTabTitle(tab)}
              style={{ maxWidth: '300px' }}
            >
              {getTabIcon(tab)}
              <span className="text-truncate me-2" style={{ maxWidth: '200px' }}>
                {tab.name}
              </span>
              {getTabBadge(tab)}
            </button>
            
            {tabs.length > 1 && (
              <button
                className="btn btn-sm btn-outline-secondary border-start-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                title={t('tabs.close')}
                style={{ 
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  marginLeft: '-1px'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </li>
        ))}
        
        {tabs.length < maxTabs && (
          <li className="nav-item" role="presentation">
            <button
              className="nav-link border-0"
              onClick={onNewTab}
              type="button"
              title={t('tabs.new')}
            >
              <i className="bi bi-plus-lg"></i>
            </button>
          </li>
        )}
      </ul>
      
      {tabs.length >= maxTabs && (
        <div className="alert alert-info mt-2 mb-0">
          <i className="bi bi-info-circle me-2"></i>
          {t('tabs.maxTabsReached', { max: maxTabs })}
        </div>
      )}
    </div>
  );
};

export default ValidationTabs;