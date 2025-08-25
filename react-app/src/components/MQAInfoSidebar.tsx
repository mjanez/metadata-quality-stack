import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationProfile } from '../types';
import mqaConfig from '../config/mqa-config.json';

interface MQAInfoSidebarProps {
  selectedProfile?: ValidationProfile;
  validationResult?: any;
  isVisible?: boolean;
  onToggle?: () => void;
}

const MQAInfoSidebar: React.FC<MQAInfoSidebarProps> = ({ 
  selectedProfile = 'dcat_ap_es', 
  validationResult = null,
  isVisible = true,
  onToggle
}) => {
  const { t } = useTranslation();

    const getProfileInfo = (profile: ValidationProfile) => {
    const configProfile = mqaConfig.profiles[profile];
    
    const profileData = {
      'dcat_ap': {
        name: configProfile?.name || 'DCAT-AP',
        style: 'text-primary',
        icon: 'img/icons/eur.svg', // EU flag SVG
        description: t('profiles.dcat_ap_desc'),
        maxPoints: configProfile?.maxScore || 405,
        url: 'https://semiceu.github.io/DCAT-AP/'
      },
      'dcat_ap_es': {
        name: configProfile?.name || 'DCAT-AP-ES',
        style: 'text-primary',
        icon: 'img/icons/esp.svg', // Spain flag SVG
        description: t('profiles.dcat_ap_es_desc'),
        maxPoints: configProfile?.maxScore || 405,
        url: 'https://datosgobes.github.io/DCAT-AP-ES/'
      },
      'nti_risp': {
        name: configProfile?.name || 'NTI-RISP',
        style: 'text-primary',
        icon: 'img/icons/esp.svg', // Spain flag SVG
        description: t('profiles.nti_risp_desc'),
        maxPoints: configProfile?.maxScore || 310,
        url: 'https://www.boe.es/eli/es/res/2013/02/19/(4)'
      }
    };
    return profileData[profile] || profileData['dcat_ap_es'];
  };

  const profileInfo = getProfileInfo(selectedProfile);
  
  const getRatingRanges = (maxPoints: number) => {
    // Calculate ranges based on percentage ranges: 85%+, 55-84%, 30-54%, 0-29%
    const excellent = Math.round(maxPoints * 0.85);
    const good = Math.round(maxPoints * 0.55);
    const sufficient = Math.round(maxPoints * 0.30);
    
    return [
      { label: t('ratings.excellent'), points: `${excellent}-${maxPoints}`, color: 'success' },
      { label: t('ratings.good'), points: `${good}-${excellent-1}`, color: 'success-light' },
      { label: t('ratings.sufficient'), points: `${sufficient}-${good-1}`, color: 'warning' },
      { label: t('ratings.poor'), points: `0-${sufficient-1}`, color: 'danger' }
    ];
  };

  const getBadgeColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-success';      // Excellent - Dark Green
    if (percentage >= 55) return 'bg-success-light'; // Good - Light Green
    if (percentage >= 30) return 'bg-warning';       // Sufficient - Warning (Yellow)
    return 'bg-danger';                             // Poor - Red
  };

  const ratings = getRatingRanges(profileInfo.maxPoints);

  return (
    <>
      {/* Sidebar Toggle Button for Mobile */}
      <button
        className="btn btn-primary position-fixed d-lg-none"
        style={{
          top: '80px',
          left: !isVisible ? '10px' : '310px',
          zIndex: 1050,
          transition: 'left 0.3s ease-in-out'
        }}
        onClick={onToggle}
        aria-label={!isVisible ? t('sidebar.expand') : t('sidebar.collapse')}
      >
        <i className={`bi bi-${!isVisible ? 'layout-sidebar' : 'x-lg'}`}></i>
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isVisible && (
        <div 
          className="position-fixed w-100 h-100 d-lg-none"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1030,
            top: 0,
            left: 0
          }}
          onClick={onToggle}
        />
      )}

      {/* Responsive Sidebar */}
      <div 
        className={`mqa-sidebar position-fixed top-0 h-100 border-end shadow-sm ${!isVisible ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
        style={{
          zIndex: 1040,
          paddingTop: '76px',
          transform: !isVisible ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {/* Sidebar Content */}
        <div className="p-3 h-100 overflow-auto">
            {/* Profile Banner */}
            <div className="card mb-3 border-0 bg-gradient">
              <div className="card-body text-center py-3">
                <div className="mb-2">
                  <img 
                    src={profileInfo.icon} 
                    alt={profileInfo.name}
                    className="rounded-circle"
                    style={{ 
                      width: '3rem', 
                      height: '3rem',
                      objectFit: 'cover'
                    }}
                    aria-label={profileInfo.name}
                  />
                </div>
                <h6 className="card-title mb-1">
                  <span className={`${profileInfo.style} fw-bold fs-5`}>
                    {profileInfo.name}
                  </span>
                </h6>
                <small className="text-muted d-block">
                  {profileInfo.description}
                </small>
                {validationResult && (
                  <div className="mt-2">
                    <div className={`badge ${getBadgeColor(validationResult.quality.percentage)} fs-6`}>
                      {validationResult.quality.percentage.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Validation Stats - Show only when there are results */}
            {validationResult && (
              <div className="card mb-3">
                <div className="card-header py-2">
                  <h6 className="card-title mb-0">
                    <i className="bi bi-graph-up me-2"></i>
                    {t('sidebar.current_validation')}
                  </h6>
                </div>
                <div className="card-body py-2">
                  <div className="row g-2 text-center">
                    <div className="col-6">
                      <div className="card border-0" style={{ backgroundColor: 'var(--bs-secondary-bg)' }}>
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-primary">
                            {validationResult.quality.totalScore}
                          </div>
                          <small className="text-muted small-summary">{t('sidebar.total_score')}</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card border-0" style={{ backgroundColor: 'var(--bs-secondary-bg)' }}>
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-info">
                            {validationResult.stats.datasets}
                          </div>
                          <small className="text-muted small-summary">{t('sidebar.datasets')}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row g-2 text-center mt-1">
                    <div className="col-6">
                      <div className="card border-0" style={{ backgroundColor: 'var(--bs-secondary-bg)' }}>
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-warning">
                            {validationResult.stats.dataServices}
                          </div>
                          <small className="text-muted small-summary">{t('sidebar.data_services')}</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card border-0" style={{ backgroundColor: 'var(--bs-secondary-bg)' }}>
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-success">
                            {validationResult.stats.distributions}
                          </div>
                          <small className="text-muted small-summary">{t('sidebar.distributions')}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="progress mt-2" style={{ height: '6px' }}>
                    <div
                      className={`progress-bar ${
                        validationResult.quality.percentage >= 80 ? 'bg-success' :
                        validationResult.quality.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                      }`}
                      style={{ width: `${validationResult.quality.percentage}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    {validationResult.quality.totalScore} / {validationResult.quality.maxScore} ({validationResult.quality.percentage.toFixed(1)}%)
                  </small>
                </div>
              </div>
            )}

            {/* MQA Information */}
            <div className="card mb-3">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  {t('sidebar.about_mqa')}
                </h6>
              </div>
              <div className="card-body py-2">
                <p className="small mb-2">
                  {t('sidebar.mqa_description')} <strong>{profileInfo.name}</strong>.
                </p>
                <a 
                  href={profileInfo.url}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm w-100"
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  {t('sidebar.learn_more')}
                </a>
              </div>
            </div>

            {/* FAIR+C Principles */}
            <div className="card mb-3">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="bi bi-list-check me-2"></i>
                  {t('sidebar.fairc_principles')}
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="list-group list-group-flush">
                  {[
                    { key: 'findability', icon: 'bi-search', letter: 'F' },
                    { key: 'accessibility', icon: 'bi-unlock', letter: 'A' },
                    { key: 'interoperability', icon: 'bi-link-45deg', letter: 'I' },
                    { key: 'reusability', icon: 'bi-recycle', letter: 'R' },
                    { key: 'contextuality', icon: 'bi-clipboard-data', letter: 'C' }
                  ].map(({ key, icon, letter }) => (
                    <div key={key} className="list-group-item border-0 px-0 py-1">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary rounded-circle me-2" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                          {letter}
                        </span>
                        <i className={`${icon} me-2`}></i>
                        <small className="flex-grow-1">
                          <strong>{t(`dimensions.${key}`)}</strong>
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rating Scale */}
            <div className="card mb-3">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="bi bi-star me-2"></i>
                  {t('sidebar.rating_scale')}
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th className="border-0 py-1 small">{t('sidebar.rating')}</th>
                        <th className="border-0 py-1 small text-end">{t('sidebar.points')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratings.map((rating, index) => (
                        <tr key={index}>
                          <td className="border-0 py-1">
                            <span className={`badge bg-${rating.color} small`}>
                              {rating.label}
                            </span>
                          </td>
                          <td className="border-0 py-1 text-end small font-monospace">
                            {rating.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <small className="text-muted mt-2 d-block">
                  {t('sidebar.max_points')}: {profileInfo.maxPoints}
                </small>
              </div>
            </div>

            {/* Quick Links */}
            <div className="card">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="bi bi-link-45deg me-2"></i>
                  {t('sidebar.quick_links')}
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="d-grid gap-2">
                  <a 
                    href="https://data.europa.eu/mqa/methodology?locale=en"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-info btn-sm"
                  >
                    <i className="bi bi-journal-text me-1"></i>
                    {t('sidebar.mqa_methodology')}
                  </a>
                  <a 
                    href="https://www.go-fair.org/fair-principles/"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <i className="bi bi-book me-1"></i>
                    {t('sidebar.fair_principles')}
                  </a>
                  <a 
                    href="https://github.com/mjanez/metadata-quality-stack"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-dark btn-sm"
                  >
                    <i className="bi bi-github me-1"></i>
                    {t('sidebar.github_repository')}
                  </a>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Content Offset */}
      <div 
        style={{
          marginLeft: '350px'
        }}
      />
    </>
  );
};

export default MQAInfoSidebar;