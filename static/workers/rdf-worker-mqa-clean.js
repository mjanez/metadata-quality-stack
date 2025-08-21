/**
 * Web Worker for RDF parsing and MQA validation
 * Processes RDF content and calculates metadata quality metrics
 */

// Import N3.js for RDF parsing
importScripts('https://cdn.jsdelivr.net/npm/n3@1.17.2/browser/n3.min.js');

class MQAValidator {
    constructor() {
        this.parser = new N3.Parser();
        this.store = new N3.Store();
        this.namespaces = {
            rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
            dcat: 'http://www.w3.org/ns/dcat#',
            dcterms: 'http://purl.org/dc/terms/',
            foaf: 'http://xmlns.com/foaf/0.1/',
            vcard: 'http://www.w3.org/2006/vcard/ns#',
            skos: 'http://www.w3.org/2004/02/skos/core#',
            adms: 'http://www.w3.org/ns/adms#'
        };
        
        console.log('MQA Validator initialized - Python-compatible');
    }

    /**
     * Detect RDF format from content
     */
    detectFormat(content) {
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
        
        // N-Triples/N-Quads (simple check for triple pattern)
        if (/^\s*<[^>]+>\s+<[^>]+>\s+/.test(trimmed)) {
            return 'application/n-triples';
        }
        
        // Default fallback
        return 'text/turtle';
    }

