import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationInput, RDFFormat, ValidationProfile, ProfileSelection, RDFValidationResult } from '../types';
import mqaConfigData from '../config/mqa-config.json';
import MQAService from '../services/MQAService';
import { detectRDFFormat, getFormatDisplayName } from '../utils/formatDetection';
import { SPARQLService, SPARQLQueryParams } from '../services/SPARQLService';
import PredefinedQueriesComponent from './PredefinedQueriesComponent';

interface ValidationFormProps {
  onValidate: (input: ValidationInput, profileSelection: ProfileSelection) => Promise<void>;
  isLoading: boolean;
}

const ValidationForm: React.FC<ValidationFormProps> = ({ onValidate, isLoading }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'sparql'>('text');
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [format, setFormat] = useState<RDFFormat>('auto');
  const [isValidatingSyntax, setIsValidatingSyntax] = useState(false);
  const [syntaxValidation, setSyntaxValidation] = useState<RDFValidationResult | null>(null);
  const [profile, setProfile] = useState<ValidationProfile>('dcat_ap_es');
  const [version, setVersion] = useState<string>('');
  
  // SPARQL-related state
  const [sparqlEndpoint, setSparqlEndpoint] = useState(() => {
    const sparqlConfig = (mqaConfigData as any).sparqlConfig;
    return sparqlConfig?.defaultEndpoint || 'hhttps://datos.gob.es/virtuoso/sparql';
  });
  const [sparqlQuery, setSparqlQuery] = useState('');
  const [sparqlParameters, setSparqlParameters] = useState<SPARQLQueryParams>({});
  const [sparqlService] = useState(() => SPARQLService.getInstance());

  // Clear syntax validation when text content changes and auto-detect format
  useEffect(() => {
    setSyntaxValidation(null);
    
    // Auto-detect format when content changes
    if (textContent.trim()) {
      const detectedFormat = detectRDFFormat(textContent);
      if (detectedFormat !== 'auto' && detectedFormat !== format) {
        setFormat(detectedFormat);
        console.debug(`🔍 Auto-detected RDF format: ${detectedFormat}`);
      }
    }
  }, [textContent]); // Removed format dependency to allow updates

  // Helper functions to handle the new configuration format
  const getProfileConfig = (selectedProfile: ValidationProfile) => {
    const config = (mqaConfigData as any).profiles[selectedProfile];
    return config;
  };

  const getDefaultVersion = (selectedProfile: ValidationProfile) => {
    const config = getProfileConfig(selectedProfile);
    return config?.defaultVersion || Object.keys(config?.versions || {})[0] || '';
  };

  const getAvailableVersions = (selectedProfile: ValidationProfile) => {
    const config = getProfileConfig(selectedProfile);
    return config?.versions ? Object.keys(config.versions) : [];
  };

  const getVersionName = (selectedProfile: ValidationProfile, selectedVersion: string) => {
    const config = getProfileConfig(selectedProfile);
    return config?.versions?.[selectedVersion]?.name || t(`profiles.${selectedProfile}`);
  };

  // Initialize version when profile changes
  useEffect(() => {
    const defaultVer = getDefaultVersion(profile);
    if (defaultVer) {
      setVersion(defaultVer);
    }
  }, [profile]);

  // Initialize default version on mount
  useEffect(() => {
    const defaultVer = getDefaultVersion(profile);
    if (defaultVer) {
      setVersion(defaultVer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'url' && !url.trim()) {
      alert(t('form.url_invalid'));
      return;
    }
    
    if (activeTab === 'text' && !textContent.trim()) {
      alert(t('form.text_required'));
      return;
    }
    
    if (activeTab === 'sparql') {
      if (!sparqlEndpoint.trim()) {
        alert(t('sparql.endpointRequired'));
        return;
      }
      if (!sparqlQuery.trim()) {
        alert(t('sparql.queryRequired'));
        return;
      }
    }

    const input: ValidationInput = {
      content: activeTab === 'url' ? '' : (activeTab === 'text' ? textContent : ''),
      format: activeTab === 'sparql' ? 'turtle' : (format === 'auto' ? detectRDFFormat(textContent) : format),
      source: activeTab,
      url: activeTab === 'url' ? url : undefined,
      sparqlEndpoint: activeTab === 'sparql' ? sparqlEndpoint : undefined,
      sparqlQuery: activeTab === 'sparql' ? sparqlQuery : undefined,
      sparqlParameters: activeTab === 'sparql' ? sparqlParameters : undefined
    };

    const profileSelection: ProfileSelection = {
      profile,
      version
    };

    await onValidate(input, profileSelection);
  };

  // Handle predefined query selection
  const handlePredefinedQuerySelect = (query: string, endpoint: string, parameters: SPARQLQueryParams) => {
    setSparqlQuery(query);
    setSparqlEndpoint(endpoint);
    setSparqlParameters(parameters);
  };

  // Handle syntax validation only
  const handleSyntaxValidation = async () => {
    if (activeTab === 'text' && !textContent.trim()) {
      alert(t('form.text_required'));
      return;
    }

    if (activeTab === 'url') {
      alert('Syntax validation is only available for text content.');
      return;
    }
    
    if (activeTab === 'sparql') {
      alert('Syntax validation is not available for SPARQL queries.');
      return;
    }

    setIsValidatingSyntax(true);
    setSyntaxValidation(null);

    try {
      const resolvedFormat = format === 'auto' ? detectRDFFormat(textContent) : format;
      const result = await MQAService.validateRDF(textContent, resolvedFormat);
      setSyntaxValidation(result);
      
      if (result.valid) {
        console.log('✅ RDF syntax validation passed');
      } else {
        console.warn('❌ RDF syntax validation failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Syntax validation error:', error);
      setSyntaxValidation({
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    } finally {
      setIsValidatingSyntax(false);
    }
  };

  const sampleRdfXml = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcat="http://www.w3.org/ns/dcat#"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xmlns:foaf="http://xmlns.com/foaf/0.1/">
  
  <dcat:Dataset rdf:about="http://example.org/dataset/sample">
    <dcterms:title>Sample Dataset</dcterms:title>
    <dcterms:description>A sample dataset for testing MQA validation</dcterms:description>
    <dcat:keyword>sample</dcat:keyword>
    <dcat:keyword>test</dcat:keyword>
    <dcterms:license rdf:resource="http://creativecommons.org/licenses/by/4.0/"/>
    <dcat:contactPoint>
      <vcard:Organization xmlns:vcard="http://www.w3.org/2006/vcard/ns#">
        <vcard:fn>Sample Organization</vcard:fn>
        <vcard:hasEmail>contact@example.org</vcard:hasEmail>
      </vcard:Organization>
    </dcat:contactPoint>
  </dcat:Dataset>
  
</rdf:RDF>`;

  const loadSample = async () => {
    try {
      const profileConfig = getProfileConfig(profile);
      const defaultVersion = getDefaultVersion(profile);
      const versionConfig = profileConfig?.versions?.[defaultVersion];
      const sampleUrl = versionConfig?.sampleUrl;

      if (sampleUrl) {
        const response = await fetch(sampleUrl);
        if (response.ok) {
          const turtleContent = await response.text();
          setTextContent(turtleContent);
          setFormat('turtle');
          setActiveTab('text');
          return;
        }
      }

      // Fallback to local sample if GitHub is not accessible or no sample URL
      setTextContent(sampleRdfXml);
      setFormat('rdfxml');
      setActiveTab('text');
    } catch (error) {
      // Fallback to local sample if there's an error
      setTextContent(sampleRdfXml);
      setFormat('rdfxml');
      setActiveTab('text');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Profile Selection */}
      <div className="row mb-3">
        <div className="col-md-8">
          <label htmlFor="profileSelector" className="form-label">
            <strong>{t('form.profile')}</strong>
          </label>
          <select
            id="profileSelector"
            className="form-select"
            value={profile}
            onChange={(e) => setProfile(e.target.value as ValidationProfile)}
          >
            <option value="dcat_ap">{t('profiles.dcat_ap')}</option>
            <option value="dcat_ap_es">{t('profiles.dcat_ap_es')}</option>
            <option value="nti_risp">{t('profiles.nti_risp')}</option>
          </select>
        </div>
        <div className="col-md-4">
          <label htmlFor="versionSelector" className="form-label">
            <strong>{t('form.version')}</strong>
          </label>
          <select
            id="versionSelector"
            className="form-select"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={getAvailableVersions(profile).length <= 1}
          >
            {getAvailableVersions(profile).map((ver) => (
              <option key={ver} value={ver}>
                {ver}
              </option>
            ))}
          </select>
          <div className="form-text">
            <small className="text-muted">
              {getVersionName(profile, version)}
            </small>
          </div>
        </div>
      </div>

      {/* Input Tabs */}
      <div className="mb-3">
        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'text' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('text')}
            >
              📝 {t('form.text_tab')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'url' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('url')}
            >
              🌐 {t('form.url_tab')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'sparql' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab('sparql')}
            >
              🪄 {t('form.sparql_tab')}
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'text' && (
          <div className="tab-pane active">
            <div className="mb-3">
              <label htmlFor="rdfContent" className="form-label">
                {t('form.validation_rdf_content')}
              </label>
              <textarea
                id="rdfContent"
                className="form-control font-monospace"
                rows={12}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('form.text_placeholder')}
              />
              <div className="form-text d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={loadSample}
                >
                  <i className="bi bi-download me-1"></i>
                  {t('form.validation_sample')}
                </button>
                
                {/* Syntax validation button */}
                {textContent.trim() && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleSyntaxValidation}
                    disabled={isValidatingSyntax || isLoading}
                  >
                    {isValidatingSyntax ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        {t('form.checking_syntax')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        {t('form.check_syntax')} ({getFormatDisplayName(format === 'auto' ? detectRDFFormat(textContent) : format)})
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Syntax validation result */}
              {syntaxValidation && (
                <div className={`alert ${syntaxValidation.valid ? 'alert-success' : 'alert-danger'} mt-2`} role="alert">
                  <div className="d-flex align-items-start">
                    <i className={`bi ${syntaxValidation.valid ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                    <div className="flex-grow-1">
                      {syntaxValidation.valid ? (
                        <div>
                          <strong>{t('form.syntax_valid')}</strong>
                          <div className="small text-muted">{t('form.syntax_valid_desc')}</div>
                        </div>
                      ) : (
                        <div>
                          <strong>
                            {t('form.syntax_error')}
                            {syntaxValidation.lineNumber && ` ${t('form.at_line')} ${syntaxValidation.lineNumber}`}
                          </strong>
                          <div className="small mt-1">{syntaxValidation.error}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="tab-pane active">
            <div className="mb-3">
              <label htmlFor="rdfUrl" className="form-label">
                URL
              </label>
              <input
                id="rdfUrl"
                type="url"
                className="form-control"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('form.url_placeholder')}
              />
              <div className="form-text">
                {t('form.validation_url')}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sparql' && (
          <div className="tab-pane active">
            {/* Predefined Queries */}
            <div className="mb-4">
              <PredefinedQueriesComponent
                profile={profile}
                onQuerySelect={handlePredefinedQuerySelect}
              />
            </div>

            {/* Manual SPARQL Input */}
            <div className="border-top pt-4">
              <h6 className="mb-3">
                <i className="bi bi-code-square me-2"></i>
                {t('sparql.customQuery')}
              </h6>

              {/* SPARQL Endpoint */}
              <div className="mb-3">
                <label htmlFor="sparqlEndpoint" className="form-label">
                  {t('sparql.endpoint')}
                  <span className="text-danger ms-1">*</span>
                </label>
                <input
                  id="sparqlEndpoint"
                  type="url"
                  className="form-control"
                  value={sparqlEndpoint}
                  onChange={(e) => setSparqlEndpoint(e.target.value)}
                  placeholder="hhttps://datos.gob.es/virtuoso/sparql"
                />
                <div className="form-text">
                  {t('sparql.endpointHelp')}
                </div>
              </div>

              {/* SPARQL Query */}
              <div className="mb-3">
                <label htmlFor="sparqlQuery" className="form-label">
                  {t('sparql.query')}
                  <span className="text-danger ms-1">*</span>
                </label>
                <textarea
                  id="sparqlQuery"
                  className="form-control font-monospace"
                  rows={12}
                  value={sparqlQuery}
                  onChange={(e) => setSparqlQuery(e.target.value)}
                  placeholder={t('sparql.queryPlaceholder')}
                />
                <div className="form-text">
                  {t('sparql.queryHelp')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Format Selection - Only show for text and URL tabs */}
      {activeTab !== 'sparql' && (
        <div className="mb-3">
          <label htmlFor="formatSelector" className="form-label">
            {t('form.validation_format')}
          </label>
          <select
            id="formatSelector"
            className="form-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as RDFFormat)}
          >
            <option value="auto">🔍 {t('form.validation_autodetect')}</option>
            <option value="turtle">Turtle</option>
            <option value="rdfxml">RDF/XML</option>
            <option value="jsonld">JSON-LD</option>
            <option value="ntriples">N-Triples</option>
          </select>
          
          {/* Show detected format when in auto mode */}
          {format === 'auto' && textContent.trim() && (
            <div className="form-text">
              <i className="bi bi-info-circle me-1"></i>
              {t('form.format_detected')}: <strong>{getFormatDisplayName(detectRDFFormat(textContent))}</strong>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="d-grid">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <img
                src={`${process.env.PUBLIC_URL}/logo.svg`}
                alt=""
                className="me-2 spinner-border-sm"
                style={{ 
                  width: '1em', 
                  height: '1em', 
                  verticalAlign: '-0.125em',
                  animation: 'spin 1s linear infinite'
                }}
              />
              {t('common.validating')}
            </>
          ) : (
            <>
              <img
                src={`${process.env.PUBLIC_URL}/logo.svg`}
                alt=""
                className="me-2"
                style={{ 
                  width: '1em', 
                  height: '1em', 
                  verticalAlign: '-0.125em'
                }}
              />
              {t('common.validate')}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ValidationForm;
