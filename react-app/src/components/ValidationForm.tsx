import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationInput, RDFFormat, ValidationProfile } from '../types';

interface ValidationFormProps {
  onValidate: (input: ValidationInput, profile: ValidationProfile) => Promise<void>;
  isLoading: boolean;
}

const ValidationForm: React.FC<ValidationFormProps> = ({ onValidate, isLoading }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('text');
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [format, setFormat] = useState<RDFFormat>('auto');
  const [profile, setProfile] = useState<ValidationProfile>('dcat_ap');

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

    const input: ValidationInput = {
      content: activeTab === 'url' ? '' : textContent, // No poner URL en content
      format,
      source: activeTab,
      url: activeTab === 'url' ? url : undefined
    };

    await onValidate(input, profile);
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
      const response = await fetch('https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/refs/heads/main/examples/ttl/1.0.0/E_DCAT-AP-ES_Catalog.ttl');
      if (response.ok) {
        const turtleContent = await response.text();
        setTextContent(turtleContent);
        setFormat('turtle');
        setActiveTab('text');
      } else {
        // Fallback to local sample if GitHub is not accessible
        setTextContent(sampleRdfXml);
        setFormat('rdfxml');
        setActiveTab('text');
      }
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
      <div className="mb-3">
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
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'text' && (
          <div className="tab-pane active">
            <div className="mb-3">
              <label htmlFor="rdfContent" className="form-label">
                RDF Content
              </label>
              <textarea
                id="rdfContent"
                className="form-control font-monospace"
                rows={12}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('form.text_placeholder')}
              />
              <div className="form-text">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={loadSample}
                >
                  <i className="bi bi-download me-1"></i>
                  Load DCAT-AP-ES sample catalog
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="tab-pane active">
            <div className="mb-3">
              <label htmlFor="rdfUrl" className="form-label">
                RDF URL
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
                Enter a URL pointing to RDF content
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Format Selection */}
      <div className="mb-3">
        <label htmlFor="formatSelector" className="form-label">
          RDF Format
        </label>
        <select
          id="formatSelector"
          className="form-select"
          value={format}
          onChange={(e) => setFormat(e.target.value as RDFFormat)}
        >
          <option value="auto">🔍 Auto-detect</option>
          <option value="turtle">Turtle</option>
          <option value="rdfxml">RDF/XML</option>
          <option value="jsonld">JSON-LD</option>
          <option value="ntriples">N-Triples</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="d-grid">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              {t('common.validating')}
            </>
          ) : (
            <>
              ✅ {t('common.validate')}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ValidationForm;
