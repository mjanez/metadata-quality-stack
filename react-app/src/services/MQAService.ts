import { Store as N3Store, Parser as N3Parser } from 'n3';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { ValidationProfile, MQAConfig, QualityResult, QualityMetric, VocabularyItem, SHACLReport, ProfileSelection, RDFValidationResult } from '../types';
import { RDFService } from './RDFService';
import { detectRDFFormat } from '../utils/formatDetection';
import mqaConfig from '../config/mqa-config.json';

export class MQAService {
  private static instance: MQAService;
  private config: MQAConfig;
  private vocabularies: Map<string, VocabularyItem[]> = new Map();

  // RDF URI constants for better maintainability
  private static readonly RDF_URIS = {
    RDFS_LABEL: 'http://www.w3.org/2000/01/rdf-schema#label',
    RDF_VALUE: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value',
    RDF_TYPE: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
  } as const;

  private constructor() {
    this.config = mqaConfig as unknown as MQAConfig;
  }

  public static getInstance(): MQAService {
    if (!MQAService.instance) {
      MQAService.instance = new MQAService();
    }
    return MQAService.instance;
  }

  /**
   * Load vocabulary from JSONL file
   */
  private async loadVocabulary(name: string): Promise<VocabularyItem[]> {
    try {
      if (this.vocabularies.has(name)) {
        return this.vocabularies.get(name)!;
      }

      console.debug(`📚 Loading vocabulary: ${name}`);
      const basePath = process.env.NODE_ENV === 'production' 
        ? '/metadata-quality-stack/data/'
        : '/data/';
      const response = await fetch(`${basePath}${name}.jsonl`);
      if (!response.ok) {
        throw new Error(`Failed to load vocabulary ${name}: ${response.statusText}`);
      }

      const text = await response.text();
      const items: VocabularyItem[] = text
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      this.vocabularies.set(name, items);
      console.log(`✅ Loaded ${items.length} items for vocabulary: ${name}`);
      return items;
    } catch (error) {
      console.warn(`⚠️ Failed to load vocabulary ${name}:`, error);
      return [];
    }
  }

  /**
   * Validate RDF syntax before processing
   */
  private async validateRDFSyntax(content: string, format?: string): Promise<RDFValidationResult> {
    // Auto-detect format if not specified or is 'auto'
    const detectedFormat = (!format || format === 'auto') ? detectRDFFormat(content) : format;
    
    console.debug(`🔍 Validating RDF syntax for detected format: ${detectedFormat}`);
    
    switch (detectedFormat) {
      case 'rdfxml':
        return this.validateRDFXMLSyntax(content);
      case 'jsonld':
        return this.validateJSONLDSyntax(content);
      case 'ntriples':
        return this.validateNTriplesSyntax(content);
      case 'turtle':
      default:
        return this.validateTurtleSyntax(content);
    }
  }

  /**
   * Validate RDF/XML syntax using proper RDF/XML parser
   */
  private async validateRDFXMLSyntax(content: string): Promise<RDFValidationResult> {
    return new Promise((resolve) => {
      try {
        const parser = new RdfXmlParser();
        let hasError = false;
        let errorMessage = '';
        let lineNumber = 0;
        let quadCount = 0;

        parser.on('data', () => {
          quadCount++;
        });

        parser.on('error', (error: any) => {
          if (!hasError) {
            hasError = true;
            errorMessage = error.message || 'RDF/XML parsing error';
            
            // Try to extract line number from error
            const lineMatch = errorMessage.match(/line[:\s]+(\d+)/i) || 
                             errorMessage.match(/position[:\s]+(\d+)/i);
            if (lineMatch) {
              lineNumber = parseInt(lineMatch[1], 10);
            }
            
            console.error(`❌ RDF/XML Syntax Error at line ${lineNumber}: ${errorMessage}`);
            resolve({ valid: false, error: errorMessage, lineNumber });
          }
        });

        parser.on('end', () => {
          if (!hasError) {
            console.debug(`✅ RDF/XML syntax validation passed (${quadCount} triples parsed)`);
            resolve({ valid: true });
          }
        });

        // Parse the content
        parser.write(content);
        parser.end();

      } catch (error: any) {
        console.error(`❌ RDF/XML Parsing Exception:`, error);
        resolve({ 
          valid: false, 
          error: error.message || 'Failed to parse RDF/XML content',
          lineNumber: 0
        });
      }
    });
  }

