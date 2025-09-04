import { Store as N3Store, Parser as N3Parser } from 'n3';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { ValidationProfile, MQAConfig, QualityResult, QualityMetric, VocabularyItem, SHACLReport, ProfileSelection, RDFValidationResult } from '../types';
import { RDFService } from './RDFService';
import { detectRDFFormat } from '../utils/formatDetection';
import mqaConfig from '../config/mqa-config.json';
import i18n from '../i18n';

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
   * Get vocabulary metric information for vocabulary-based metrics
   */
  private getVocabularyMetricInfo(metricId: string): { baseProperty: string; vocabularyName: string } | null {
    const vocabularyMetrics: { [key: string]: { baseProperty: string; vocabularyName: string } } = {
      'dct_format_vocabulary': { baseProperty: 'dct:format', vocabularyName: 'file_types' },
      'dct_mediaType_vocabulary': { baseProperty: 'dcat:mediaType', vocabularyName: 'media_types' },
      'dct_format_vocabulary_nti_risp': { baseProperty: 'dct:format', vocabularyName: 'file_types' },
      'dct_mediaType_vocabulary_nti_risp': { baseProperty: 'dcat:mediaType', vocabularyName: 'media_types' },
      'dct_format_nonproprietary': { baseProperty: 'dct:format', vocabularyName: 'non_proprietary' },
      'dct_format_machinereadable': { baseProperty: 'dct:format', vocabularyName: 'machine_readable' },
      'dct_license_vocabulary': { baseProperty: 'dct:license', vocabularyName: 'licenses' },
      'dct_accessRights_vocabulary': { baseProperty: 'dct:accessRights', vocabularyName: 'access_rights' }
    };
    
    return vocabularyMetrics[metricId] || null;
  }

  /**
   * Determine entity type for a specific metric
   */
  private getMetricEntityType(metricId: string): 'Dataset' | 'Distribution' | 'Catalog' | 'Multi' {
    // Metrics that apply to multiple entity types simultaneously
    const multiEntityMetrics = [
      'dct_issued', 'dct_modified', 'dct_title', 'dct_description'
    ];
    
    // Metrics that apply to Datasets only
    const datasetMetrics = [
      'dcat_keyword', 'dcat_theme', 'dct_spatial', 'dct_temporal',
      'dct_creator', 'dct_language', 'dct_conformsTo', 'dcat_contactPoint', 
      'dct_accessRights', 'dcat_ap_compliance', 'dcat_ap_es_compliance', 
      'nti_risp_compliance', 'dct_publisher', 'dct_accessRights_vocabulary'
    ];
    
    // Metrics that apply to Distributions only
    const distributionMetrics = [
      'dcat_accessURL', 'dcat_downloadURL', 'dct_format', 'dcat_mediaType',
      'dcat_byteSize', 'dct_format_vocabulary', 'dct_format_machinereadable',
      'dct_format_vocabulary_nti_risp', 'dct_mediaType_vocabulary_nti_risp',
      'dct_mediaType_vocabulary', 'dct_format_nonproprietary',
      'dcat_accessURL_status', 'dcat_downloadURL_status', 'dct_license',
      'dct_license_vocabulary'
    ];
    
    // Metrics that apply to Catalogs only
    const catalogMetrics = [
      // Catalog-specific metrics would go here
    ];
    
    // Priority classification
    if (multiEntityMetrics.includes(metricId)) return 'Multi';
    if (distributionMetrics.includes(metricId)) return 'Distribution';
    if (datasetMetrics.includes(metricId)) return 'Dataset';
    return 'Catalog'; // Default fallback
  }

  /**
   * Get URI for entity type
   */
  private getEntityTypeURI(entityType: 'Dataset' | 'Distribution' | 'Catalog'): string {
    const typeMap = {
      'Dataset': 'http://www.w3.org/ns/dcat#Dataset',
      'Distribution': 'http://www.w3.org/ns/dcat#Distribution',
      'Catalog': 'http://www.w3.org/ns/dcat#Catalog'
    };
    
    return typeMap[entityType];
  }

  /**
   * Count total entities of a specific type in the RDF store
   */
  private countEntitiesByType(store: N3Store, entityType: 'Dataset' | 'Distribution' | 'Catalog'): number {
    const typeURI = this.getEntityTypeURI(entityType);
    const typeQuads = store.getQuads().filter(quad => 
      quad.predicate.value === MQAService.RDF_URIS.RDF_TYPE && 
      quad.object.value === typeURI
    );
    
    const count = typeQuads.length;
    console.debug(`📊 Found ${count} entities of type ${entityType}`);
    
    return count;
  }

  /**
   * Count entities that comply with a specific metric property
   */
  private countCompliantEntities(
    store: N3Store, 
    property: string, 
    entityType: 'Dataset' | 'Distribution' | 'Catalog',
    profile: ValidationProfile
  ): number {
    const typeURI = this.getEntityTypeURI(entityType);
    const fullProperty = this.expandProperty(property);
    
    // Get all entities of the specified type
    const entityQuads = store.getQuads().filter(quad => 
      quad.predicate.value === MQAService.RDF_URIS.RDF_TYPE && 
      quad.object.value === typeURI
    );
    
    let compliantCount = 0;
    
    entityQuads.forEach(entityQuad => {
      const entityURI = entityQuad.subject;
      
      // Check if this entity has the required property
      const propertyQuads = store.getQuads().filter(quad => 
        quad.subject.equals(entityURI) && 
        quad.predicate.value === fullProperty
      );
      
      if (propertyQuads.length > 0) {
        // For some metrics, we need to validate the property values
        const hasValidValue = this.validatePropertyValues(propertyQuads, property, store, profile);
        if (hasValidValue) {
          compliantCount++;
        }
      }
    });
    
    console.debug(`✅ ${compliantCount}/${entityQuads.length} ${entityType} entities comply with ${property}`);
    
    return compliantCount;
  }

  /**
   * Count entities that comply with vocabulary-based metrics
   * For vocabulary metrics, we need to evaluate ALL entities and check if their values are in vocabulary
   */
  private async countVocabularyCompliantEntities(
    store: N3Store,
    baseProperty: string, // e.g., 'dct:format'
    vocabularyName: string, // e.g., 'non_proprietary' 
    entityType: 'Dataset' | 'Distribution' | 'Catalog',
    profile: ValidationProfile
  ): Promise<number> {
    const typeURI = this.getEntityTypeURI(entityType);
    const fullProperty = this.expandProperty(baseProperty);
    
    // Get all entities of the specified type
    const entityQuads = store.getQuads().filter(quad => 
      quad.predicate.value === MQAService.RDF_URIS.RDF_TYPE && 
      quad.object.value === typeURI
    );
    
    let compliantCount = 0;
    
    for (const entityQuad of entityQuads) {
      const entityURI = entityQuad.subject;
      
      // Check if this entity has the base property
      const propertyQuads = store.getQuads().filter(quad => 
        quad.subject.equals(entityURI) && 
        quad.predicate.value === fullProperty
      );
      
      if (propertyQuads.length > 0) {
        // Extract values from property
        const values: string[] = [];
        propertyQuads.forEach(quad => {
          const extractedValues = this.extractValuesFromQuad(quad, store, baseProperty, profile);
          values.push(...extractedValues);
        });
        
        // Filter valid values
        const validValues = values.filter(value => value && value.trim().length > 0);
        
        if (validValues.length > 0) {
          // Check if any value is in the vocabulary
          const isInVocabulary = await this.checkVocabularyMatch(validValues, vocabularyName);
          if (isInVocabulary) {
            compliantCount++;
          }
        }
      }
      // Note: Entities WITHOUT the base property are counted as non-compliant (0 points)
      // This reflects that they don't meet the vocabulary requirement
    }
    
    console.debug(`🏷️ ${compliantCount}/${entityQuads.length} ${entityType} entities have valid ${vocabularyName} vocabulary values for ${baseProperty}`);
    
    return compliantCount;
  }

  /**
   * Validate if property values meet metric requirements
   */
  private validatePropertyValues(
    propertyQuads: any[], 
    property: string, 
    store: N3Store, 
    profile: ValidationProfile
  ): boolean {
    // For most metrics, presence is enough
    // But for specific cases, we might need value validation
    
    // Extract values for validation
    const values: string[] = [];
    propertyQuads.forEach(quad => {
      const extractedValues = this.extractValuesFromQuad(quad, store, property, profile);
      values.push(...extractedValues);
    });
    
    // Filter out empty values
    const validValues = values.filter(value => value && value.trim().length > 0);
    
    return validValues.length > 0;
  }

  /**
   * Evaluate multi-entity metrics (those that apply to both Datasets and Distributions)
   */
  private evaluateMultiEntityMetric(
    store: N3Store,
    property: string,
    profile: ValidationProfile
  ): { totalEntities: number; compliantEntities: number; datasetStats: { total: number; compliant: number }; distributionStats: { total: number; compliant: number } } {
    // Count datasets
    const datasetTotal = this.countEntitiesByType(store, 'Dataset');
    const datasetCompliant = this.countCompliantEntities(store, property, 'Dataset', profile);
    
    // Count distributions
    const distributionTotal = this.countEntitiesByType(store, 'Distribution');
    const distributionCompliant = this.countCompliantEntities(store, property, 'Distribution', profile);
    
    const totalEntities = datasetTotal + distributionTotal;
    const compliantEntities = datasetCompliant + distributionCompliant;
    
    console.debug(`🔄 Multi-entity metric evaluation: ${compliantEntities}/${totalEntities} total (Datasets: ${datasetCompliant}/${datasetTotal}, Distributions: ${distributionCompliant}/${distributionTotal})`);
    
    return {
      totalEntities,
      compliantEntities,
      datasetStats: { total: datasetTotal, compliant: datasetCompliant },
      distributionStats: { total: distributionTotal, compliant: distributionCompliant }
    };
  }

  /**
   * Check if value is in vocabulary (deprecated, use checkVocabularyMatch instead)
   */
  private async isInVocabulary(value: string, vocabularyName: string): Promise<boolean> {
    console.warn(`⚠️ isInVocabulary is deprecated. Use checkVocabularyMatch instead.`);
    return this.checkVocabularyMatch([value], vocabularyName);
  }

  /**
   * Evaluate a single metric with proportional scoring
   */
  private async evaluateMetric(
    store: N3Store, 
    metricConfig: any, 
    profile: ValidationProfile,
    category: string
  ): Promise<QualityMetric> {
    const { id, weight, property } = metricConfig;
    const label = this.getMetricLabel(id);
    
    // Determine entity type for this metric
    const entityType = this.getMetricEntityType(id);
    
    let score = 0;
    let found = false;
    let values: string[] = [];
    let compliantEntities = 0;
    let compliancePercentage = 0;
    let totalEntities = 0;
    let datasetStats: { total: number; compliant: number } | undefined;
    let distributionStats: { total: number; compliant: number } | undefined;

    try {
      if (entityType === 'Multi') {
        // Handle multi-entity metrics (Datasets + Distributions)
        const multiStats = this.evaluateMultiEntityMetric(store, property, profile);
        totalEntities = multiStats.totalEntities;
        compliantEntities = multiStats.compliantEntities;
        datasetStats = multiStats.datasetStats;
        distributionStats = multiStats.distributionStats;
        
        if (totalEntities === 0) {
          console.debug(`⚠️ No Dataset or Distribution entities found for multi-entity metric ${id}`);
          
          return {
            id,
            name: label.en || id,
            score: 0,
            maxScore: weight,
            weight,
            description: label.es || label.en || id,
            category: category as any,
            property,
            found: false,
            value: `No Dataset or Distribution entities found`,
            entityType,
            totalEntities: 0,
            compliantEntities: 0,
            compliancePercentage: 0,
            datasetEntities: datasetStats,
            distributionEntities: distributionStats
          };
        }
      } else {
        // Handle single-entity metrics
        totalEntities = this.countEntitiesByType(store, entityType as 'Dataset' | 'Distribution' | 'Catalog');
        
        if (totalEntities === 0) {
          console.debug(`⚠️ No ${entityType} entities found for metric ${id}`);
          
          return {
            id,
            name: label.en || id,
            score: 0,
            maxScore: weight,
            weight,
            description: label.es || label.en || id,
            category: category as any,
            property,
            found: false,
            value: `No ${entityType} entities found`,
            entityType,
            totalEntities: 0,
            compliantEntities: 0,
            compliancePercentage: 0
          };
        }
        
        // Check if this is a vocabulary-based metric
        const vocabularyMetricInfo = this.getVocabularyMetricInfo(id);
        
        if (vocabularyMetricInfo) {
          // Use special vocabulary evaluation
          compliantEntities = await this.countVocabularyCompliantEntities(
            store, 
            vocabularyMetricInfo.baseProperty, 
            vocabularyMetricInfo.vocabularyName, 
            entityType as 'Dataset' | 'Distribution' | 'Catalog', 
            profile
          );
        } else {
          // Count compliant entities for regular single-entity metric
          compliantEntities = this.countCompliantEntities(store, property, entityType as 'Dataset' | 'Distribution' | 'Catalog', profile);
        }
      }
      
      found = compliantEntities > 0;
      
      // Calculate proportional score
      const proportionalRatio = compliantEntities / totalEntities;
      score = proportionalRatio * weight;
      compliancePercentage = proportionalRatio * 100;

      // Get sample values for display (optional, for backwards compatibility)
      if (found) {
        const fullProperty = this.expandProperty(property);
        const propertyCheck = this.hasProperty(store, fullProperty, profile);
        values = propertyCheck.values.slice(0, 3); // Limit to 3 examples
      }

      console.debug(`📊 Metric ${id}: ${compliantEntities}/${totalEntities} ${entityType} entities comply (${compliancePercentage.toFixed(1)}%)`);

    } catch (error) {
      console.warn(`Warning evaluating metric ${id}:`, error);
      score = 0;
      compliantEntities = 0;
      compliancePercentage = 0;
    }

    // Prepare descriptive value showing compliance ratio
    let valueDescription: string;
    
    if (entityType === 'Multi') {
      const datasetPercent = datasetStats!.total > 0 ? ((datasetStats!.compliant / datasetStats!.total) * 100).toFixed(1) : '0';
      const distributionPercent = distributionStats!.total > 0 ? ((distributionStats!.compliant / distributionStats!.total) * 100).toFixed(1) : '0';
      
      valueDescription = totalEntities > 0 
        ? `${compliantEntities}/${totalEntities} entities comply (${compliancePercentage.toFixed(1)}%) - Datasets: ${datasetStats!.compliant}/${datasetStats!.total} (${datasetPercent}%), Distributions: ${distributionStats!.compliant}/${distributionStats!.total} (${distributionPercent}%)`
        : `No Dataset or Distribution entities found`;
    } else {
      valueDescription = totalEntities > 0 
        ? `${compliantEntities}/${totalEntities} ${entityType}s comply (${compliancePercentage.toFixed(1)}%)`
        : `No ${entityType} entities found`;
    }

    const result: any = {
      id,
      name: label.en || id,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      maxScore: weight,
      weight,
      description: label.es || label.en || id,
      category: category as any,
      property,
      found,
      value: valueDescription,
      // Proportional evaluation fields
      entityType,
      totalEntities,
      compliantEntities,
      compliancePercentage: Math.round(compliancePercentage * 100) / 100
    };
    
    // Add multi-entity specific fields if applicable
    if (entityType === 'Multi') {
      result.datasetEntities = datasetStats;
      result.distributionEntities = distributionStats;
    }
    
    return result;
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
          
          // More restrictive matching: exact label match or exact extraction from URI
          fileTypeMatch = normalizedLabel === normalizedValue ||
                        // Extract file type from URI path (e.g., /file-type/CSV -> CSV)
                        normalizedUri.endsWith(`/file-type/${normalizedValue}`) ||
                        normalizedUri.endsWith(`/${normalizedValue}`) ||
                        // Allow exact URI matches
                        normalizedUri === normalizedValue;
          
          // Debug the comparison
          if (fileTypeMatch) {
            console.debug(`🎯 Exact file type match: '${value}' matches '${item.label}' (URI: ${item.uri})`);
          }
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
      'rdf:': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#',
      'dct:': 'http://purl.org/dc/terms/',
      'dcat:': 'http://www.w3.org/ns/dcat#',
      'dcatap:': 'http://data.europa.eu/r5r/',
      'dcatapes:': 'https://datosgobes.github.io/DCAT-AP-ES/',
      'foaf:': 'http://xmlns.com/foaf/0.1/',
      'vcard:': 'http://www.w3.org/2006/vcard/ns#',
      'adms:': 'http://www.w3.org/ns/adms#',
      'xsd:': 'http://www.w3.org/2001/XMLSchema#',
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
   * Get metric label from translations
   */
  private getMetricLabel(metricId: string): { en: string; es: string } {
    try {
      // Use the imported i18n instance directly
      const enLabel = i18n.t(`metricLabels.${metricId}`, { lng: 'en' });
      const esLabel = i18n.t(`metricLabels.${metricId}`, { lng: 'es' });
      
      // Check if translation was found (i18n returns the key if not found)
      if (enLabel && !enLabel.startsWith('metricLabels.')) {
        return { en: enLabel, es: esLabel };
      }
    } catch (error) {
      console.debug('Failed to get translation for metric:', metricId, error);
    }
    
    // Fallback to metric ID if no translation found
    console.warn(`Missing translation for metric: ${metricId}`);
    return { en: metricId, es: metricId };
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
