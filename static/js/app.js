/**
 * Main application logic for the Metadata Quality Assessment Tool
 */

class MetadataQualityApp {
    constructor() {
        this.currentProfile = 'dcat_ap';
        this.currentData = null;
        this.worker = null;
        this.vocabularies = {};
        this.isInitialized = false;
    }

    /**
     * Detect RDF format from content
     */
    detectRDFFormat(text) {
        if (!text) return 'text/turtle';
        const t = text.trim();
        if (t.startsWith('{') || t.includes('"@context"')) return 'application/ld+json';
        if (t.startsWith('<') && (t.includes('<rdf:RDF') || t.includes('xmlns:rdf'))) return 'application/rdf+xml';
        if (t.includes('@prefix') || t.includes(' a ') || t.includes('^^') || t.includes(' ;')) return 'text/turtle';
        if (t.includes(' .') && t.includes(' <') && t.includes('> ')) return 'application/n-triples';
        return 'text/turtle';
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing MQA Application...');
            
            // Load vocabularies
            await this.loadVocabularies();
            
            // Initialize UI
            this.initializeUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize worker
            this.initializeWorker();
            
            // Update UI based on current profile
            this.updateProfileUI();
            
            // Update rating table
            this.updateRatingTable();
            
            // Apply initial translations
            if (window.i18n) {
                window.i18n.updateDOM();
            }
            
            this.isInitialized = true;
            console.log('✅ MQA Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing application:', error);
            this.showError(_('error_loading', error.message));
        }
    }

    /**
     * Load vocabulary data
     */
    async loadVocabularies() {
        const vocabularyFiles = [
            'access_rights.json',
            'file_types.json', 
            'licenses.json',
            'machine_readable.json',
            'media_types.json',
            'non_proprietary.json'
        ];

        for (const file of vocabularyFiles) {
            try {
                const response = await fetch(`data/${file}`);
                if (response.ok) {
                    const data = await response.json();
                    const vocabName = file.replace('.json', '');
                    this.vocabularies[vocabName] = data;
                    console.log(`Loaded vocabulary: ${vocabName}`);
                } else {
                    console.warn(`Failed to load vocabulary: ${file}`);
                }
            } catch (error) {
                console.warn(`Error loading vocabulary ${file}:`, error);
            }
        }
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // Set up theme toggle
        this.initializeTheme();
        
        // Set up profile selector
        const profileSelector = document.getElementById('profileSelector');
        if (profileSelector) {
            profileSelector.value = this.currentProfile;
        }
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    /**
     * Set application theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Validate button
        const validateBtn = document.getElementById('validateBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                // Decide based on active tab
                const directTab = document.getElementById('direct-pane');
                if (directTab && directTab.classList.contains('active')) {
                    this.validateFromText();
                } else {
                    this.validateFromURL();
                }
            });
        }

        // Profile selector
        const profileSelector = document.getElementById('profileSelector');
        if (profileSelector) {
            profileSelector.addEventListener('change', (e) => {
                this.setProfile(e.target.value);
            });
        }

        // Chart type toggles
        const radarBtn = document.getElementById('radarBtn');
        const sunburstBtn = document.getElementById('sunburstBtn');
        
        if (radarBtn) {
            radarBtn.addEventListener('change', () => {
                if (radarBtn.checked && this.currentData) {
                    this.updateCharts();
                }
            });
        }
        
        if (sunburstBtn) {
            sunburstBtn.addEventListener('change', () => {
                if (sunburstBtn.checked && this.currentData) {
                    this.updateCharts();
                }
            });
        }

        // Download buttons
        const downloadCSV = document.getElementById('downloadCSV');
        if (downloadCSV) {
            downloadCSV.addEventListener('click', () => {
                this.downloadCSV();
            });
        }

    // Language selector dropdown items
        document.querySelectorAll('a.dropdown-item[data-lang]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = a.getAttribute('data-lang');
                this.setLanguage(lang);
            });
        });
    }

    /**
     * Initialize Web Worker for RDF processing
     */
    initializeWorker() {
        try {
            this.worker = new Worker('workers/rdf-worker-mqa-clean.js');
            
            this.worker.onmessage = (e) => {
                const { type, data, error } = e.data;
                
                if (type === 'ready') {
                    console.log('MQA Worker ready:', data);
                    this.showSuccess(_('data_loaded'));
                } else if (type === 'validation_result') {
                    this.handleValidationResult(data);
                } else if (type === 'error') {
                    console.error('Worker error:', error);
                    this.showError(_('error_validation') + ': ' + error);
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.showError(_('error_loading', 'Worker initialization failed'));
            };
            
        } catch (error) {
            console.error('Failed to initialize worker:', error);
            this.showError(_('error_loading', 'Failed to initialize RDF processor'));
        }
    }

    /**
     * Set validation profile
     * @param {string} profile - Profile name
     */
    setProfile(profile) {
        this.currentProfile = profile;
        this.updateProfileUI();
        this.updateRatingTable();
        
        // Re-validate if we have current data
        if (this.currentData) {
            this.processValidation(this.currentData.rdfContent, this.currentData.format);
        }
    }

    /**
     * Update UI based on current profile
     */
    updateProfileUI() {
        const profileSelector = document.getElementById('profileSelector');
        if (profileSelector) {
            profileSelector.value = this.currentProfile;
        }
        
        this.updateRatingTable();
    }

    /**
     * Update rating table based on current profile
     */
    updateRatingTable() {
        const ratingTable = document.getElementById('ratingTable');
        if (!ratingTable || !window.i18n) return;

        const ratingInfo = window.i18n.getRatingInfo(this.currentProfile);
        
        ratingTable.innerHTML = `
            <div class="rating-scale">
                <div class="rating-item excellent">
                    <div class="rating-color"></div>
                    <span class="rating-label">${_('excellent')}</span>
                    <span class="rating-range">${ratingInfo.thresholds.excellent}+ pts</span>
                </div>
                <div class="rating-item good">
                    <div class="rating-color"></div>
                    <span class="rating-label">${_('good')}</span>
                    <span class="rating-range">${ratingInfo.thresholds.good}-${ratingInfo.thresholds.excellent-1} pts</span>
                </div>
                <div class="rating-item sufficient">
                    <div class="rating-color"></div>
                    <span class="rating-label">${_('sufficient')}</span>
                    <span class="rating-range">${ratingInfo.thresholds.sufficient}-${ratingInfo.thresholds.good-1} pts</span>
                </div>
                <div class="rating-item insufficient">
                    <div class="rating-color"></div>
                    <span class="rating-label">${_('insufficient')}</span>
                    <span class="rating-range">0-${ratingInfo.thresholds.sufficient-1} pts</span>
                </div>
            </div>
        `;
    }

    /**
     * Validate metadata from URL
     */
    async validateFromURL() {
        // Elements as defined in static/index.html
        const urlInput = document.getElementById('catalogUrl');
        const formatSelector = document.getElementById('formatSelector');
        
        if (!urlInput || !urlInput.value.trim()) {
            this.showError(_('error_validation', 'Please enter a valid URL'));
            return;
        }

        const url = urlInput.value.trim();
        const format = formatSelector ? formatSelector.value : 'auto';

        this.showLoading(_('validation_in_progress', 'Fetching and validating metadata...'));

        try {
            // Fetch RDF content from URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const rdfContent = await response.text();
            
            // Store current data
            this.currentData = { rdfContent, format, source: 'url', url };
            
            // Process validation
            await this.processValidation(rdfContent, format);
            
        } catch (error) {
            console.error('Error fetching URL:', error);
            this.showError(_('error_network', error.message));
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Validate metadata from text input
     */
    async validateFromText() {
        // Elements as defined in static/index.html
        const contentInput = document.getElementById('rdfContent');
        const formatSelector = null; // single format selector applies to URL path; autodetect here
        
        if (!contentInput || !contentInput.value.trim()) {
            this.showError(_('error_validation', 'Please enter RDF content'));
            return;
        }

        const rdfContent = contentInput.value.trim();
    let format = 'auto';

        // Pre-validate format if auto-detection is enabled
        if (format === 'auto' || !format) {
            format = this.detectRDFFormat(rdfContent);
            
            // Show warning if RDF/XML is detected
            if (format === 'application/rdf+xml') {
                this.showWarning(_('warning_rdf_xml') + ' ' + _('format_convert_suggestion'));
                // Don't return - let it try to process
            }
        }

        // Store current data
        this.currentData = { rdfContent, format, source: 'text' };

        this.showLoading(_('validation_in_progress', 'Validating metadata...'));

        try {
            await this.processValidation(rdfContent, format);
        } catch (error) {
            console.error('Error validating text:', error);
            this.showError(_('error_validation', error.message));
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Detect RDF format from content
     * @param {string} content - RDF content
     * @returns {string} Detected format
     */
    detectRDFFormat(content) {
        const trimmed = content.trim();
        
        // XML-based formats (RDF/XML)
        if (trimmed.startsWith('<?xml') || trimmed.startsWith('<rdf:RDF') || 
            trimmed.includes('xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"') ||
            trimmed.includes('<rdf:') || trimmed.includes('</rdf:')) {
            return 'application/rdf+xml';
        }
        
        // JSON-LD
        if (trimmed.startsWith('{') && (trimmed.includes('@context') || trimmed.includes('"@context"'))) {
            return 'application/ld+json';
        }
        
        // Turtle
        if (trimmed.includes('@prefix') || trimmed.includes('@base') || 
            /^\s*[<@]/.test(trimmed) || trimmed.includes('a ') || trimmed.includes(' a ')) {
            return 'text/turtle';
        }
        
        // N-Triples/N-Quads
        if (/^\s*<[^>]+>\s+<[^>]+>\s+/.test(trimmed)) {
            return 'application/n-triples';
        }
        
        // Default fallback
        return 'text/turtle';
    }

    /**
     * Process RDF validation with worker
     * @param {string} rdfContent - RDF content
     * @param {string} format - RDF format
     */
    async processValidation(rdfContent, format) {
        if (!this.worker) {
            throw new Error('Worker not initialized');
        }

        // Send validation request to worker
        this.worker.postMessage({
            type: 'validate',
            data: {
                rdfContent,
                format,
                profile: this.currentProfile,
                vocabularies: this.vocabularies
            }
        });
    }

    /**
     * Handle validation result from worker
     * @param {Object} result - Validation result
     */
    handleValidationResult(result) {
        try {
            this.hideLoading();
            
            if (result.error) {
                // Check if it's an RDF/XML format error and provide helpful message
                if (result.error.includes('RDF/XML format detected') || 
                    result.error.includes('Unexpected "<?xml"')) {
                    this.showError(_('error_rdf_xml'));
                } else {
                    this.showError(_('error_validation') + ': ' + result.error);
                }
                return;
            }

            // Store result
            this.currentData.result = result;

            // Update UI with results
            this.displayResults(result);
            
            this.showSuccess(_('validation_complete'));
            
        } catch (error) {
            console.error('Error handling validation result:', error);
            this.showError(_('error_validation') + ': ' + error.message);
        }
    }

    /**
     * Display validation results
     * @param {Object} result - Validation result
     */
    displayResults(result) {
        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.remove('d-none');
        }

        // Update metrics
        this.updateOverviewMetrics(result);
        
        // Update charts
        this.updateCharts(result);
        
        // Update detailed metrics
        this.updateDetailedMetrics(result);
    }

    /**
     * Update overview metrics
     * @param {Object} result - Validation result
     */
    updateOverviewMetrics(result) {
        // Total score
        const totalScoreEl = document.getElementById('totalScore');
        if (totalScoreEl) {
            const maxScore = window.i18n.getRatingInfo(this.currentProfile).maxScore;
            totalScoreEl.textContent = `${result.totalScore}/${maxScore}`;
        }

        // Rating
        const ratingEl = document.getElementById('rating');
        if (ratingEl) {
            const rating = window.i18n.getRating(result.totalScore, this.currentProfile);
            ratingEl.textContent = _(rating);
            ratingEl.className = `metric-value rating-${rating}`;
        }

        // Assessment date
        const assessmentDateEl = document.getElementById('assessmentDate');
        if (assessmentDateEl) {
            assessmentDateEl.textContent = new Date().toLocaleDateString();
        }
    }

    /**
     * Update charts with new data
     * @param {Object} result - Validation result
     */
    updateCharts(result) {
        if (window.chartRenderer) {
            window.chartRenderer.updateCharts(result);
        }
    }

    /**
     * Update detailed metrics accordion
     * @param {Object} result - Validation result
     */
    updateDetailedMetrics(result) {
        const accordion = document.getElementById('metricsAccordion');
        if (!accordion || !result.dimensions) return;

        accordion.innerHTML = result.dimensions.map((dimension, index) => `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" 
                            data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <strong>${_(dimension.name.toLowerCase())}</strong>
                        <span class="ms-auto me-3">${dimension.score}/${dimension.maxScore} pts</span>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                     data-bs-parent="#metricsAccordion">
                    <div class="accordion-body">
                        ${dimension.metrics ? this.renderMetricsTable(dimension.metrics) : 'No metrics available'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render metrics table
     * @param {Array} metrics - Metrics array
     * @returns {string} HTML table
     */
    renderMetricsTable(metrics) {
        return `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>${_('metric')}</th>
                            <th>${_('count')}</th>
                            <th>${_('total')}</th>
                            <th>${_('percentage')}</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metrics.map(metric => `
                            <tr>
                                <td>${metric.name}</td>
                                <td>${metric.count || 0}</td>
                                <td>${metric.total || 0}</td>
                                <td>${metric.percentage ? metric.percentage.toFixed(1) : '0.0'}%</td>
                                <td>${metric.score || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Download results as CSV
     */
    downloadCSV() {
        if (!this.currentData || !this.currentData.result) {
            this.showError(_('error_validation', 'No validation results to download'));
            return;
        }

        const result = this.currentData.result;
        const csv = this.generateCSV(result);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `mqa_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Generate CSV from results
     * @param {Object} result - Validation result
     * @returns {string} CSV content
     */
    generateCSV(result) {
        let csv = 'Dimension,Metric,Count,Total,Percentage,Points\n';
        
        if (result.dimensions) {
            result.dimensions.forEach(dimension => {
                if (dimension.metrics) {
                    dimension.metrics.forEach(metric => {
                        csv += `"${dimension.name}","${metric.name}",${metric.count || 0},${metric.total || 0},${metric.percentage ? metric.percentage.toFixed(1) : '0.0'},${metric.score || 0}\n`;
                    });
                }
            });
        }
        
        return csv;
    }

    /**
     * Set application language
     * @param {string} lang - Language code
     */
    setLanguage(lang) {
        if (window.i18n) {
            window.i18n.setLanguage(lang);
            this.updateRatingTable();
            
            // Update charts if we have data
            if (this.currentData && this.currentData.result) {
                this.updateCharts(this.currentData.result);
            }
        }
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (text) text.textContent = message;
        if (overlay) overlay.classList.remove('d-none');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('d-none');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Success:', message);
        // Could implement toast notifications here
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('Error:', message);
        this.hideLoading();
        
        // Show error in a more user-friendly way
        const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
        errorContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>${_('error_validation')}:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        errorContainer.style.display = 'block';
        
        // Hide results if showing error
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.add('d-none');
        }
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     */
    showWarning(message) {
        console.warn('Warning:', message);
        
        const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
        errorContainer.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>${_('warning')}:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        errorContainer.style.display = 'block';
    }

    /**
     * Create error container if it doesn't exist
     * @returns {HTMLElement} Error container element
     */
    createErrorContainer() {
        let container = document.getElementById('error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-container';
            container.className = 'mt-3';
            
            // Insert after the form
            const form = document.querySelector('form');
            if (form && form.parentNode) {
                form.parentNode.insertBefore(container, form.nextSibling);
            } else {
                document.body.appendChild(container);
            }
        }
        return container;
    }
}

// Initialize application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new MetadataQualityApp();
        window.app.init();
        initializeChartControls();
    });
} else {
    window.app = new MetadataQualityApp();
    window.app.init();
    initializeChartControls();
}

/**
 * Initialize chart control buttons
 */
function initializeChartControls() {
    const radarBtn = document.getElementById('radarBtn');
    const sunburstBtn = document.getElementById('sunburstBtn');
    
    if (radarBtn) {
        radarBtn.addEventListener('change', () => {
            if (radarBtn.checked && window.chartRenderer) {
                window.chartRenderer.showRadarChart();
            }
        });
    }
    
    if (sunburstBtn) {
        sunburstBtn.addEventListener('change', () => {
            if (sunburstBtn.checked && window.chartRenderer) {
                window.chartRenderer.showHierarchicalChart();
            }
        });
    }
}