  /**
   * Validate Turtle syntax using N3Parser
   */
  private async validateTurtleSyntax(content: string): Promise<RDFValidationResult> {
    return new Promise((resolve) => {
      const parser = new N3Parser({ format: 'text/turtle' });
      let hasError = false;
      let errorMessage = '';
      let lineNumber = 0;

      try {
        parser.parse(content, (error, quad, prefixes) => {
          if (error && !hasError) {
            hasError = true;
            errorMessage = error.message || 'Unknown parsing error';
            
            // Extract line number from error message if available
            const lineMatch = errorMessage.match(/line (\d+)/i);
            if (lineMatch) {
              lineNumber = parseInt(lineMatch[1], 10);
            }
            
            console.error(`❌ Turtle Syntax Error at line ${lineNumber}: ${errorMessage}`);
            resolve({ valid: false, error: errorMessage, lineNumber });
          } else if (!quad && !hasError) {
            // End of parsing - success
            resolve({ valid: true });
          }
        });
      } catch (error: any) {
        console.error(`❌ Turtle Parsing Exception:`, error);
        resolve({ 
          valid: false, 
          error: error.message || 'Failed to parse Turtle content',
          lineNumber: 0
        });
      }
    });
  }

  /**
   * Validate N-Triples syntax using N3Parser
   */
  private async validateNTriplesSyntax(content: string): Promise<RDFValidationResult> {
    return new Promise((resolve) => {
      const parser = new N3Parser({ format: 'application/n-triples' });
      let hasError = false;
      let errorMessage = '';
      let lineNumber = 0;

      try {
        parser.parse(content, (error, quad, prefixes) => {
          if (error && !hasError) {
            hasError = true;
            errorMessage = error.message || 'Unknown parsing error';
            
            // Extract line number from error message if available
            const lineMatch = errorMessage.match(/line (\d+)/i);
            if (lineMatch) {
              lineNumber = parseInt(lineMatch[1], 10);
            }
            
            console.error(`❌ N-Triples Syntax Error at line ${lineNumber}: ${errorMessage}`);
            resolve({ valid: false, error: errorMessage, lineNumber });
          } else if (!quad && !hasError) {
            // End of parsing - success
            resolve({ valid: true });
          }
        });
      } catch (error: any) {
        console.error(`❌ N-Triples Parsing Exception:`, error);
        resolve({ 
          valid: false, 
          error: error.message || 'Failed to parse N-Triples content',
          lineNumber: 0
        });
      }
    });
  }

  /**
   * Validate JSON-LD syntax specifically
   */
  private async validateJSONLDSyntax(content: string): Promise<RDFValidationResult> {
    try {
      // First check if it's valid JSON
      const parsed = JSON.parse(content);
      
      // Basic JSON-LD structure validation
      if (typeof parsed !== 'object' || parsed === null) {
        return {
          valid: false,
          error: 'JSON-LD must be a JSON object or array',
          lineNumber: 1
        };
      }

      // For more thorough validation, we could use a JSON-LD library
      // but for now, valid JSON that's an object is considered valid JSON-LD
      console.debug(`✅ JSON-LD syntax validation passed`);
      return { valid: true };
      
    } catch (error: any) {
      // Parse JSON error message to extract line number
      const lineMatch = error.message.match(/line (\d+)/i) || 
                       error.message.match(/position (\d+)/i);
      let lineNumber = 0;
      
      if (lineMatch) {
        const position = parseInt(lineMatch[1], 10);
        // Rough estimation of line number from position
        lineNumber = content.substring(0, position).split('\n').length;
      }

      return {
        valid: false,
        error: `JSON syntax error: ${error.message}`,
        lineNumber
      };
    }
  }