    /**
     * Convert RDF/XML to Turtle format using basic XML parsing
     */
    convertRDFXMLToTurtle(rdfXML) {
        try {
            console.log('Converting RDF/XML to Turtle...');
            
            // Parse XML using DOMParser
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rdfXML, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML: ' + parserError.textContent);
            }
            
            // Basic conversion - this is a simplified approach
            let turtle = '';
            const namespaces = this.extractNamespaces(xmlDoc);
            
            // Add prefixes
            for (const [prefix, uri] of Object.entries(namespaces)) {
                turtle += `@prefix ${prefix}: <${uri}> .\n`;
            }
            turtle += '\n';
            
            // Convert RDF elements
            const rdfElements = xmlDoc.querySelectorAll('*[rdf\\:about], *[about], Dataset, Catalog, Distribution, DataService');
            
            for (const element of rdfElements) {
                const subject = this.getSubjectFromElement(element, namespaces);
                if (subject) {
                    turtle += this.convertElementToTurtle(element, subject, namespaces);
                }
            }
            
            console.log('Conversion completed');
            return turtle;
            
        } catch (error) {
            console.error('RDF/XML conversion error:', error);
            throw new Error(`Failed to convert RDF/XML: ${error.message}`);
        }
    }

    /**
     * Extract namespaces from XML document
     */
    extractNamespaces(xmlDoc) {
        const namespaces = {};
        const rootElement = xmlDoc.documentElement;
        
        // Default namespaces
        namespaces['rdf'] = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
        
        // Extract xmlns declarations
        for (const attr of rootElement.attributes) {
            if (attr.name.startsWith('xmlns:')) {
                const prefix = attr.name.substring(6);
                namespaces[prefix] = attr.value;
            } else if (attr.name === 'xmlns') {
                namespaces[''] = attr.value;
            }
        }
        
        // Add common prefixes if not present
        if (!namespaces['dcat']) namespaces['dcat'] = 'http://www.w3.org/ns/dcat#';
        if (!namespaces['dcterms']) namespaces['dcterms'] = 'http://purl.org/dc/terms/';
        if (!namespaces['foaf']) namespaces['foaf'] = 'http://xmlns.com/foaf/0.1/';
        if (!namespaces['vcard']) namespaces['vcard'] = 'http://www.w3.org/2006/vcard/ns#';
        
        return namespaces;
    }

    /**
     * Get subject URI from element
     */
    getSubjectFromElement(element, namespaces) {
        // Check for rdf:about
        const about = element.getAttribute('rdf:about') || element.getAttribute('about');
        if (about) {
            return about.startsWith('http') ? `<${about}>` : this.expandCurie(about, namespaces);
        }
        
        // Check for rdf:ID
        const id = element.getAttribute('rdf:ID') || element.getAttribute('ID');
        if (id) {
            return `<#${id}>`;
        }
        
        // Generate blank node
        const nodeId = element.getAttribute('rdf:nodeID') || `node${Math.random().toString(36).substr(2, 9)}`;
        return nodeId.startsWith('_:') ? nodeId : `_:${nodeId}`;
    }

    /**
     * Convert XML element to Turtle triples
     */
    convertElementToTurtle(element, subject, namespaces) {
        let turtle = '';
        
        // Add type if element name represents a class
        const localName = element.localName;
        const namespaceURI = element.namespaceURI;
        
        if (localName && namespaceURI && namespaceURI !== namespaces.rdf) {
            const prefix = this.findPrefixForNamespace(namespaceURI, namespaces);
            if (prefix) {
                turtle += `${subject} a ${prefix}:${localName} ;\n`;
            } else {
                turtle += `${subject} a <${namespaceURI}${localName}> ;\n`;
            }
        }
        
        // Process child elements as properties
        for (const child of element.children) {
            const property = this.getPropertyFromElement(child, namespaces);
            const value = this.getValueFromElement(child, namespaces);
            if (property && value) {
                turtle += `    ${property} ${value} ;\n`;
            }
        }
        
        // Remove trailing semicolon and add period
        turtle = turtle.replace(/;\n$/, ' .\n\n');
        
        return turtle;
    }

    /**
     * Get property name from element
     */
    getPropertyFromElement(element, namespaces) {
        const localName = element.localName;
        const namespaceURI = element.namespaceURI;
        
        if (!localName) return null;
        
        if (namespaceURI) {
            const prefix = this.findPrefixForNamespace(namespaceURI, namespaces);
            return prefix ? `${prefix}:${localName}` : `<${namespaceURI}${localName}>`;
        }
        
        return localName;
    }

    /**
     * Get value from element
     */
    getValueFromElement(element, namespaces) {
        // Check for rdf:resource
        const resource = element.getAttribute('rdf:resource') || element.getAttribute('resource');
        if (resource) {
            return resource.startsWith('http') ? `<${resource}>` : this.expandCurie(resource, namespaces);
        }
        
        // Check for nested resource
        if (element.children.length > 0) {
            const nestedSubject = this.getSubjectFromElement(element.children[0], namespaces);
            return nestedSubject || `_:nested${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Use text content as literal
        const textContent = element.textContent.trim();
        if (textContent) {
            return this.formatValue(textContent);
        }
        
        return '""';
    }

    /**
     * Find prefix for namespace URI
     */
    findPrefixForNamespace(namespaceURI, namespaces) {
        for (const [prefix, uri] of Object.entries(namespaces)) {
            if (uri === namespaceURI) {
                return prefix || 'ns';
            }
        }
        return null;
    }

    /**
     * Expand CURIE to full URI or prefixed name
     */
    expandCurie(curie, namespaces) {
        if (curie.startsWith('http')) {
            return `<${curie}>`;
        }
        
        const [prefix, localName] = curie.split(':');
        if (prefix && localName && namespaces[prefix]) {
            return `${prefix}:${localName}`;
        }
        
        return `"${curie}"`;
    }

    /**
     * Format value as Turtle literal
     */
    formatValue(value) {
        // Check if it's a URI
        if (value.startsWith('http://') || value.startsWith('https://')) {
            return `<${value}>`;
        }
        
        // Check if it's a number
        if (/^\d+$/.test(value)) {
            return value;
        }
        
        if (/^\d+\.\d+$/.test(value)) {
            return value;
        }
        
        // Escape quotes and format as string literal
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `"${escaped}"`;
    }

    /**
     * Parse RDF content with automatic format detection and conversion
     */
    parseRDF(content, format = null) {
        return new Promise((resolve, reject) => {
            try {
                // Auto-detect format if not provided or if auto
                const detectedFormat = (format && format !== 'auto') ? format : this.detectFormat(content);
                
                console.log(`Parsing RDF with detected format: ${detectedFormat}`);
                
                let processedContent = content;
                let finalFormat = detectedFormat;
                
                // Handle XML-based formats by converting to Turtle
                if (detectedFormat === 'application/rdf+xml') {
                    console.log('Converting RDF/XML to Turtle...');
                    try {
                        processedContent = this.convertRDFXMLToTurtle(content);
                        finalFormat = 'text/turtle';
                        console.log('RDF/XML successfully converted to Turtle');
                    } catch (conversionError) {
                        console.error('RDF/XML conversion failed:', conversionError);
                        reject(new Error(`RDF/XML conversion failed: ${conversionError.message}. You can try converting manually using online tools like: https://www.easyrdf.org/converter`));
                        return;
                    }
                }
                
                // Use N3.js for supported formats
                const parser = new N3.Parser({ format: finalFormat });
                const quads = parser.parse(processedContent);
                
                // Clear and populate store
                this.store = new N3.Store();
                this.store.addQuads(quads);
                
                resolve(this.store);
                
            } catch (error) {
                console.error('Parsing error:', error);
                
                // Provide more helpful error messages
                if (error.message.includes('Unexpected "<?xml"')) {
                    reject(new Error('RDF/XML format detected but conversion failed. Please try converting to Turtle, JSON-LD, or N-Triples format manually.'));
                } else {
                    reject(error);
                }
            }
        });
    }

    async validate(rdfContent, format, profile, vocabularies) {
        try {
            console.log('Starting validation...');
            
            // Parse RDF content with format detection
            await this.parseRDF(rdfContent, format);
            
            const result = this.calculateMetrics(profile, vocabularies);
            
            return {
                success: true,
                totalScore: result.totalScore,
                maxScore: result.maxScore,
                dimensions: result.dimensions,
                profile: profile,
                assessmentDate: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(' Validation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    calculateMetrics(profile, vocabularies) {
        const profileConfig = this.getProfileConfiguration(profile);
        const dimensions = [];
        let totalScore = 0;

        for (const dimensionConfig of profileConfig.dimensions) {
            const dimension = this.calculateDimension(dimensionConfig, vocabularies);
            dimensions.push(dimension);
            totalScore += dimension.score;
        }

        return {
            totalScore,
            maxScore: profileConfig.maxScore,
            dimensions
        };
    }

    getProfileConfiguration(profile) {
        const configs = {
            'dcat_ap': {
                maxScore: 405,
                dimensions: [
                    { name: 'Findability', maxScore: 100, weight: 1.0 },
                    { name: 'Accessibility', maxScore: 100, weight: 1.0 },
                    { name: 'Interoperability', maxScore: 85, weight: 1.0 },
                    { name: 'Reusability', maxScore: 75, weight: 1.0 },
                    { name: 'Contextuality', maxScore: 45, weight: 1.0 }
                ]
            },
            'dcat_ap_es': {
                maxScore: 405,
                dimensions: [
                    { name: 'Findability', maxScore: 100, weight: 1.0 },
                    { name: 'Accessibility', maxScore: 100, weight: 1.0 },
                    { name: 'Interoperability', maxScore: 85, weight: 1.0 },
                    { name: 'Reusability', maxScore: 75, weight: 1.0 },
                    { name: 'Contextuality', maxScore: 45, weight: 1.0 }
                ]
            },
            'nti_risp': {
                maxScore: 310,
                dimensions: [
                    { name: 'Findability', maxScore: 80, weight: 1.0 },
                    { name: 'Accessibility', maxScore: 75, weight: 1.0 },
                    { name: 'Interoperability', maxScore: 70, weight: 1.0 },
                    { name: 'Reusability', maxScore: 60, weight: 1.0 },
                    { name: 'Contextuality', maxScore: 25, weight: 1.0 }
                ]
            }
        };

        return configs[profile] || configs['dcat_ap'];
    }

    calculateDimension(dimensionConfig, vocabularies) {
        const metrics = [];
        let totalScore = 0;

        const dimensionMetrics = this.getDimensionMetrics(dimensionConfig.name);

        for (const metricConfig of dimensionMetrics) {
            const metric = this.calculateMetric(metricConfig, vocabularies);
            metrics.push(metric);
            totalScore += metric.score;
        }

        return {
            name: dimensionConfig.name,
            score: Math.min(totalScore, dimensionConfig.maxScore),
            maxScore: dimensionConfig.maxScore,
            metrics: metrics
        };
    }

    getDimensionMetrics(dimensionName) {
        const metrics = {
            'Findability': [
                { name: 'Keywords', maxScore: 30, property: 'dcat:keyword' },
                { name: 'Categories', maxScore: 20, property: 'dcat:theme' },
                { name: 'Spatial coverage', maxScore: 20, property: 'dcterms:spatial' },
                { name: 'Temporal coverage', maxScore: 20, property: 'dcterms:temporal' },
                { name: 'Title', maxScore: 10, property: 'dcterms:title' }
            ],
            'Accessibility': [
                { name: 'Access URL', maxScore: 50, property: 'dcat:accessURL' },
                { name: 'Download URL', maxScore: 20, property: 'dcat:downloadURL' },
                { name: 'License', maxScore: 20, property: 'dcterms:license' },
                { name: 'Access rights', maxScore: 10, property: 'dcterms:accessRights' }
            ],
            'Interoperability': [
                { name: 'Format', maxScore: 20, property: 'dcterms:format' },
                { name: 'Media type', maxScore: 10, property: 'dcat:mediaType' },
                { name: 'Conforms to', maxScore: 10, property: 'dcterms:conformsTo' },
                { name: 'DCAT compliance', maxScore: 45, property: 'rdf:type' }
            ],
            'Reusability': [
                { name: 'Contact point', maxScore: 20, property: 'dcat:contactPoint' },
                { name: 'Publisher', maxScore: 10, property: 'dcterms:publisher' },
                { name: 'License', maxScore: 20, property: 'dcterms:license' },
                { name: 'Access rights', maxScore: 10, property: 'dcterms:accessRights' },
                { name: 'Rights', maxScore: 15, property: 'dcterms:rights' }
            ],
            'Contextuality': [
                { name: 'Description', maxScore: 25, property: 'dcterms:description' },
                { name: 'Modification date', maxScore: 10, property: 'dcterms:modified' },
                { name: 'Release date', maxScore: 10, property: 'dcterms:issued' }
            ]
        };

        return metrics[dimensionName] || [];
    }

    calculateMetric(metricConfig, vocabularies) {
        const property = metricConfig.property;
        const predicate = this.expandProperty(property);
        
        const subjects = this.store.getSubjects(predicate, null, null);
        const uniqueSubjects = [...new Set(subjects.map(s => s.value))];
        
        const allSubjects = this.store.getSubjects(null, null, null);
        const totalResources = [...new Set(allSubjects.map(s => s.value))].length;
        
        const count = uniqueSubjects.length;
        const percentage = totalResources > 0 ? (count / totalResources) * 100 : 0;
        
        let score = 0;
        if (percentage >= 80) {
            score = metricConfig.maxScore;
        } else if (percentage >= 60) {
            score = Math.round(metricConfig.maxScore * 0.8);
        } else if (percentage >= 40) {
            score = Math.round(metricConfig.maxScore * 0.6);
        } else if (percentage >= 20) {
            score = Math.round(metricConfig.maxScore * 0.4);
        } else if (percentage > 0) {
            score = Math.round(metricConfig.maxScore * 0.2);
        }

        return {
            name: metricConfig.name,
            count: count,
            total: totalResources,
            percentage: percentage,
            score: score,
            maxScore: metricConfig.maxScore
        };
    }

    expandProperty(property) {
        const [prefix, localName] = property.split(':');
        const namespace = this.namespaces[prefix];
        return namespace ? namespace + localName : property;
    }
}

const validator = new MQAValidator();

self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    try {
        if (type === 'validate') {
            const result = await validator.validate(
                data.rdfContent,
                data.format,
                data.profile,
                data.vocabularies
            );
            
            if (result.success) {
                self.postMessage({
                    type: 'validation_result',
                    data: result
                });
            } else {
                self.postMessage({
                    type: 'validation_result',
                    data: { error: result.error }
                });
            }
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({
            type: 'validation_result',
            data: { error: error.message }
        });
    }
};

self.postMessage({
    type: 'ready',
    data: 'MQA Validator initialized - Python compatible'
});