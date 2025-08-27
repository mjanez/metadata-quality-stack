import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SHACLReport, SHACLViolation, SHACLSeverity } from '../types';
import { PrefixService } from '../services/PrefixService';
import { SHACLMessageService, LocalizedMessage } from '../services/SHACLMessageService';

interface SHACLReportViewerProps {
  report: SHACLReport;
  onExportReport?: () => void;
  onExportCSV?: () => void;
}

const SHACLReportViewer: React.FC<SHACLReportViewerProps> = ({ 
  report, 
  onExportReport,
  onExportCSV
}) => {
  const { t, i18n } = useTranslation();
  const [selectedSeverity, setSelectedSeverity] = useState<SHACLSeverity | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'compliance' | 'validation'>('compliance');
  const [prefixService] = useState(() => PrefixService.getInstance());
  const [prefixesLoaded, setPrefixesLoaded] = useState(false);

  // Load prefixes on component mount
  useEffect(() => {
    const loadPrefixes = async () => {
      if (!prefixService.isLoaded()) {
        await prefixService.loadPrefixes();
        setPrefixesLoaded(true);
      } else {
        setPrefixesLoaded(true);
      }
    };
    
    loadPrefixes();
  }, [prefixService]);

  /**
   * Filter SHACL messages by current language using the new service
   */
  const filterMessagesByLanguage = (messages: string[]): LocalizedMessage[] => {
    const currentLanguage = i18n.language;
    const allMessages: LocalizedMessage[] = [];
    
    // Parse all messages to extract language information
    for (const message of messages) {
      const parsed = SHACLMessageService.parseMessages(message);
      allMessages.push(...parsed);
    }
    
    // Filter by current language
    return SHACLMessageService.filterMessagesByLanguage(allMessages, currentLanguage);
  };

  const getComplianceColor = (conforms: boolean) => {
    return conforms ? 'text-success' : 'text-danger';
  };

  const getComplianceIcon = (conforms: boolean) => {
    return conforms ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
  };

  const getSeverityColor = (severity: SHACLSeverity) => {
    switch (severity) {
      case 'Violation': return 'text-danger';
      case 'Warning': return 'text-warning';
      case 'Info': return 'text-info';
      default: return 'text-muted';
    }
  };

  const getSeverityIcon = (severity: SHACLSeverity) => {
    switch (severity) {
      case 'Violation': return 'bi-exclamation-triangle-fill';
      case 'Warning': return 'bi-exclamation-circle-fill';
      case 'Info': return 'bi-info-circle-fill';
      default: return 'bi-question-circle';
    }
  };

  const getSeverityBadgeClass = (severity: SHACLSeverity) => {
    switch (severity) {
      case 'Violation': return 'bg-danger';
      case 'Warning': return 'bg-warning';
      case 'Info': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getFilteredViolations = () => {
    const allViolations = [...report.violations, ...report.warnings, ...report.infos];
    
    if (selectedSeverity === 'all') {
      return allViolations;
    }
    
    return allViolations.filter(v => v.severity === selectedSeverity);
  };

  const formatPath = (path?: string) => {
    if (!path) return t('shacl.no_path');
    
    // Use PrefixService to contract URI to prefixed form
    if (prefixesLoaded) {
      const contractedPath = prefixService.contractURI(path);
      return contractedPath;
    }
    
    // Fallback to old behavior if prefixes not loaded
    const lastSlash = path.lastIndexOf('/');
    const lastHash = path.lastIndexOf('#');
    const separator = Math.max(lastSlash, lastHash);
    
    if (separator > -1) {
      return path.substring(separator + 1);
    }
    
    return path;
  };

  const formatConstraintComponent = (component: string) => {
    // Extract local name from constraint component URI
    if (component.includes('#')) {
      return component.split('#').pop() || component;
    }
    if (component.includes('/')) {
      return component.split('/').pop() || component;
    }
    return component;
  };

  const isURL = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const renderClickableText = (text: string, className = '') => {
    if (isURL(text)) {
      return (
        <a 
          href={text} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${className} text-decoration-none`}
          title={t('shacl.open_link')}
        >
          {text}
          <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.75em' }}></i>
        </a>
      );
    }
    return <span className={className}>{text}</span>;
  };

  /**
   * Render message text with clickable URLs
   */
  const renderMessageWithURLs = (message: LocalizedMessage) => {
    const processed = SHACLMessageService.processURLsInText(message.text);
    
    if (!processed.hasUrls) {
      return <span>{message.text}</span>;
    }
    
    // Split text by URL markers and render each part
    const parts = processed.text.split(/(<URL:[^>]+>)/);
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part.startsWith('<URL:') && part.endsWith('>')) {
            const url = part.slice(5, -1); // Remove <URL: and >
            return (
              <a 
                key={index}
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-decoration-none"
                title={t('shacl.open_link')}
              >
                {url}
                <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.75em' }}></i>
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  const renderViolationCard = (violation: SHACLViolation, index: number) => (
    <div key={index} className="card mb-2">
      <div className="card-body p-3">
        <div className="d-flex align-items-start">
          <i className={`${getSeverityIcon(violation.severity)} ${getSeverityColor(violation.severity)} me-2 mt-1`}></i>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="card-title mb-0">
                <span className={`badge ${getSeverityBadgeClass(violation.severity)} me-2`}>
                  {violation.severity}
                </span>
                {formatConstraintComponent(violation.sourceConstraintComponent)}
              </h6>
              {violation.path && (
                <small className="text-muted">
                  <code>{formatPath(violation.path)}</code>
                </small>
              )}
            </div>
            
            <div className="mb-2">
              {filterMessagesByLanguage(violation.message).map((msg, msgIndex) => (
                <p key={msgIndex} className="mb-1 text-muted">
                  {renderMessageWithURLs(msg)}
                  {msg.language && (
                    <span className="ms-2">
                      <i className={`fi fi-${msg.language === 'es' ? 'es' : 'us'} fis`} 
                         title={msg.language === 'es' ? 'Español' : 'English'}
                         style={{ fontSize: '0.8em' }}></i>
                    </span>
                  )}
                </p>
              ))}
            </div>
            
            {violation.focusNode && (
              <div className="mb-1">
                <strong>{t('shacl.focus_node')}:</strong>{' '}
                {renderClickableText(violation.focusNode, 'text-primary small')}
              </div>
            )}
            
            {violation.value && (
              <div className="mb-1">
                <strong>{t('shacl.value')}:</strong>{' '}
                {renderClickableText(violation.value, 'text-success small')}
              </div>
            )}
            
            {violation.sourceShape && (
              <div className="mb-1">
                <strong>{t('shacl.source_shape')}:</strong>{' '}
                <code className="text-info small">{formatPath(violation.sourceShape)}</code>
              </div>
            )}
            
            {violation.foafPage && (
              <div className="mt-2">
                <a 
                  href={violation.foafPage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline-info btn-sm"
                >
                  <i className="bi bi-info-circle me-1"></i>
                  {t('shacl.more_info')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const filteredViolations = getFilteredViolations();
  const totalIssues = report.violations.length + report.warnings.length + report.infos.length;

  return (
    <div className="shacl-report-viewer">
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="bi bi-shield-check me-2"></i>
              {t('shacl.compliance_report')}
            </h5>
            <div className="d-flex gap-2">
              {onExportReport && (
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={onExportReport}
                >
                  <i className="bi bi-download me-1"></i>
                  {t('shacl.export_report')}
                </button>
              )}
              {onExportCSV && (
                <button 
                  className="btn btn-outline-success btn-sm"
                  onClick={onExportCSV}
                >
                  <i className="bi bi-filetype-csv me-1"></i>
                  {t('shacl.export_csv')}
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <ul className="nav nav-tabs card-header-tabs mt-3" id="shaclTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'compliance' ? 'active' : ''}`}
                onClick={() => setActiveTab('compliance')}
                type="button"
                role="tab"
                aria-controls="compliance-tab"
                aria-selected={activeTab === 'compliance'}
              >
                <i className="bi bi-pie-chart me-1"></i>
                {t('shacl.compliance_report')}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'validation' ? 'active' : ''} position-relative`}
                onClick={() => setActiveTab('validation')}
                type="button"
                role="tab"
                aria-controls="validation-tab"
                aria-selected={activeTab === 'validation'}
              >
                <i className="bi bi-list-ul me-1"></i>
                {t('shacl.validation_results')}
                {totalIssues > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {totalIssues}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          <div className="tab-content" id="shaclTabContent">
            {/* Compliance Report Tab */}
            {activeTab === 'compliance' && (
              <div className="tab-pane fade show active" id="compliance-tab" role="tabpanel">
                <div className="row">
                  <div className="col-md-6">
                    <div className="text-center">
                      <i className={`${getComplianceIcon(report.conforms)} ${getComplianceColor(report.conforms)} display-1`}></i>
                      <h4 className={`mt-2 ${getComplianceColor(report.conforms)}`}>
                        {report.conforms ? t('shacl.conforms') : t('shacl.does_not_conform')}
                      </h4>
                      <p className="text-muted">
                        {t('shacl.profile')}: <strong>{t(`profiles.${report.profile}`)}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="border rounded p-3">
                          <div className="h4 text-danger mb-1">{report.violations.length}</div>
                          <small className="text-muted">{t('shacl.violations')}</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-3">
                          <div className="h4 text-warning mb-1">{report.warnings.length}</div>
                          <small className="text-muted">{t('shacl.warnings')}</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-3">
                          <div className="h4 text-info mb-1">{report.infos.length}</div>
                          <small className="text-muted">{t('shacl.infos')}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Perfect compliance message */}
                {report.conforms && (
                  <div className="row mt-4">
                    <div className="col">
                      <div className="alert alert-success text-center" role="alert">
                        <i className="bi bi-check-circle-fill display-1"></i>
                        <h4 className="mt-3">{t('shacl.perfect_compliance')}</h4>
                        <p className="mb-0">
                          {t('shacl.no_violations_found')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SHACL Validation Tab */}
            {activeTab === 'validation' && (
              <div className="tab-pane fade show active" id="validation-tab" role="tabpanel">
                {totalIssues > 0 ? (
                  <>
                    {/* Filter Controls */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">
                        {t('shacl.showing_results', { count: filteredViolations.length, total: totalIssues })}
                      </h6>
                      <div className="d-flex align-items-center">
                        <label htmlFor="severityFilter" className="form-label mb-0 me-2">
                          {t('shacl.filter_by_severity')}:
                        </label>
                        <select
                          id="severityFilter"
                          className="form-select form-select-sm"
                          style={{ width: 'auto' }}
                          value={selectedSeverity}
                          onChange={(e) => setSelectedSeverity(e.target.value as SHACLSeverity | 'all')}
                        >
                          <option value="all">{t('shacl.all')} ({totalIssues})</option>
                          <option value="Violation">{t('shacl.violations')} ({report.violations.length})</option>
                          <option value="Warning">{t('shacl.warnings')} ({report.warnings.length})</option>
                          <option value="Info">{t('shacl.infos')} ({report.infos.length})</option>
                        </select>
                      </div>
                    </div>

                    {/* Scrollable Violation List */}
                    <div 
                      className="violation-list" 
                      style={{ 
                        maxHeight: '600px', 
                        overflowY: 'auto',
                        border: '1px solid #dee2e6',
                        borderRadius: '0.375rem',
                        padding: '1rem'
                      }}
                    >
                      {filteredViolations.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-funnel display-1"></i>
                          <p className="mt-2">{t('shacl.no_results_for_filter')}</p>
                        </div>
                      ) : (
                        filteredViolations.map((violation, index) => 
                          renderViolationCard(violation, index)
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-check-circle-fill text-success display-1"></i>
                    <h4 className="mt-3 text-success">{t('shacl.perfect_compliance')}</h4>
                    <p className="text-muted">
                      {t('shacl.no_violations_found')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SHACLReportViewer;