  /**
   * Parse RDF content into N3 Store
   */
  private async parseRDF(content: string, format?: string): Promise<N3Store> {
    return new Promise((resolve, reject) => {
      const store = new N3Store();
      
      // Map our RDFFormat to N3Parser format strings  
      const formatMap: Record<string, string> = {
        'turtle': 'text/turtle',
        'rdfxml': 'application/rdf+xml',
        'jsonld': 'application/ld+json',
        'ntriples': 'application/n-triples',
        'auto': 'text/turtle' // Default fallback
      };

      const parserFormat = format && formatMap[format] ? formatMap[format] : 'text/turtle';
      const parser = new N3Parser({ format: parserFormat });

      parser.parse(content, (error, quad, prefixes) => {
        if (error) {
          reject(error);
        } else if (quad) {
          store.addQuad(quad);
        } else {
          // End of parsing
          resolve(store);
        }
      });
    });
  }

  /**
   * Check if property exists in store
   */
  private hasProperty(store: N3Store, property: string, profile?: ValidationProfile): { found: boolean; values: string[] } {
    const quads = store.getQuads();
    const matchingQuads = quads.filter(quad => quad.predicate.value === property);
    const values: string[] = [];
    
    matchingQuads.forEach(quad => {
      const extractedValues = this.extractValuesFromQuad(quad, store, property, profile);
      values.push(...extractedValues);
    });

    // Remove duplicates
    const uniqueValues = values.filter((value, index) => values.indexOf(value) === index);

    return {
      found: matchingQuads.length > 0,
      values: uniqueValues
    };
  }

  /**
   * Extract values from a quad based on object type and profile
   */
  private extractValuesFromQuad(quad: any, store: N3Store, property: string, profile?: ValidationProfile): string[] {
    const values: string[] = [];

    switch (quad.object.termType) {
      case 'Literal':
        values.push(quad.object.value);
        break;
        
      case 'NamedNode':
        values.push(quad.object.value);
        // Extract nested properties for specific profiles
        if (profile === 'nti_risp') {
          values.push(...this.extractProfileSpecificProperties(quad.object, store, profile));
        }
        break;
        
      case 'BlankNode':
        const blankNodeValues = this.extractBlankNodeValues(quad.object, store, property, profile);
        values.push(...blankNodeValues);
        break;
        
      default:
        values.push(quad.object.value);
        break;
    }

    return values;
  }

  /**
   * Extract values from BlankNode based on profile
   */
  private extractBlankNodeValues(blankNode: any, store: N3Store, property: string, profile?: ValidationProfile): string[] {
    console.debug(`🔍 Found BlankNode for property ${property}: ${blankNode.value}`);
    
    if (profile === 'nti_risp') {
      return this.extractNTIRISPBlankNodeValues(blankNode, store);
    } else {
      // For other profiles, return the BlankNode ID (existing behavior)
      return [blankNode.value];
    }
  }

  /**
   * Extract nested properties for specific profiles
   */
  private extractProfileSpecificProperties(node: any, store: N3Store, profile?: ValidationProfile): string[] {
    switch (profile) {
      case 'nti_risp':
        return this.extractNTIRISPProperties(node, store);
      
      // Future profiles can be added here
      case 'dcat_ap':
      case 'dcat_ap_es':
      default:
        return []; // No special extraction for other profiles
    }
  }

  /**
   * Extract properties for NTI-RISP profile (unified method)
   */
  private extractNTIRISPProperties(node: any, store: N3Store): string[] {
    return this.extractRDFProperties(node, store, [
      MQAService.RDF_URIS.RDFS_LABEL,
      MQAService.RDF_URIS.RDF_VALUE
    ], 'NTI-RISP');
  }

