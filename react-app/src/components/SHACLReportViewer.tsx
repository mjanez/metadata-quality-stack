import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SHACLReport, SHACLViolation, SHACLSeverity, MQAConfig } from '../types';
import { PrefixService } from '../services/PrefixService';
import { SHACLMessageService, LocalizedMessage } from '../services/SHACLMessageService';
import mqaConfigData from '../config/mqa-config.json';

interface SHACLReportViewerProps {
  report: SHACLReport;
  onExportReport?: () => void;
  onExportCSV?: () => void;
}

interface GroupedSHACLViolation {
  message: string;
  messageKey: string;
  localizedMessages: LocalizedMessage[];
  violations: SHACLViolation[];
  count: number;
  severity: SHACLSeverity;
  constraintComponent: string;
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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [mqaConfig] = useState<MQAConfig>(mqaConfigData as MQAConfig);

  // Load prefixes on component mount
  useEffect(() => {
    const loadPrefixes = async () => {
      try {
        // Load prefixes
        if (!prefixService.isLoaded()) {
          await prefixService.loadPrefixes();
        }
        setPrefixesLoaded(true);
      } catch (error) {
        console.error('Error loading prefixes:', error);
        setPrefixesLoaded(true); // Continue even if prefixes fail
      }
    };
    
    loadPrefixes();
  }, [prefixService]);

  /**
   * Get profile URL from MQA config
   */
  const getProfileUrl = () => {
    if (!mqaConfig || !mqaConfig.profiles[report.profile]) {
      return null;
    }
    
    const profileData = mqaConfig.profiles[report.profile];
    const defaultVersion = profileData.defaultVersion;
    const versionData = profileData.versions[defaultVersion];
    
    return versionData?.url || null;
  };

  /**
   * Render profile name with optional link
   */
  const renderProfileName = () => {
    const profileName = t(`profiles.${report.profile}`);
    const profileUrl = getProfileUrl();
    
    if (profileUrl) {
      return (
        <a 
          href={profileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-decoration-none"
          title={t('shacl.view_profile_documentation')}
        >
          <strong>{profileName}</strong>
          <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.75em' }}></i>
        </a>
      );
    }
    
    return <strong>{profileName}</strong>;
  };
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

  /**
   * Render multiple entity badges with overflow indicator
   */
  const renderEntityBadges = (violations: SHACLViolation[]): React.ReactElement | null => {
    const { entities, overflowCount } = getUniqueEntities(violations);
    
    if (entities.length === 0) {
      return null;
    }
    
    return (
      <>
        {entities.map((entity, index) => (
          <span key={index} className="badge bg-info ms-2" title={`${t('shacl.entity_context')}: ${entity}`}>
            <i className="bi bi-diagram-3 me-1"></i>
            {entity}
          </span>
        ))}
        {overflowCount > 0 && (
          <span 
            className="badge bg-secondary ms-2" 
            title={`${t('shacl.additional_entities', { count: overflowCount })}`}
          >
            +{overflowCount}
          </span>
        )}
      </>
    );
  };

  /**
   * Get unique entities from a group of violations (max 4, with +n overflow indicator)
   */
  const getUniqueEntities = (violations: SHACLViolation[]): { entities: string[], overflowCount: number } => {
    const uniqueEntities = new Set<string>();
    
    violations.forEach(violation => {
      if (violation.entityContext && violation.entityContext !== 'Unknown Entity') {
        uniqueEntities.add(violation.entityContext);
      }
    });
    
    const entitiesArray = Array.from(uniqueEntities);
    const maxDisplayed = 4;
    
    if (entitiesArray.length <= maxDisplayed) {
      return { entities: entitiesArray, overflowCount: 0 };
    } else {
      return { 
        entities: entitiesArray.slice(0, maxDisplayed), 
        overflowCount: entitiesArray.length - maxDisplayed 
      };
    }
  };

  /**
   * Group SHACL violations by message to show duplicates
   */
  const groupViolationsByMessage = (violations: SHACLViolation[]): GroupedSHACLViolation[] => {
    const groupedMap = new Map<string, GroupedSHACLViolation>();

    violations.forEach(violation => {
      // Use the first message as the key for grouping
      const messageKey = violation.message[0] || 'Unknown message';
      const localizedMessages = filterMessagesByLanguage(violation.message);
      
      if (groupedMap.has(messageKey)) {
        const existing = groupedMap.get(messageKey)!;
        existing.violations.push(violation);
        existing.count++;
      } else {
        groupedMap.set(messageKey, {
          message: messageKey,
          messageKey,
          localizedMessages,
          violations: [violation],
          count: 1,
          severity: violation.severity,
          constraintComponent: violation.sourceConstraintComponent
        });
      }
    });

    return Array.from(groupedMap.values()).sort((a, b) => {
      // Sort by severity first (Violation > Warning > Info), then by count (desc)
      const severityOrder = { 'Violation': 3, 'Warning': 2, 'Info': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.count - a.count;
    });
  };

  /**
   * Toggle expanded state for a message group
   */
  const toggleMessageGroup = (messageKey: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageKey)) {
      newExpanded.delete(messageKey);
    } else {
      newExpanded.add(messageKey);
    }
    setExpandedMessages(newExpanded);
  };

