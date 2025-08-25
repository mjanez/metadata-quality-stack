import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHACLReport, SHACLViolation, SHACLSeverity } from '../types';

interface SHACLReportViewerProps {
  report: SHACLReport;
  onExportReport?: () => void;
}

const SHACLReportViewer: React.FC<SHACLReportViewerProps> = ({ 
  report, 
  onExportReport 
}) => {
  const { t } = useTranslation();
  const [selectedSeverity, setSelectedSeverity] = useState<SHACLSeverity | 'all'>('all');

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
    
    // Extract local name from URI
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
              {violation.message.map((msg, msgIndex) => (
                <p key={msgIndex} className="mb-1 text-muted">
                  {msg}
                </p>
              ))}
            </div>
            
            {violation.focusNode && (
              <div className="mb-1">
                <strong>{t('shacl.focus_node')}:</strong>{' '}
                <code className="text-primary small">{violation.focusNode}</code>
              </div>
            )}
            
            {violation.value && (
              <div className="mb-1">
                <strong>{t('shacl.value')}:</strong>{' '}
                <code className="text-success small">{violation.value}</code>
              </div>
            )}
            
            {violation.sourceShape && (
              <div>
                <strong>{t('shacl.source_shape')}:</strong>{' '}
                <code className="text-info small">{formatPath(violation.sourceShape)}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const filteredViolations = getFilteredViolations();

  return (
    <div className="shacl-report-viewer">
      {/* Compliance Summary */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-shield-check me-2"></i>
            {t('shacl.compliance_report')}
          </h5>
        </div>
        <div className="card-body">
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
                  <div className="border rounded p-2">
                    <div className="h5 text-danger mb-1">{report.violations.length}</div>
                    <small className="text-muted">{t('shacl.violations')}</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border rounded p-2">
                    <div className="h5 text-warning mb-1">{report.warnings.length}</div>
                    <small className="text-muted">{t('shacl.warnings')}</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border rounded p-2">
                    <div className="h5 text-info mb-1">{report.infos.length}</div>
                    <small className="text-muted">{t('shacl.infos')}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {onExportReport && (
            <div className="row mt-3">
              <div className="col text-center">
                <button 
                  className="btn btn-outline-primary"
                  onClick={onExportReport}
                >
                  <i className="bi bi-download me-2"></i>
                  {t('shacl.export_report')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Filter and List */}
      {filteredViolations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-list-ul me-2"></i>
                {t('shacl.validation_results')}
              </h5>
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
                  <option value="all">{t('shacl.all')} ({report.violations.length + report.warnings.length + report.infos.length})</option>
                  <option value="Violation">{t('shacl.violations')} ({report.violations.length})</option>
                  <option value="Warning">{t('shacl.warnings')} ({report.warnings.length})</option>
                  <option value="Info">{t('shacl.infos')} ({report.infos.length})</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            {filteredViolations.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="bi bi-check-circle display-1"></i>
                <p className="mt-2">{t('shacl.no_results_for_filter')}</p>
              </div>
            ) : (
              <div className="violation-list">
                {filteredViolations.map((violation, index) => 
                  renderViolationCard(violation, index)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No violations message */}
      {report.conforms && (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bi bi-check-circle-fill text-success display-1"></i>
            <h4 className="mt-3 text-success">{t('shacl.perfect_compliance')}</h4>
            <p className="text-muted">
              {t('shacl.no_violations_found')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SHACLReportViewer;