  /**
   * Extract values from BlankNode for NTI-RISP profile
   * Handles IMT (Internet Media Type) structures with rdfs:label and rdf:value
   */
  private extractNTIRISPBlankNodeValues(blankNode: any, store: N3Store): string[] {
    return this.extractNTIRISPProperties(blankNode, store);
  }

  /**
   * Generic method to extract RDF properties from a node
   */
  private extractRDFProperties(node: any, store: N3Store, propertyUris: string[], context: string = ''): string[] {
    const values: string[] = [];
    
    propertyUris.forEach(propertyUri => {
      const quads = store.getQuads().filter(q => 
        q.subject.equals(node) && 
        q.predicate.value === propertyUri
      );
      
      quads.forEach(quad => {
        if (quad.object.termType === 'Literal') {
          values.push(quad.object.value);
          const propertyName = this.getPropertyDisplayName(propertyUri);
          console.debug(`🏷️ Found ${propertyName} from ${context}: ${quad.object.value}`);
        }
      });
    });

    return values;
  }

  /**
   * Get display name for RDF property URI
   */
  private getPropertyDisplayName(propertyUri: string): string {
    const propertyNames: { [key: string]: string } = {
      [MQAService.RDF_URIS.RDFS_LABEL]: 'rdfs:label',
      [MQAService.RDF_URIS.RDF_VALUE]: 'rdf:value',
      [MQAService.RDF_URIS.RDF_TYPE]: 'rdf:type'
    };
    
    return propertyNames[propertyUri] || propertyUri.split('#').pop() || propertyUri;
  }

  /**
   * Check if value is in vocabulary (deprecated, use checkVocabularyMatch instead)
   */
  private async isInVocabulary(value: string, vocabularyName: string): Promise<boolean> {
    console.warn(`⚠️ isInVocabulary is deprecated. Use checkVocabularyMatch instead.`);
    return this.checkVocabularyMatch([value], vocabularyName);
  }

  /**
   * Evaluate a single metric
   */
  private async evaluateMetric(
    store: N3Store, 
    metricConfig: any, 
    profile: ValidationProfile,
    category: string
  ): Promise<QualityMetric> {
    const { id, weight, property } = metricConfig;
    const label = this.config.metricLabels[id] || { en: id, es: id };
    
    let score = 0;
    let found = false;
    let values: string[] = [];

    try {
      // Convert short property names to full URIs if needed
      const fullProperty = this.expandProperty(property);
      const propertyCheck = this.hasProperty(store, fullProperty, profile);
      found = propertyCheck.found;
      values = propertyCheck.values;

      if (found) {
        // Enhanced scoring based on metric type
        score = await this.calculateMetricScore(id, values, weight, profile);
      }
    } catch (error) {
      console.warn(`Warning evaluating metric ${id}:`, error);
      score = 0;
    }

    return {
      id,
      name: label.en || id,
      score,
      maxScore: weight,
      weight,
      description: label.es || label.en || id,
      category: category as any,
      property,
      found,
      value: values.length > 0 ? values.join(', ') : undefined
    };
  }

