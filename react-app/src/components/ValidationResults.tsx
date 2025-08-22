import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationResult } from '../types';
import QualityChart from './QualityChart';

interface ValidationResultsProps {
  result: ValidationResult;
  onReset?: () => void;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ result, onReset }) => {
  const { t } = useTranslation();
  const { quality, profile, stats } = result;
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'findability': return '🔍';
      case 'accessibility': return '🔓';
      case 'interoperability': return '🔗';
      case 'reusability': return '♻️';
      case 'contextuality': return '📋';
      default: return '📊';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-danger';
  };

  const toggleAccordion = (category: string) => {
    const newExpanded = new Set(expandedAccordions);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedAccordions(newExpanded);
  };

  const expandAll = () => {
    const allCategories = Object.keys(quality.byCategory);
    setExpandedAccordions(new Set(allCategories));
  };

  const collapseAll = () => {
    setExpandedAccordions(new Set());
  };

  const getMetricsByCategory = (category: string) => {
    return quality.metrics.filter(metric => metric.category === category);
  };

  return (
    <div className="validation-results">
      {/* Overall Score */}
      <div className="row mb-4">
        <div className="col">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h4 className="card-title">{t('results.overall_score')}</h4>
              <div className={`display-4 fw-bold ${getScoreColor(quality.percentage)}`}>
                {quality.percentage.toFixed(1)}%
              </div>
              <p className="text-muted mb-0">
                {quality.totalScore} / {quality.maxScore} {t('common.points')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Chart */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">{t('results.chart_title')}</h5>
            </div>
            <div className="card-body">
              <QualityChart data={quality.byCategory} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">{t('results.summary')}</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(quality.byCategory).map(([category, scores]) => (
                  scores.maxScore > 0 && (
                    <div key={category} className="col-md-6 col-lg-4 mb-3">
                      <div className="border rounded p-3">
                        <div className="d-flex align-items-center mb-2">
                          <span className="me-2">{getCategoryIcon(category)}</span>
                          <h6 className="mb-0">{t(`dimensions.${category}`)}</h6>
                        </div>
                        <div className="progress mb-2" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${
                              scores.percentage >= 80 ? 'bg-success' :
                              scores.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                            }`}
                            style={{ width: `${scores.percentage}%` }}
                          ></div>
                        </div>
                        <small className="text-muted">
                          {scores.score} / {scores.maxScore} ({scores.percentage.toFixed(1)}%)
                        </small>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics by Dimension - Accordion */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">{t('results.metrics_by_dimension')}</h5>
              <div className="btn-group btn-group-sm">
                <button 
                  className="btn btn-outline-primary"
                  onClick={expandAll}
                >
                  {t('results.expand_all')}
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={collapseAll}
                >
                  {t('results.collapse_all')}
                </button>
              </div>
            </div>
            <div className="accordion accordion-flush" id="metricsAccordion">
              {Object.entries(quality.byCategory).map(([category, scores]) => {
                const categoryMetrics = getMetricsByCategory(category);
                if (categoryMetrics.length === 0) return null;

                const accordionId = `accordion-${category}`;
                const isExpanded = expandedAccordions.has(category);

                return (
                  <div key={category} className="accordion-item">
                    <h2 className="accordion-header">
                      <button
                        className={`accordion-button ${isExpanded ? '' : 'collapsed'}`}
                        type="button"
                        onClick={() => toggleAccordion(category)}
                        aria-expanded={isExpanded}
                        aria-controls={accordionId}
                      >
                        <div className="d-flex align-items-center w-100">
                          <span className="me-3">{getCategoryIcon(category)}</span>
                          <div className="flex-grow-1">
                            <strong>{t(`dimensions.${category}`)}</strong>
                            <div className="d-flex align-items-center mt-1">
                              <div className="progress flex-grow-1 me-3" style={{ height: '6px' }}>
                                <div
                                  className={`progress-bar ${
                                    scores.percentage >= 80 ? 'bg-success' :
                                    scores.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                                  }`}
                                  style={{ width: `${scores.percentage}%` }}
                                ></div>
                              </div>
                              <span className={`badge ${
                                scores.percentage >= 80 ? 'bg-success' :
                                scores.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                              }`}>
                                {scores.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div
                      id={accordionId}
                      className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                    >
                      <div className="accordion-body">
                        <div className="table-responsive">
                          <table className="table table-sm table-hover">
                            <thead>
                              <tr>
                                <th>{t('metrics.name')}</th>
                                <th>{t('metrics.score')}</th>
                                <th>{t('metrics.weight')}</th>
                                <th>{t('metrics.description')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryMetrics.map((metric) => (
                                <tr key={metric.id}>
                                  <td>
                                    <code className="text-primary">{metric.id}</code>
                                    <br />
                                    <small className="text-muted">{metric.name}</small>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      metric.score === metric.maxScore ? 'bg-success' :
                                      metric.score > 0 ? 'bg-warning' : 'bg-danger'
                                    }`}>
                                      {metric.score} / {metric.maxScore}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="badge bg-info">
                                      {metric.weight}
                                    </span>
                                  </td>
                                  <td>
                                    <small>{metric.description}</small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Info */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Validation Metadata</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">Profile:</dt>
                    <dd className="col-sm-8">
                      <span className="badge bg-primary">{t(`profiles.${profile}`)}</span>
                    </dd>
                    <dt className="col-sm-4">Triples:</dt>
                    <dd className="col-sm-8">{stats.triples.toLocaleString()}</dd>
                  </dl>
                </div>
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">Subjects:</dt>
                    <dd className="col-sm-8">{stats.subjects.toLocaleString()}</dd>
                    <dt className="col-sm-4">Predicates:</dt>
                    <dd className="col-sm-8">{stats.predicates.toLocaleString()}</dd>
                    <dt className="col-sm-4">Objects:</dt>
                    <dd className="col-sm-8">{stats.objects.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
              
              {onReset && (
                <div className="row mt-3">
                  <div className="col text-center">
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={onReset}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Validate Another Dataset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationResults;
