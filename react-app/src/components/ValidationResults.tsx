import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExtendedValidationResult } from '../types';
import QualityChart from './QualityChart';
import SHACLReportViewer from './SHACLReportViewer';
import { RDFService } from '../services/RDFService';

interface ValidationResultsProps {
  result: ExtendedValidationResult;
  onReset?: () => void;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ result, onReset }) => {
  const { t } = useTranslation();
  const { quality, profile, stats } = result;
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'findability': return 'bi-search';
      case 'accessibility': return 'bi-unlock';
      case 'interoperability': return 'bi-link-45deg';
      case 'reusability': return 'bi-recycle';
      case 'contextuality': return 'bi-clipboard-data';
      default: return 'bi-graph-up';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 85) return 'text-success';        // Excellent - Dark Green (85%+)
    if (percentage >= 55) return 'text-success-light';  // Good - Light Green (55-84%)
    if (percentage >= 30) return 'text-warning';        // Sufficient - Warning (30-54%)
    return 'text-danger';                               // Poor - Red (0-29%)
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

  // Download functions
  const downloadCSV = () => {
    const csvHeader = 'dimension,metric,score,maxScore,percentage,weight\n';
    const csvData = quality.metrics.map(metric => {
      const percentage = (metric.score / metric.maxScore * 100).toFixed(2);
      return `${metric.category},${metric.id},${metric.score},${metric.maxScore},${percentage},${metric.weight}`;
    }).join('\n');
    
    const blob = new Blob([csvHeader + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mqa-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadJSON = () => {
    const jsonData = {
      source: result.timestamp ? `validation-${result.timestamp}` : 'unknown',
      created: new Date().toISOString().split('T')[0],
      totalScore: quality.totalScore,
      rating: quality.percentage >= 85 ? 'Excellent' : 
              quality.percentage >= 55 ? 'Good' : 
              quality.percentage >= 30 ? 'Sufficient' : 'Poor',
      dimensions: Object.entries(quality.byCategory).reduce((acc, [key, value]) => {
        acc[key] = value.score;
        return acc;
      }, {} as Record<string, number>),
      metrics: quality.metrics.map(metric => ({
        id: metric.id,
        dimension: metric.category,
        score: metric.score,
        maxScore: metric.maxScore,
        percentage: metric.score / metric.maxScore,
        weight: metric.weight,
        found: metric.found || false
      }))
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mqa-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadDQV = () => {
    // Create DQV JSON-LD structure based on the converters.py logic
    const sourceUrl = result.timestamp ? `urn:mqa:validation:${result.timestamp}` : 'urn:mqa:validation:unknown';
    const measurementId = `urn:mqa:measurement:${new Date().toISOString().split('T')[0]}`;
    
    const dqvData = {
      "@context": {
        "dqv": "http://www.w3.org/ns/dqv#",
        "dcat": "http://www.w3.org/ns/dcat#",
        "dcterms": "http://purl.org/dc/terms/",
        "prov": "http://www.w3.org/ns/prov#",
        "foaf": "http://xmlns.com/foaf/0.1/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "oa": "http://www.w3.org/ns/oa#",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "schema": "http://schema.org/",
        "fair": "https://w3id.org/fair/principles/terms/"
      },
      "@id": measurementId,
      "@type": "dqv:QualityMeasurement",
      "dcterms:created": `${new Date().toISOString()}`,
      "dcterms:title": `Quality Assessment`,
      "dqv:computedOn": {
        "@id": sourceUrl,
        "@type": "dcat:Dataset"
      },
      "dqv:value": quality.totalScore,
      "dqv:isMeasurementOf": {
        "@id": "urn:mqa:metric:totalScore",
        "@type": "dqv:Metric",
        "skos:prefLabel": "Total Quality Score"
      },
      "schema:rating": {
        "@type": "schema:Rating",
        "schema:ratingValue": quality.percentage >= 85 ? 'Excellent' : 
                           quality.percentage >= 55 ? 'Good' : 
                           quality.percentage >= 30 ? 'Sufficient' : 'Poor',
        "schema:worstRating": "Poor",
        "schema:bestRating": "Excellent"
      },
      "dqv:hasQualityMeasurement": [] as any[]
    };

    // Add dimension measurements
    Object.entries(quality.byCategory).forEach(([dimension, categoryData]) => {
      const dimensionMapping: Record<string, string> = {
        "findability": "fair:F",
        "accessibility": "fair:A", 
        "interoperability": "fair:I",
        "reusability": "fair:R",
        "contextuality": "dqv:contextualQuality"
      };
      
      (dqvData["dqv:hasQualityMeasurement"] as any[]).push({
        "@id": `${measurementId}-${dimension}`,
        "@type": "dqv:QualityMeasurement",
        "dqv:value": categoryData.score,
        "dqv:isMeasurementOf": {
          "@id": dimensionMapping[dimension] || `urn:mqa:dimension:${dimension}`,
          "@type": "dqv:Dimension",
          "skos:prefLabel": dimension.charAt(0).toUpperCase() + dimension.slice(1)
        }
      });
    });

    const blob = new Blob([JSON.stringify(dqvData, null, 2)], { type: 'application/ld+json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mqa-dqv-${new Date().toISOString().split('T')[0]}.jsonld`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openSourceRDF = () => {
    if (result.content) {
      const blob = new Blob([result.content], { type: 'text/turtle' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
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
              <div className="mb-2">
                <span className={`badge fs-6 ${
                  quality.percentage >= 85 ? 'bg-success' :
                  quality.percentage >= 55 ? 'bg-success-light' :
                  quality.percentage >= 30 ? 'bg-warning' : 'bg-danger'
                }`} style={{
                  backgroundColor: quality.percentage >= 55 && quality.percentage < 85 ? '#7dd87d' : undefined
                }}>
                  {quality.percentage >= 85 ? t('quality_rating.excellent') : 
                   quality.percentage >= 55 ? t('quality_rating.good') : 
                   quality.percentage >= 30 ? t('quality_rating.sufficient') : t('quality_rating.poor')}
                </span>
              </div>
              <div className={`display-4 fw-bold ${getScoreColor(quality.percentage)}`}>
                {quality.totalScore}
              </div>
              <div className="progress mt-2" style={{ height: '6px' }}>
                <div
                  className={`progress-bar ${
                    quality.percentage >= 85 ? 'bg-success' :
                    quality.percentage >= 55 ? 'bg-success' :
                    quality.percentage >= 30 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ 
                    width: `${quality.percentage}%`,
                    backgroundColor: quality.percentage >= 55 && quality.percentage < 85 ? '#7dd87d' : undefined
                  }}
                ></div>
              </div>
              <small className="text-muted mt-1 d-block">
                {quality.totalScore} / {quality.maxScore} ({quality.percentage.toFixed(1)}%)
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="row mb-4">
        <div className="col">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-download me-2"></i>
                {t('common.download')} & {t('common.export')}
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-success w-100" 
                    onClick={downloadCSV}
                    title={ t('validation_results.csv_metrics_title') }
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i>
                    { t('validation_results.csv_metrics') }
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-primary w-100" 
                    onClick={downloadJSON}
                    title={ t('validation_results.json_results_title') }
                  >
                    <i className="bi bi-file-earmark-code me-1"></i>
                    { t('validation_results.json_results') }
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-info w-100" 
                    onClick={downloadDQV}
                    title={ t('validation_results.json_ld_dqv_title') }
                  >
                    <i className="bi bi-file-earmark-richtext me-1"></i>
                    { t('validation_results.json_ld_dqv') }
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-outline-secondary w-100" 
                    onClick={openSourceRDF}
                    title={ t('validation_results.source_rdf_title') }
                    disabled={!result.content}
                  >
                    <i className="bi bi-file-earmark-text me-1"></i>
                    { t('validation_results.source_rdf') }
                  </button>
                </div>
              </div>
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
              <div className="row justify-content-center">
                {Object.entries(quality.byCategory).map(([category, scores]) => (
                  scores.maxScore > 0 && (
                    <div key={category} className="col-md-6 col-lg-4 col-xl-2 mb-3 d-flex">
                      <div className="border rounded p-3 w-100">
                        <div className="d-flex align-items-center mb-2">
                          <i className={`${getCategoryIcon(category)} me-2`}></i>
                          <h6 className="mb-0">{t(`dimensions.${category}`)}</h6>
                        </div>
                        <div className="progress mb-2" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${
                              scores.percentage >= 85 ? 'bg-success' :
                              scores.percentage >= 55 ? 'bg-success' :
                              scores.percentage >= 30 ? 'bg-warning' : 'bg-danger'
                            }`}
                            style={{ 
                              width: `${scores.percentage}%`,
                              backgroundColor: scores.percentage >= 55 && scores.percentage < 85 ? '#7dd87d' : undefined
                            }}
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

      {/* SHACL Compliance Report */}
      {result.shaclReport && (
        <div className="row mb-4">
          <div className="col">
            <SHACLReportViewer 
              report={result.shaclReport} 
              onExportReport={async () => {
                try {
                  const reportTurtle = await RDFService.exportSHACLReport(result.shaclReport!);
                  const blob = new Blob([reportTurtle], { type: 'text/turtle' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `shacl-report-${result.shaclReport!.profile}-${new Date().toISOString().split('T')[0]}.ttl`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                } catch (error) {
                  console.error('Error exporting SHACL report:', error);
                }
              }}
              onExportCSV={async () => {
                try {
                  const { default: SHACLValidationService } = await import('../services/SHACLValidationService');
                  const csvContent = await SHACLValidationService.exportReportAsCSV(result.shaclReport!);
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `shacl-report-${result.shaclReport!.profile}-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                } catch (error) {
                  console.error('Error exporting SHACL CSV report:', error);
                }
              }}
            />
          </div>
        </div>
      )}

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
            <div 
              className="accordion accordion-flush" 
              id="metricsAccordion"
              style={{ 
                maxHeight: '600px', 
                overflowY: 'auto',
                borderTop: '1px solid #dee2e6',
                borderBottom: '1px solid #dee2e6'
              }}
            >
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
                          <i className={`${getCategoryIcon(category)} me-3`}></i>
                          <div className="flex-grow-1">
                            <strong>{t(`dimensions.${category}`)}</strong>
                            <div className="d-flex align-items-center mt-1">
                              <div className="progress flex-grow-1 me-3" style={{ height: '6px' }}>
                                <div
                                  className={`progress-bar ${
                                    scores.percentage >= 85 ? 'bg-success' :
                                    scores.percentage >= 55 ? 'bg-success' :
                                    scores.percentage >= 30 ? 'bg-warning' : 'bg-danger'
                                  }`}
                                  style={{ 
                                    width: `${scores.percentage}%`,
                                    backgroundColor: scores.percentage >= 55 && scores.percentage < 85 ? '#7dd87d' : undefined
                                  }}
                                ></div>
                              </div>
                              <span className={`badge ${
                                scores.percentage >= 85 ? 'bg-success' :
                                scores.percentage >= 55 ? 'bg-success-light' :
                                scores.percentage >= 30 ? 'bg-warning' : 'bg-danger'
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
              <h5 className="card-title mb-0">{t('metadata_info.title')}</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">{t('metadata_info.profile')}</dt>
                    <dd className="col-sm-8">
                      <span className="badge bg-primary">{t(`profiles.${profile}`)}</span>
                    </dd>
                    <dt className="col-sm-4">{t('metadata_info.triples')}</dt>
                    <dd className="col-sm-8">{stats.triples.toLocaleString()}</dd>
                  </dl>
                </div>
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">{t('metadata_info.subjects')}</dt>
                    <dd className="col-sm-8">{stats.subjects.toLocaleString()}</dd>
                    <dt className="col-sm-4">{t('metadata_info.predicates')}</dt>
                    <dd className="col-sm-8">{stats.predicates.toLocaleString()}</dd>
                    <dt className="col-sm-4">{t('metadata_info.objects')}</dt>
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