  /**
   * Calculate score for a specific metric based on its type and values
   */
  private async calculateMetricScore(metricId: string, values: string[], maxWeight: number, profile?: ValidationProfile): Promise<number> {
    if (!values || values.length === 0) {
      return 0;
    }

    switch (metricId) {
      // Format-related metrics
      case 'dct_format_vocabulary':
        return await this.checkVocabularyMatch(values, 'file_types') ? maxWeight : 0;
        
      case 'dct_mediaType_vocabulary':
        return await this.checkVocabularyMatch(values, 'media_types') ? maxWeight : 0;

      case 'dcat_mediaType':
        return await this.checkVocabularyMatch(values, 'media_types') ? maxWeight : 0;

      // NTI-RISP specific vocabulary metrics
      case 'dct_format_vocabulary_nti_risp':
        console.debug(`🏷️ Evaluating NTI-RISP format vocabulary for values:`, values);
        return await this.checkNTIRISPVocabularyMatch(values, 'file_types', profile) ? maxWeight : 0;
        
      case 'dct_mediaType_vocabulary_nti_risp':
        console.debug(`📱 Evaluating NTI-RISP media type vocabulary for values:`, values);
        return await this.checkNTIRISPVocabularyMatch(values, 'media_types', profile) ? maxWeight : 0;

      case 'dct_format_nonproprietary':
        return await this.checkVocabularyMatch(values, 'non_proprietary') ? maxWeight : 0;

      case 'dct_format_machinereadable':
        console.debug(`📋 Checking machine-readable formats for values:`, values);
        return await this.checkVocabularyMatch(values, 'machine_readable') ? maxWeight : 0;

      // License-related metrics
      case 'dct_license_vocabulary':
        return await this.checkVocabularyMatch(values, 'licenses') ? maxWeight : 0;

      // Access rights metrics
      case 'dct_accessRights_vocabulary':
        return await this.checkVocabularyMatch(values, 'access_rights') ? maxWeight : 0;

      // URL status checks (simplified - in real implementation would check HTTP status)
      case 'dcat_accessURL_status':
      case 'dcat_downloadURL_status':
        return this.checkValidUrls(values) ? maxWeight : 0;

      // Existence-based metrics (presence = full score)
      case 'dct_title':
      case 'dct_description': 
      case 'dcat_keyword':
      case 'dcat_theme':
      case 'dct_spatial':
      case 'dct_temporal':
      case 'dct_format':
      case 'dcat_accessURL':
      case 'dcat_downloadURL':
      case 'dct_license':
      case 'dct_accessRights':
      case 'dct_language':
      case 'dct_conformsTo':
      case 'dct_creator':
      case 'dct_publisher':
      case 'dct_contactPoint':
      case 'dcat_distribution':
      case 'dct_issued':
      case 'dct_modified':
        return maxWeight; // Full score for presence

      // Quality-based metrics (can have partial scores)
      case 'dct_title_length':
        return this.evaluateTextLength(values[0], 10, 100) * maxWeight;

      case 'dct_description_length':
        return this.evaluateTextLength(values[0], 50, 500) * maxWeight;

      default:
        // Default: full score for presence
        return maxWeight;
    }
  }

  /**
   * Check if any value matches entries in the specified vocabulary
   */
  private async checkVocabularyMatch(values: string[], vocabularyName: string): Promise<boolean> {
    const vocabulary = await this.loadVocabulary(vocabularyName);
    
    // Filter out empty or invalid values
    const validValues = values.filter(value => value && typeof value === 'string' && value.trim().length > 0);
    
    console.debug(`🔍 Checking ${validValues.length} values against vocabulary '${vocabularyName}' (${vocabulary.length} entries)`);
    
    const result = validValues.some(value => {
      const match = vocabulary.some(item => {
        // Compare with URI (primary field in JSONL files)
        const uriMatch = item.uri && this.normalizeValue(item.uri) === this.normalizeValue(value);
        // Compare with legacy value field (backwards compatibility)
        const valueMatch = item.value && this.normalizeValue(item.value) === this.normalizeValue(value);
        // Compare with label (for human-readable matching)
        const labelMatch = item.label && this.normalizeValue(item.label) === this.normalizeValue(value);
        
        // Special handling for media types: extract MIME type from IANA URIs
        let mimeTypeMatch = false;
        if (vocabularyName === 'media_types' && item.uri) {
          const mimeTypeRegex = /http:\/\/www\.iana\.org\/assignments\/media-types\/(.+)/;
          const match = item.uri.match(mimeTypeRegex);
          if (match) {
            const extractedMimeType = match[1];
            mimeTypeMatch = this.normalizeValue(extractedMimeType) === this.normalizeValue(value);
          }
        }
        
        if (uriMatch || valueMatch || labelMatch || mimeTypeMatch) {
          console.debug(`✅ Found match for '${value}' in vocabulary '${vocabularyName}': ${item.uri || item.value} (${item.label})`);
          return true;
        }
        return false;
      });
      
      if (match) {
        console.debug(`✅ Found match for value in vocabulary '${vocabularyName}'`);
      } else {
        console.debug(`❌ No match found for value in vocabulary '${vocabularyName}'`);
      }
      
      return match;
    });
    
    console.debug(`🎯 Vocabulary match result for '${vocabularyName}': ${result}`);
    return result;
  }

