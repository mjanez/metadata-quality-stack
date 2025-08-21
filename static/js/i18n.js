/**
 * Internationalization (i18n) module for the Metadata Quality Assessment Tool
 */

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.fallbackLanguage = 'en';
        this.translations = {
            en: {
                // App title and main sections
                app_title: 'Metadata Quality Assessment Tool',
                about: 'About',
                about_description: 'This tool evaluates metadata quality based on the Metadata Quality Assessment (MQA) methodology from the European Data Portal.',
                about_principles: 'The evaluation is based on FAIR+C principles:',
                
                // Navigation and UI
                validation_profile: 'Validation Profile',
                rating_scale: 'Rating Scale',
                enter_metadata_source: 'Enter Metadata Source',
                url: 'URL',
                direct_input: 'Direct Input',
                url_label: 'URL of the catalog in RDF/TTL format',
                format: 'Format',
                paste_rdf: 'Paste RDF content here',
                content_help: 'Suitable for evaluating individual Datasets/Data Services or small Catalogs (up to 500KB)',
                validate: 'Validate',
                
                // Results section
                quality_results: 'Quality Assessment Results',
                total_score: 'Total Score',
                rating: 'Rating',
                assessment_date: 'Assessment Date',
                download_report: 'Download Report',
                download_csv: 'Download CSV',
                
                // Charts and metrics
                dimension_scores: 'Dimension Scores',
                radar_chart: 'Radar Chart',
                sunburst_chart: 'Sunburst Chart',
                radar_description: 'Radar chart showing relative performance across all dimensions',
                sunburst_description: 'Hierarchical view showing metrics grouped by dimensions',
                detailed_metrics: 'Detailed Metrics',
                metrics_description: 'Detailed metrics for each dimension showing count, percentage, and points',
                quality_dimensions: 'Quality Dimensions',
                current_score: 'Current Score',
                maximum_score: 'Maximum Score',
                metrics_by_dimension: 'Metrics by Dimension',
                
                // Profiles
                dcat_ap: 'DCAT-AP (405 pts)',
                dcat_ap_es: 'DCAT-AP-ES (405 pts)',
                nti_risp: 'NTI-RISP (310 pts)',
                
                // Rating levels
                excellent: 'Excellent',
                good: 'Good',
                sufficient: 'Sufficient',
                insufficient: 'Insufficient',
                
                // Dimensions
                findability: 'Findability',
                accessibility: 'Accessibility',
                interoperability: 'Interoperability',
                reusability: 'Reusability',
                contextuality: 'Contextuality',
                
                // Error messages
                error_loading: 'Error loading data',
                error_parsing: 'Error parsing RDF content',
                error_validation: 'Validation error',
                error_network: 'Network error',
                error_rdf_xml: 'RDF/XML format detected but not supported in this static version. Please convert to Turtle, JSON-LD, or N-Triples format.',
                error_format_unsupported: 'Format not supported in static version',
                
                // Warning messages
                warning_rdf_xml: 'RDF/XML format detected. This static version supports Turtle, JSON-LD, and N-Triples. Consider using the Docker version for full RDF/XML support.',
                
                // Format messages
                format_detected: 'Format detected: {0}',
                format_convert_suggestion: 'You can convert RDF/XML to Turtle using online tools.',
                
                // Success messages
                validation_complete: 'Validation completed successfully',
                data_loaded: 'Data loaded successfully',
                
                // Additional UI messages
                warning: 'Warning',
                metric: 'Metric',
                count: 'Count',
                total: 'Total',
                percentage: 'Percentage',
                validation_in_progress: 'Validation in progress...'
            },
            es: {
                // App title and main sections
                app_title: 'Herramienta de Evaluación de Calidad de Metadatos',
                about: 'Acerca de',
                about_description: 'Esta herramienta evalúa la calidad de los metadatos basándose en la metodología de Evaluación de Calidad de Metadatos (MQA) del Portal de Datos Europeo.',
                about_principles: 'La evaluación se basa en los principios FAIR+C:',
                
                // Navigation and UI
                validation_profile: 'Perfil de Validación',
                rating_scale: 'Escala de Puntuación',
                enter_metadata_source: 'Introducir Fuente de Metadatos',
                url: 'URL',
                direct_input: 'Entrada Directa',
                url_label: 'URL del catálogo en formato RDF/TTL',
                format: 'Formato',
                paste_rdf: 'Pega aquí el contenido RDF',
                content_help: 'Adecuado para evaluar Datasets/Servicios de Datos individuales o Catálogos pequeños (hasta 500KB)',
                validate: 'Validar',
                
                // Results section
                quality_results: 'Resultados de Evaluación de Calidad',
                total_score: 'Puntuación Total',
                rating: 'Calificación',
                assessment_date: 'Fecha de Evaluación',
                download_report: 'Descargar Informe',
                download_csv: 'Descargar CSV',
                
                // Charts and metrics
                dimension_scores: 'Puntuaciones por Dimensión',
                radar_chart: 'Gráfico Radar',
                sunburst_chart: 'Gráfico Sunburst',
                radar_description: 'Gráfico radar mostrando el rendimiento relativo en todas las dimensiones',
                sunburst_description: 'Vista jerárquica mostrando métricas agrupadas por dimensiones',
                detailed_metrics: 'Métricas Detalladas',
                metrics_description: 'Métricas detalladas para cada dimensión mostrando recuento, porcentaje y puntos',
                quality_dimensions: 'Dimensiones de Calidad',
                current_score: 'Puntuación Actual',
                maximum_score: 'Puntuación Máxima',
                metrics_by_dimension: 'Métricas por Dimensión',
                
                // Profiles
                dcat_ap: 'DCAT-AP (405 pts)',
                dcat_ap_es: 'DCAT-AP-ES (405 pts)',
                nti_risp: 'NTI-RISP (310 pts)',
                
                // Rating levels
                excellent: 'Excelente',
                good: 'Bueno',
                sufficient: 'Suficiente',
                insufficient: 'Insuficiente',
                
                // Dimensions
                findability: 'Descubrimiento',
                accessibility: 'Accesibilidad',
                interoperability: 'Interoperabilidad',
                reusability: 'Reutilización',
                contextuality: 'Contexto',
                
                // Error messages
                error_loading: 'Error al cargar datos',
                error_parsing: 'Error al analizar contenido RDF',
                error_validation: 'Error de validación',
                error_network: 'Error de red',
                error_rdf_xml: 'Formato RDF/XML detectado pero no soportado en esta versión estática. Por favor convierte a formato Turtle, JSON-LD, o N-Triples.',
                error_format_unsupported: 'Formato no soportado en versión estática',
                
                // Warning messages
                warning_rdf_xml: 'Formato RDF/XML detectado. Esta versión estática soporta Turtle, JSON-LD, y N-Triples. Considera usar la versión Docker para soporte completo de RDF/XML.',
                
                // Format messages
                format_detected: 'Formato detectado: {0}',
                format_convert_suggestion: 'Puedes convertir RDF/XML a Turtle usando herramientas online.',
                
                // Success messages
                validation_complete: 'Validación completada exitosamente',
                data_loaded: 'Datos cargados exitosamente',
                
                // Additional UI messages
                warning: 'Advertencia',
                metric: 'Métrica',
                count: 'Recuento',
                total: 'Total',
                percentage: 'Porcentaje',
                validation_in_progress: 'Validación en progreso...'
            }
        };
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key
     * @param {...any} args - Arguments for string interpolation
     * @returns {string} Translated string
     */
    t(key, ...args) {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                          this.translations[this.fallbackLanguage]?.[key] || 
                          key;
        
        // Simple string interpolation
        if (args.length > 0) {
            return translation.replace(/{(\d+)}/g, (match, index) => {
                return args[index] !== undefined ? args[index] : match;
            });
        }
        
        return translation;
    }

    /**
     * Set current language
     * @param {string} lang - Language code
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            this.updateDOM();
        }
    }

    /**
     * Update DOM elements with translations
     */
    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
        
        // Update language indicator
        const currentLangEl = document.getElementById('currentLanguage');
        if (currentLangEl) {
            currentLangEl.textContent = this.currentLanguage.toUpperCase();
        }
        
        // Update check marks
        document.querySelectorAll('[id$="-check"]').forEach(check => {
            const lang = check.id.replace('-check', '');
            check.style.visibility = lang === this.currentLanguage ? 'visible' : 'hidden';
        });
    }

    /**
     * Get rating info for different profiles
     * @param {string} profile - Profile name
     * @returns {Object} Rating information
     */
    getRatingInfo(profile) {
        const maxScores = {
            'dcat_ap': 405,
            'dcat_ap_es': 405,
            'nti_risp': 310
        };
        
        const maxScore = maxScores[profile] || 405;
        
        return {
            maxScore,
            thresholds: {
                excellent: Math.round(maxScore * 0.8),  // 80%
                good: Math.round(maxScore * 0.6),       // 60%
                sufficient: Math.round(maxScore * 0.4)  // 40%
            },
            labels: {
                excellent: this.t('excellent'),
                good: this.t('good'),
                sufficient: this.t('sufficient'),
                insufficient: this.t('insufficient')
            }
        };
    }

    /**
     * Get rating for a score
     * @param {number} score - Score to rate
     * @param {string} profile - Profile name
     * @returns {string} Rating key
     */
    getRating(score, profile) {
        const { thresholds } = this.getRatingInfo(profile);
        
        if (score >= thresholds.excellent) return 'excellent';
        if (score >= thresholds.good) return 'good';
        if (score >= thresholds.sufficient) return 'sufficient';
        return 'insufficient';
    }
}

// Create global instance
window.i18n = new I18n();

// Utility function for easy access
window._ = function(key, ...args) {
    return window.i18n.t(key, ...args);
};
