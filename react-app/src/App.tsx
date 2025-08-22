import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Import Bootstrap JS
import './App.css';
import ValidationForm from './components/ValidationForm';
import ValidationResults from './components/ValidationResults';
import LoadingSpinner from './components/LoadingSpinner';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import MQAInfoSidebar from './components/MQAInfoSidebar';
import RDFService from './services/RDFService';
import { MQAService } from './services/MQAService';
import { ValidationResult, ValidationProfile, ValidationInput } from './types';

function App() {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ValidationProfile>('dcat_ap');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const handleValidation = async (input: ValidationInput, profile: ValidationProfile) => {
    setIsValidating(true);
    setError(null);
    setResult(null);
    setSelectedProfile(profile);

    try {
      // Get content based on input source
      let content: string;
      if (input.source === 'url' && input.url) {
        console.log('🌐 Fetching content from URL:', input.url);
        content = await RDFService.fetchFromUrl(input.url);
      } else {
        console.log('📝 Using direct text content');
        content = input.content;
      }
      
      // Normalize content to Turtle format (don't pass isUrl flag incorrectly)
      console.log('🔄 Normalizing content to Turtle format');
      const normalizedContent = await RDFService.normalizeToTurtle(content, false);
      
      // Calculate quality with MQA
      console.log('📊 Calculating quality metrics');
      const mqaService = MQAService.getInstance();
      const qualityResult = await mqaService.calculateQuality(normalizedContent, profile);
      
      // Get stats
      console.log('📈 Parsing RDF statistics');
      const stats = await RDFService.parseAndCount(normalizedContent);
      
      const validationResult: ValidationResult = {
        quality: qualityResult,
        profile,
        stats,
        content: normalizedContent,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Validation completed successfully');
      setResult(validationResult);
    } catch (err) {
      console.error('❌ Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="App" data-bs-theme={localStorage.getItem('theme') || 'light'}>
      {/* MQA Info Sidebar */}
      <MQAInfoSidebar 
        selectedProfile={selectedProfile}
        isVisible={isSidebarVisible}
        validationResult={result}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Navigation Bar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
          <div className="container-fluid">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary me-3"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                title={isSidebarVisible ? t('sidebar.collapse') : t('sidebar.expand')}
              >
                <i className={`bi bi-layout-sidebar${isSidebarVisible ? '' : '-inset'}`}></i>
              </button>
              <span className="navbar-brand mb-0 h1">
                <i className="bi bi-shield-check me-2 text-primary"></i>
                {t('common.title')}
              </span>
            </div>
            <div className="d-flex align-items-center">
              <ThemeToggle />
              <div className="ms-2">
                <LanguageSelector />
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="container-fluid p-4">
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>{t('common.error')}:</strong> {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
                aria-label="Close"
              ></button>
            </div>
          )}

          {isValidating && (
            <div className="text-center my-5">
              <LoadingSpinner message={t('form.validating')} />
            </div>
          )}

          {!isValidating && !result && (
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h4 className="card-title mb-0">
                      <i className="bi bi-clipboard-check me-2"></i>
                      {t('common.title')}
                    </h4>
                    <p className="card-text mb-0 mt-2 opacity-75">
                      {t('common.subtitle')}
                    </p>
                  </div>
                  <div className="card-body">
                    <ValidationForm onValidate={handleValidation} isLoading={isValidating} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isValidating && result && (
            <div className="row">
              <div className="col">
                {/* Navigation Tabs */}
                <ul className="nav nav-tabs mb-4" id="resultTabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button 
                      className="nav-link active" 
                      id="form-tab" 
                      data-bs-toggle="tab" 
                      data-bs-target="#form-pane" 
                      type="button" 
                      role="tab" 
                      aria-controls="form-pane" 
                      aria-selected="true"
                    >
                      <i className="bi bi-clipboard-check me-2"></i>
                      {t('navigation.validation')}
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button 
                      className="nav-link" 
                      id="results-tab" 
                      data-bs-toggle="tab" 
                      data-bs-target="#results-pane" 
                      type="button" 
                      role="tab" 
                      aria-controls="results-pane" 
                      aria-selected="false"
                    >
                      <i className="bi bi-graph-up me-2"></i>
                      {t('navigation.results')}
                      <span className="badge bg-primary ms-2">
                        {result.quality.percentage.toFixed(1)}%
                      </span>
                    </button>
                  </li>
                </ul>

                {/* Tab Content */}
                <div className="tab-content" id="resultTabContent">
                  {/* Form Tab */}
                  <div 
                    className="tab-pane fade show active" 
                    id="form-pane" 
                    role="tabpanel" 
                    aria-labelledby="form-tab"
                  >
                    <div className="row justify-content-center">
                      <div className="col-lg-8">
                        <div className="card shadow-sm">
                          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <div>
                              <h4 className="card-title mb-0">
                                <i className="bi bi-clipboard-check me-2"></i>
                                {t('common.title')}
                              </h4>
                              <p className="card-text mb-0 mt-2 opacity-75">
                                {t('common.subtitle')}
                              </p>
                            </div>
                            <button 
                              className="btn btn-light btn-sm"
                              onClick={handleReset}
                              title={t('common.reset')}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              {t('common.reset')}
                            </button>
                          </div>
                          <div className="card-body">
                            <ValidationForm onValidate={handleValidation} isLoading={isValidating} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Tab */}
                  <div 
                    className="tab-pane fade" 
                    id="results-pane" 
                    role="tabpanel" 
                    aria-labelledby="results-tab"
                  >
                    <ValidationResults result={result} onReset={handleReset} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