  /**
   * Check vocabulary match specifically for NTI-RISP metrics
   * This method is optimized for IMT (Internet Media Type) structures with BlankNodes
   */
  private async checkNTIRISPVocabularyMatch(values: string[], vocabularyName: string, profile?: ValidationProfile): Promise<boolean> {
    if (profile !== 'nti_risp') {
      // Fall back to standard vocabulary matching for non-NTI-RISP profiles
      return this.checkVocabularyMatch(values, vocabularyName);
    }

    console.debug(`🏷️ NTI-RISP vocabulary check for '${vocabularyName}' with values:`, values);
    
    const vocabulary = await this.loadVocabulary(vocabularyName);
    
    // Filter out empty or invalid values
    const validValues = values.filter(value => value && typeof value === 'string' && value.trim().length > 0);
    
    console.debug(`🔍 Checking ${validValues.length} NTI-RISP values against vocabulary '${vocabularyName}' (${vocabulary.length} entries)`);
    
    const result = validValues.some(value => {
      const match = vocabulary.some(item => {
        // Compare with URI (primary field in JSONL files)
        const uriMatch = item.uri && this.normalizeValue(item.uri) === this.normalizeValue(value);
        // Compare with legacy value field (backwards compatibility)
        const valueMatch = item.value && this.normalizeValue(item.value) === this.normalizeValue(value);
        // Compare with label (for human-readable matching - important for NTI-RISP)
        const labelMatch = item.label && this.normalizeValue(item.label) === this.normalizeValue(value);
        
        // Enhanced MIME type matching for NTI-RISP media types
        let mimeTypeMatch = false;
        if (vocabularyName === 'media_types' && item.uri) {
          const mimeTypeRegex = /http:\/\/www\.iana\.org\/assignments\/media-types\/(.+)/;
          const uriMatch = item.uri.match(mimeTypeRegex);
          if (uriMatch) {
            const extractedMimeType = uriMatch[1];
            mimeTypeMatch = this.normalizeValue(extractedMimeType) === this.normalizeValue(value);
          }
        }
        
        // Enhanced file type matching for NTI-RISP file formats
        let fileTypeMatch = false;
        if (vocabularyName === 'file_types') {
          // Check common format abbreviations (case insensitive)
          const normalizedValue = this.normalizeValue(value);
          const normalizedLabel = this.normalizeValue(item.label || '');
          const normalizedUri = this.normalizeValue(item.uri || '');
          
          // Match common patterns like CSV, JSON, PDF, etc.
          fileTypeMatch = normalizedLabel.includes(normalizedValue) || 
                        normalizedValue.includes(normalizedLabel) ||
                        normalizedUri.includes(normalizedValue);
        }
        
        if (uriMatch || valueMatch || labelMatch || mimeTypeMatch || fileTypeMatch) {
          console.debug(`✅ NTI-RISP match found for '${value}' in vocabulary '${vocabularyName}': ${item.uri || item.value} (${item.label})`);
          return true;
        }
        return false;
      });
      
      if (match) {
        console.debug(`✅ NTI-RISP vocabulary match found for value '${value}' in vocabulary '${vocabularyName}'`);
      } else {
        console.debug(`❌ No NTI-RISP vocabulary match found for value '${value}' in vocabulary '${vocabularyName}'`);
      }
      
      return match;
    });
    
    console.debug(`🎯 NTI-RISP vocabulary match result for '${vocabularyName}': ${result}`);
    return result;
  }

