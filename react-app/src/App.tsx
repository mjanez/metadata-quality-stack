import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Import Bootstrap JS
import './App.css';
import ValidationForm from './components/ValidationForm';
import ValidationResults from './components/ValidationResults';
import ValidationTabs from './components/ValidationTabs';
import LoadingSpinner from './components/LoadingSpinner';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import MQAInfoSidebar from './components/MQAInfoSidebar';
import RDFService from './services/RDFService';
import { MQAService } from './services/MQAService';
import { SHACLValidationService } from './services/SHACLValidationService';
import { SPARQLService } from './services/SPARQLService';
import { ValidationResult, ExtendedValidationResult, ValidationProfile, ValidationInput, ProfileSelection, ValidationTab, TabState } from './types';

function App() {
  const { t } = useTranslation();
  
  // Multi-tab state management
  const [tabState, setTabState] = useState<TabState>({
    tabs: [
      {
        id: 'tab-1',
        name: t('tabs.new'),
        createdAt: new Date(),
        isValidating: false,
        result: null,
        error: null
      }
    ],
    activeTabId: 'tab-1',
    nextTabId: 2
  });
  
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const maxTabs = 5;

  // Get active tab
  const activeTab = tabState.tabs.find(tab => tab.id === tabState.activeTabId);
  const selectedProfile = activeTab?.result?.profile || 'dcat_ap_es';

  // Tab management functions
  const createNewTab = useCallback((): string => {
    const newTabId = `tab-${tabState.nextTabId}`;
    const newTab: ValidationTab = {
      id: newTabId,
      name: t('tabs.new'),
      createdAt: new Date(),
      isValidating: false,
      result: null,
      error: null
    };
    
    setTabState(prev => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: newTabId,
      nextTabId: prev.nextTabId + 1
    }));
    
    return newTabId;
  }, [tabState.nextTabId, t]);

  const selectTab = useCallback((tabId: string) => {
    setTabState(prev => ({
      ...prev,
      activeTabId: tabId
    }));
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabState(prev => {
      const remainingTabs = prev.tabs.filter(tab => tab.id !== tabId);
      
      // If there are no tabs left, create a new one
      if (remainingTabs.length === 0) {
        const newTabId = `tab-${prev.nextTabId}`;
        const newTab: ValidationTab = {
          id: newTabId,
          name: t('tabs.new'),
          createdAt: new Date(),
          isValidating: false,
          result: null,
          error: null
        };
        return {
          tabs: [newTab],
          activeTabId: newTabId,
          nextTabId: prev.nextTabId + 1
        };
      }
      
      // If we're closing the active tab, select another one
      let newActiveTabId = prev.activeTabId;
      if (prev.activeTabId === tabId) {
        newActiveTabId = remainingTabs[remainingTabs.length - 1].id;
      }
      
      return {
        ...prev,
        tabs: remainingTabs,
        activeTabId: newActiveTabId
      };
    });
  }, [t]);

  const updateTabState = useCallback((tabId: string, updates: Partial<ValidationTab>) => {
    setTabState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    }));
  }, []);

  const handleValidation = async (input: ValidationInput, profileSelection: ProfileSelection) => {
    if (!activeTab) return;
    
    // Update tab to validating state
    updateTabState(activeTab.id, {
      isValidating: true,
      error: null,
      result: null,
      name: input.source === 'url' && input.url ? 
        new URL(input.url).hostname : 
        input.source === 'sparql' && input.sparqlEndpoint ?
        new URL(input.sparqlEndpoint).hostname :
        `${t('profiles.' + profileSelection.profile)} - ${new Date().toLocaleTimeString()}`
    });

    try {
      // Clear SHACL cache to ensure fresh loading of local files
      console.log('🗑️ Clearing SHACL cache for fresh validation');
      SHACLValidationService.clearCache();
      
      // Get content based on input source
      let content: string;
      let originalFormat = 'auto';
      
      if (input.source === 'url' && input.url) {
        console.log('🌐 Fetching content from URL:', input.url);
        content = await RDFService.fetchFromUrl(input.url);
        // Auto-detect format from fetched content
        originalFormat = await import('./utils/formatDetection').then(module => module.detectRDFFormat(content));
        console.log(`🔍 Auto-detected format from URL content: ${originalFormat}`);
      } else if (input.source === 'sparql' && input.sparqlEndpoint && input.sparqlQuery) {
        console.log('🔍 Executing SPARQL query on endpoint:', input.sparqlEndpoint);
        const sparqlService = SPARQLService.getInstance();
        const sparqlResult = await sparqlService.executeSPARQLQuery(input.sparqlEndpoint, input.sparqlQuery);
        
        if (!sparqlResult.success || !sparqlResult.data) {
          throw new Error(`SPARQL query failed: ${sparqlResult.error || 'No data returned'}`);
        }
        
        content = sparqlResult.data;
        // SPARQL results are typically in Turtle format
        originalFormat = 'turtle';
        console.log(`✅ SPARQL query executed successfully, got ${content.length} characters`);
      } else {
        console.log('📝 Using direct text content');
        content = input.content;
        originalFormat = input.format || 'auto';
        // Resolve 'auto' format if needed
        if (originalFormat === 'auto') {
          originalFormat = await import('./utils/formatDetection').then(module => module.detectRDFFormat(content));
          console.log(`🔍 Auto-detected format from text content: ${originalFormat}`);
        }
      }
      
      // Validate syntax of original content first
      console.log('🔍 Validating original content syntax');
      const mqaService = MQAService.getInstance();
      const syntaxValidation = await mqaService.validateRDF(content, originalFormat);
      
      if (!syntaxValidation.valid) {
        throw new Error(`RDF Syntax Error${syntaxValidation.lineNumber ? ` at line ${syntaxValidation.lineNumber}` : ''}: ${syntaxValidation.error}`);
      }
      
      // Check if this is JSON-LD and provide helpful message
      if (originalFormat === 'jsonld') {
        throw new Error(
          'JSON-LD format is detected but not fully supported for quality analysis yet. ' +
          'Please convert your N-Triples to Turtle or RDF/XML format and then paste the converted content. Using tools like:' +
          'https://www.easyrdf.org/converter' +
          'https://json-ld.org/playground/'
        );
      }
      
      // Normalize content to Turtle format for quality analysis
      console.log('🔄 Normalizing content to Turtle format');
      const normalizedContent = await RDFService.normalizeToTurtle(content, false, originalFormat);
      
      // Calculate quality with MQA + SHACL (using normalized content, skip syntax validation since we already did it)
      console.log('📊 Calculating quality metrics with SHACL validation');
      const { quality: qualityResult, shaclReport } = await mqaService.calculateQualityWithSHACL(normalizedContent, profileSelection, 'turtle', true);
      
      // Get stats
      console.log('📈 Parsing RDF statistics');
      const stats = await RDFService.parseAndCount(normalizedContent);
      
      const validationResult: ExtendedValidationResult = {
        quality: qualityResult,
        profile: profileSelection.profile,
        stats,
        content: normalizedContent,
        timestamp: new Date().toISOString(),
        shaclReport
      };
      
      console.log('✅ Validation completed successfully');
      
      // Update tab with results
      updateTabState(activeTab.id, {
        isValidating: false,
        result: validationResult,
        error: null
      });
      
      // Auto-switch to results tab after successful validation
      setTimeout(() => {
        const resultsTab = document.getElementById('results-tab');
        const formTab = document.getElementById('form-tab');
        const resultsPane = document.getElementById('results-pane');
        const formPane = document.getElementById('form-pane');
        
        if (resultsTab && formTab && resultsPane && formPane) {
          // Remove active class from form tab and pane
          formTab.classList.remove('active');
          formTab.setAttribute('aria-selected', 'false');
          formPane.classList.remove('show', 'active');
          
          // Add active class to results tab and pane
          resultsTab.classList.add('active');
          resultsTab.setAttribute('aria-selected', 'true');
          resultsPane.classList.add('show', 'active');
          
          console.log('🎯 Switched to results tab');
        } else {
          console.warn('⚠️ Could not find tab elements for auto-switch');
        }
      }, 500); // Delay to ensure state update and DOM rendering
      
    } catch (err) {
      console.error('❌ Validation error:', err);
      
      // Provide more helpful error messages for RDF syntax errors
      let errorMessage = 'Validation failed';
      if (err instanceof Error) {
        if (err.message.includes('RDF Syntax Error')) {
          // RDF syntax error - show user-friendly message
          errorMessage = `${err.message}\n\nPlease check your RDF/Turtle syntax and ensure all triples are properly formatted.`;
        } else if (err.message.includes('Expected entity but got literal')) {
          // Common N3 parsing error
          errorMessage = `RDF Syntax Error: ${err.message}\n\nThis usually means there's a missing '<' or '>' around a URI, or a literal is used where a resource is expected.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      // Update tab with error
      updateTabState(activeTab.id, {
        isValidating: false,
        error: errorMessage
      });
    }
  };

  const handleReset = () => {
    if (!activeTab) return;
    updateTabState(activeTab.id, {
      result: null,
      error: null,
      name: t('tabs.new')
    });
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="App">
      {/* MQA Info Sidebar */}
      <MQAInfoSidebar
        selectedProfile={selectedProfile}
        validationResult={activeTab?.result || null}
        isVisible={sidebarVisible}
        onToggle={toggleSidebar}
      />
      
      {/* Main Content */}
      <div className={`main-content ${sidebarVisible ? 'sidebar-open' : ''}`}>
        {/* Navigation Bar */}
        <nav className="navbar navbar-expand-lg border-bottom">
          <div className="container-fluid">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-outline-secondary me-2"
                onClick={toggleSidebar}
                title={sidebarVisible ? t('sidebar.collapse') : t('sidebar.expand')}
                aria-label={sidebarVisible ? t('sidebar.collapse') : t('sidebar.expand')}
              >
                <i className={`bi bi-${sidebarVisible ? 'layout-sidebar-inset-reverse' : 'layout-sidebar-inset'}`}></i>
              </button>
              <span className="navbar-brand mb-0 h1">
                <i className="bi bi-check-all me-2 text-primary"></i>
                {t('common.title')}
              </span>
            </div>
            <div className="d-flex align-items-center">
              <div className="me-2">
                <LanguageSelector />
              </div>
              <ThemeToggle />
              <div className="me-2"></div>
              <a 
                href="https://github.com/mjanez/metadata-quality-stack"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-secondary"
                style={{ marginRight: '0.5rem' }}
                title={t('common.github_repository')}
                aria-label={t('common.github_repository')}
              >
                <i className="bi bi-github"></i>
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="container-fluid p-4">
          {/* Validation Tabs */}
          <ValidationTabs
            tabs={tabState.tabs}
            activeTabId={tabState.activeTabId}
            onTabSelect={selectTab}
            onTabClose={closeTab}
            onNewTab={createNewTab}
            maxTabs={maxTabs}
          />

          {/* Active Tab Error Display */}
          {activeTab?.error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>{t('common.error')}:</strong>
              <div className="mt-2">
                {activeTab.error.split(/\n|(?=https?:\/\/)/).map((part: string, index: number) => {
                  if (part.match(/^https?:\/\/[^\s]+/)) {
                    return (
                      <div key={index}>
                        <a 
                          href={part.trim()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          <i className="bi bi-link-45deg me-1"></i>
                          {part.trim()}
                        </a>
                      </div>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => activeTab && updateTabState(activeTab.id, { error: null })}
                aria-label="Close"
              ></button>
            </div>
          )}

          {/* Active Tab Loading State */}
          {activeTab?.isValidating && (
            <div className="text-center my-5">
              <LoadingSpinner message={t('form.validating')} />
            </div>
          )}

          {/* Active Tab Content */}
          {activeTab && !activeTab.isValidating && (
            <>
              {/* No Results - Show Form */}
              {!activeTab.result && (
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
                        <ValidationForm onValidate={handleValidation} isLoading={activeTab.isValidating} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Has Results - Show Tabs */}
              {activeTab.result && (
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
                            {activeTab.result.quality.percentage.toFixed(1)}%
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
                                <ValidationForm onValidate={handleValidation} isLoading={activeTab.isValidating} />
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
                        <ValidationResults result={activeTab.result} onReset={handleReset} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
