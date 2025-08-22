import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationProfile } from '../types';
import mqaConfig from '../config/mqa-config.json';

interface MQAInfoSidebarProps {
  selectedProfile?: ValidationProfile;
  validationResult?: any;
}

const MQAInfoSidebar: React.FC<MQAInfoSidebarProps> = ({ 
  selectedProfile = 'dcat_ap', 
  validationResult = null
}) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);

    const getProfileInfo = (profile: ValidationProfile) => {
    const configProfile = mqaConfig.profiles[profile];
    
    const profileData = {
      'dcat_ap': {
        name: configProfile?.name || 'DCAT-AP',
        badge: 'bg-primary',
        icon: '🇪🇺',
        description: 'European DCAT Application Profile',
        maxPoints: configProfile?.maxScore || 405,
        url: 'https://semiceu.github.io/DCAT-AP/'
      },
      'dcat_ap_es': {
        name: configProfile?.name || 'DCAT-AP-ES',
        badge: 'bg-warning',
        icon: '🇪🇸',
        description: 'Spanish DCAT Application Profile',
        maxPoints: configProfile?.maxScore || 405,
        url: 'https://datos.gob.es/es/documentacion/dcat-ap-es'
      },
      'nti_risp': {
        name: configProfile?.name || 'NTI-RISP',
        badge: 'bg-success',
        icon: '🏛️',
        description: 'Spanish Technical Norm for Reuse',
        maxPoints: configProfile?.maxScore || 310,
        url: 'https://www.boe.es/eli/es/res/2013/02/19/(4)'
      }
    };
    return profileData[profile] || profileData['dcat_ap'];
  };

  const profileInfo = getProfileInfo(selectedProfile);
  
  const getRatingRanges = (maxPoints: number) => {
    // Calculate ranges based on percentage ranges: 85%+, 55-84%, 30-54%, 0-29%
    const excellent = Math.round(maxPoints * 0.85);
    const good = Math.round(maxPoints * 0.55);
    const sufficient = Math.round(maxPoints * 0.30);
    
    return [
      { label: t('ratings.excellent'), points: `${excellent}-${maxPoints}`, color: 'success' },
      { label: t('ratings.good'), points: `${good}-${excellent-1}`, color: 'warning' },
      { label: t('ratings.sufficient'), points: `${sufficient}-${good-1}`, color: 'info' },
      { label: t('ratings.poor'), points: `0-${sufficient-1}`, color: 'danger' }
    ];
  };

  const ratings = getRatingRanges(profileInfo.maxPoints);

  return (
    <>
      {/* Fixed Sidebar */}
      <div 
        className="mqa-sidebar position-fixed top-0 start-0 h-100 border-end shadow-sm"
        style={{
          zIndex: 1040,
          paddingTop: '76px' // Account for navbar height
        }}
      >
        {/* Sidebar Content */}
        <div className="p-3 h-100 overflow-auto">
            {/* Profile Banner */}
            <div className="card mb-3 border-0 bg-gradient">
              <div className="card-body text-center py-3">
                <div className="mb-2">
                  <span className="fs-1" role="img" aria-label={profileInfo.name}>
                    {profileInfo.icon}
                  </span>
                </div>
                <h6 className="card-title mb-1">
                  <span className={`badge ${profileInfo.badge} fs-6`}>
                    {profileInfo.name}
                  </span>
                </h6>
                <small className="text-muted d-block">
                  {profileInfo.description}
                </small>
                {validationResult && (
                  <div className="mt-2">
                    <div className="badge bg-primary fs-6">
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
                      <div className="card bg-light border-0">
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-primary">
                            {validationResult.quality.totalScore}
                          </div>
                          <small className="text-muted">{t('sidebar.total_score')}</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card bg-light border-0">
                        <div className="card-body py-2">
                          <div className="fs-6 fw-bold text-success">
                            {validationResult.stats.triples.toLocaleString()}
                          </div>
                          <small className="text-muted">{t('sidebar.triples')}</small>
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
                  {t('sidebar.mqa_description')}
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
                    { key: 'findability', icon: '🔍', letter: 'F' },
                    { key: 'accessibility', icon: '🔓', letter: 'A' },
                    { key: 'interoperability', icon: '🔗', letter: 'I' },
                    { key: 'reusability', icon: '♻️', letter: 'R' },
                    { key: 'contextuality', icon: '📋', letter: 'C' }
                  ].map(({ key, icon, letter }) => (
                    <div key={key} className="list-group-item border-0 px-0 py-1">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary rounded-circle me-2" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                          {letter}
                        </span>
                        <span className="me-2">{icon}</span>
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