  /**
   * Check if values are valid URLs
   */
  private checkValidUrls(values: string[]): boolean {
    try {
      return values.every(value => {
        new URL(value);
        return true;
      });
    } catch {
      return false;
    }
  }

  /**
   * Evaluate text length quality (0-1 score)
   */
  private evaluateTextLength(text: string, minLength: number, idealLength: number): number {
    if (!text) return 0;
    const length = text.length;
    if (length < minLength) return 0.5; // Too short
    if (length >= idealLength) return 1.0; // Ideal or longer
    return 0.5 + (length - minLength) / (idealLength - minLength) * 0.5; // Partial score
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: string | undefined | null): string {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value.toLowerCase().trim();
  }

  /**
   * Expand short property names to full URIs
   */
  private expandProperty(property: string): string {
    const prefixes: { [key: string]: string } = {
      'dcat:': 'http://www.w3.org/ns/dcat#',
      'dcterms:': 'http://purl.org/dc/terms/',
      'dct:': 'http://purl.org/dc/terms/',
      'foaf:': 'http://xmlns.com/foaf/0.1/',
      'vcard:': 'http://www.w3.org/2006/vcard/ns#',
      'adms:': 'http://www.w3.org/ns/adms#',
      'rdf:': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#'
    };

    for (const [prefix, uri] of Object.entries(prefixes)) {
      if (property.startsWith(prefix)) {
        return property.replace(prefix, uri);
      }
    }

    // If already a full URI or no prefix found, return as is
    return property;
  }