  /**
   * Expand all message groups
   */
  const expandAllMessages = () => {
    const allGroups = getFilteredViolations();
    const groupedViolations = groupViolationsByMessage(allGroups);
    setExpandedMessages(new Set(groupedViolations.map(group => group.messageKey)));
  };

  /**
   * Collapse all message groups
   */
  const collapseAllMessages = () => {
    setExpandedMessages(new Set());
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

  /**
   * Render grouped violation card with expandable violations list
   */
  const renderGroupedViolationCard = (group: GroupedSHACLViolation, index: number) => {
    const isExpanded = expandedMessages.has(group.messageKey);
    
    return (
      <div key={`${group.messageKey}-${index}`} className="card mb-3">
        <div className="card-body p-3">
          <div className="d-flex align-items-start">
            <i className={`${getSeverityIcon(group.severity)} ${getSeverityColor(group.severity)} me-2 mt-1`}></i>
            <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0">
                          <span className={`badge ${getSeverityBadgeClass(group.severity)} me-2`}>
                            {group.severity}
                          </span>
                          {formatConstraintComponent(group.constraintComponent)}
                          <span className="badge bg-secondary ms-2">
                            {group.count} {group.count === 1 ? t('shacl.occurrence') : t('shacl.occurrences')}
                          </span>
                          {renderEntityBadges(group.violations)}
                        </h6>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => toggleMessageGroup(group.messageKey)}
                          aria-expanded={isExpanded}
                          title={isExpanded ? t('shacl.collapse_details') : t('shacl.expand_details')}
                        >
                          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        </button>
                      </div>              <div className="mb-2">
                {group.localizedMessages.map((msg, msgIndex) => (
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

              {/* Expandable violations list */}
              {isExpanded && (
                <div className="mt-3 border-top pt-3">
                  <h6 className="mb-2">
                    <i className="bi bi-list-ul me-1"></i>
                    {t('shacl.affected_nodes')} ({group.count})
                  </h6>
                  <div className="row g-2">
                    {group.violations.map((violation, vIndex) => (
                      <div key={vIndex} className="col-12">
                        <div className="card card-body p-2">
                          {violation.focusNode && (
                            <div className="mb-1">
                              <strong>{t('shacl.focus_node')}:</strong>{' '}
                              {renderClickableText(violation.focusNode, 'text-primary small')}
                            </div>
                          )}
                          
                          {violation.entityContext && violation.entityContext !== 'Unknown Entity' && (
                            <div className="mb-1">
                              <strong>{t('shacl.entity_context')}:</strong>{' '}
                              <span className="badge bg-info">{violation.entityContext}</span>
                            </div>
                          )}
                          
                          {violation.path && (
                            <div className="mb-1">
                              <strong>{t('shacl.path')}:</strong>{' '}
                              <code className="text-muted small">{formatPath(violation.path)}</code>
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
                        {report.conforms ? t('shacl.conforms') : t('shacl.non_conforms')}
                      </h4>
                      <p className="text-muted">
                        {t('shacl.profile')}: {renderProfileName()}
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
                      <div className="d-flex align-items-center gap-2">
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
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={expandAllMessages}
                            title={t('shacl.expand_all_groups')}
                          >
                            <i className="bi bi-arrows-expand me-1"></i>
                            {t('shacl.expand_all')}
                          </button>
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={collapseAllMessages}
                            title={t('shacl.collapse_all_groups')}
                          >
                            <i className="bi bi-arrows-collapse me-1"></i>
                            {t('shacl.collapse_all')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Grouped Violation List */}
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
                      {(() => {
                        const groupedViolations = groupViolationsByMessage(filteredViolations);
                        
                        if (groupedViolations.length === 0) {
                          return (
                            <div className="text-center text-muted py-4">
                              <i className="bi bi-funnel display-1"></i>
                              <p className="mt-2">{t('shacl.no_results_for_filter')}</p>
                            </div>
                          );
                        }
                        
                        return groupedViolations.map((group, index) => 
                          renderGroupedViolationCard(group, index)
                        );
                      })()}
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