  /**
   * Calculate quality with SHACL validation included
   */
  public async calculateQualityWithSHACL(
    content: string, 
    profileSelection: ProfileSelection | ValidationProfile,
    format?: string,
    skipSyntaxValidation?: boolean
  ): Promise<{ quality: QualityResult; shaclReport: SHACLReport }> {
    try {
      // Extract profile string from ProfileSelection or use as-is if it's a string
      const profile: ValidationProfile = typeof profileSelection === 'string' 
        ? profileSelection 
        : profileSelection.profile;
        
      console.debug(`🔍 Starting MQA+SHACL evaluation for profile: ${profile}`);

      // Validate RDF syntax first (unless already validated)
      if (!skipSyntaxValidation) {
        console.debug(`📝 Validating RDF syntax...`);
        const syntaxValidation = await this.validateRDFSyntax(content, format);
        
        if (!syntaxValidation.valid) {
          const errorMsg = `RDF Syntax Error${syntaxValidation.lineNumber ? ` at line ${syntaxValidation.lineNumber}` : ''}: ${syntaxValidation.error}`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        console.debug(`✅ RDF syntax validation passed`);
      } else {
        console.debug(`⏭️ Skipping syntax validation (already validated)`);
      }

      // Run standard MQA evaluation
      const quality = await this.calculateQuality(content, profile, format, true); // Skip syntax validation in calculateQuality too

      // Run SHACL validation
      const shaclReport = await RDFService.validateWithSHACL(content, profile);

      // Update compliance metric if it exists
      const complianceMetric = quality.metrics.find(m => m.id.includes('compliance'));
      if (complianceMetric) {
        const complianceScore = RDFService.calculateComplianceScore(shaclReport);
        complianceMetric.score = Math.round((complianceScore / 100) * complianceMetric.maxScore);
        complianceMetric.found = shaclReport.conforms;
        complianceMetric.value = shaclReport.conforms ? 'compliant' : 'non-compliant';

        // Recalculate totals
        const totalScore = quality.metrics.reduce((sum, m) => sum + m.score, 0);
        const maxScore = quality.metrics.reduce((sum, m) => sum + m.maxScore, 0);
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        quality.totalScore = totalScore;
        quality.percentage = percentage;

        // Update category totals
        for (const [, categoryData] of Object.entries(quality.byCategory)) {
          const categoryMetrics = categoryData.metrics;
          const categoryScore = categoryMetrics.reduce((sum: number, m: QualityMetric) => sum + m.score, 0);
          const categoryMaxScore = categoryMetrics.reduce((sum: number, m: QualityMetric) => sum + m.maxScore, 0);
          
          categoryData.score = categoryScore;
          categoryData.percentage = categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0;
        }
      }

      console.debug(`✅ MQA+SHACL evaluation completed. SHACL conforms: ${shaclReport.conforms}`);

      return { quality, shaclReport };

    } catch (error) {
      console.error('❌ MQA+SHACL evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate quality assessment for RDF content
   */
  public async calculateQuality(
    content: string, 
    profile: ValidationProfile, 
    format?: string, 
    skipSyntaxValidation?: boolean
  ): Promise<QualityResult> {
    try {
      console.debug(`🔍 Starting MQA evaluation for profile: ${profile}`);
      
      // Validate RDF syntax first (unless already validated)
      if (!skipSyntaxValidation) {
        console.debug(`📝 Validating RDF syntax...`);
        const syntaxValidation = await this.validateRDFSyntax(content, format);
        
        if (!syntaxValidation.valid) {
          const errorMsg = `RDF Syntax Error${syntaxValidation.lineNumber ? ` at line ${syntaxValidation.lineNumber}` : ''}: ${syntaxValidation.error}`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        console.debug(`✅ RDF syntax validation passed`);
      } else {
        console.debug(`⏭️ Skipping syntax validation (already validated)`);
      }
      
      // Parse RDF content
      const store = await this.parseRDF(content, format);
      console.debug(`📊 Parsed RDF store with ${store.size} triples`);

      // Get profile configuration
      const profileConfig = this.config.profiles[profile];
      const metricsConfig = this.config.metricsByProfile[profile];

      if (!profileConfig || !metricsConfig) {
        throw new Error(`Profile ${profile} not found in configuration`);
      }

      // Evaluate metrics by category
      const allMetrics: QualityMetric[] = [];
      const byCategory: any = {};

      for (const [category, metrics] of Object.entries(metricsConfig)) {
        console.debug(`📋 Evaluating ${metrics.length} metrics for category: ${category}`);
        
        const categoryMetrics: QualityMetric[] = [];
        
        for (const metricConfig of metrics) {
          const metric = await this.evaluateMetric(store, metricConfig, profile, category);
          categoryMetrics.push(metric);
          allMetrics.push(metric);
        }

        const categoryScore = categoryMetrics.reduce((sum, m) => sum + m.score, 0);
        const categoryMaxScore = categoryMetrics.reduce((sum, m) => sum + m.maxScore, 0);
        
        byCategory[category] = {
          score: categoryScore,
          maxScore: categoryMaxScore,
          percentage: categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0,
          metrics: categoryMetrics
        };
      }

      // Calculate totals
      const totalScore = allMetrics.reduce((sum, m) => sum + m.score, 0);
      const maxScore = allMetrics.reduce((sum, m) => sum + m.maxScore, 0);
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      console.log(`✅ MQA evaluation completed: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`);

      return {
        totalScore,
        maxScore,
        percentage,
        metrics: allMetrics,
        byCategory
      };

    } catch (error) {
      console.error('❌ MQA evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Validate RDF syntax (public method)
   */
  public async validateRDF(content: string, format?: string): Promise<RDFValidationResult> {
    console.debug(`🔍 Validating RDF syntax for format: ${format || 'auto'}...`);
    return await this.validateRDFSyntax(content, format);
  }

  /**
   * Get profile information
   */
  public getProfileInfo(profile: ValidationProfile) {
    return this.config.profiles[profile];
  }

  /**
   * Get all available profiles
   */
  public getAvailableProfiles() {
    return Object.keys(this.config.profiles) as ValidationProfile[];
  }
}

export default MQAService.getInstance();
