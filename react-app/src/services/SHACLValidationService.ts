import { Validator } from 'shacl-engine';
import { validations as sparqlValidations } from 'shacl-engine/sparql.js';
import rdfDataModel from '@rdfjs/data-model';
import rdfDataset from '@rdfjs/dataset';
import { Parser as N3Parser } from 'n3';
import { 
  ValidationProfile, 
  SHACLValidationResult, 
  SHACLReport, 
  SHACLViolation, 
  SHACLSeverity,
  MQAConfig
} from '../types';
import mqaConfigData from '../config/mqa-config.json';

export class SHACLValidationService {
  private static shaclShapesCache: Map<ValidationProfile, any> = new Map();

  /**
   * Parse SHACL content asynchronously and filter problematic regex patterns
   */
  private static async parseSHACLContent(content: string, fileName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Pre-process content to fix problematic regex patterns
      const cleanedContent = this.cleanSHACLRegexPatterns(content);
      
      const parser = new N3Parser({ factory: rdfDataModel });
      const parsedQuads: any[] = [];
      
      parser.parse(cleanedContent, (error, quad, prefixes) => {
        if (error) {
          console.error(`❌ Parse error in ${fileName}:`, error);
          reject(error);
          return;
        }
        if (quad) {
          parsedQuads.push(quad);
        } else {
          // quad is null means parsing is complete
          console.debug(`✅ Parsing completed for ${fileName}: ${parsedQuads.length} quads`);
          resolve(parsedQuads);
        }
      });
    });
  }

  /**
   * Clean problematic regex patterns in SHACL content
   */
  private static cleanSHACLRegexPatterns(content: string): string {
    let cleaned = content;
    let replacements = 0;
    
    // The specific problematic pattern found: sh:pattern "^(?s)(?=.*\\S).*$" ;
    // This pattern checks for non-empty strings (containing at least one non-whitespace character)
    const problematicPattern = /sh:pattern\s+"[^"]*\(\?\:?s\)[^"]*"\s*;/g;
    const matches = content.match(problematicPattern);
    
    if (matches) {
      console.debug(`🔍 Found ${matches.length} problematic regex patterns:`, matches);
      
      // Replace with a JavaScript-compatible pattern that does the same thing
      // Original: "^(?s)(?=.*\\S).*$" (matches any string with at least one non-whitespace char)
      // Replacement: "^[\\s\\S]*\\S[\\s\\S]*$" (JavaScript equivalent)
      cleaned = cleaned.replace(
        /sh:pattern\s+"[^"]*\(\?\:?s\)\(\?\=\.\*\\+S\)[^"]*"\s*;/g,
        'sh:pattern "^[\\\\s\\\\S]*\\\\S[\\\\s\\\\S]*$" ;'
      );
      
      // More specific replacement for the exact pattern we found
      cleaned = cleaned.replace(
        'sh:pattern "^(?s)(?=.*\\\\S).*$"',
        'sh:pattern "^[\\\\s\\\\S]*\\\\S[\\\\s\\\\S]*$"'
      );
      
      replacements = matches.length;
    }
    
    console.debug(`🧹 SHACL regex cleanup: Fixed ${replacements} problematic patterns`);
    
    return cleaned;
  }

  /**
   * Get SHACL shapes for a given profile with improved import handling
   */
  private static async getSHACLShapes(profile: ValidationProfile): Promise<any> {
    if (this.shaclShapesCache.has(profile)) {
      return this.shaclShapesCache.get(profile);
    }

    try {
      const shaclFiles = this.getSHACLFilesForProfile(profile);
      const dataset = rdfDataset.dataset();

      console.debug(`📚 Loading SHACL shapes for profile: ${profile}`);
      console.debug(`📂 Files to load: ${shaclFiles.length}`, shaclFiles);
      
      let totalQuadsLoaded = 0;
      const loadedFiles: string[] = [];
      const failedFiles: string[] = [];

      // Load files in order to ensure proper imports
      // For DCAT-AP-ES, we need to load imports and common shapes first
      const prioritizedFiles = this.prioritizeSHACLFiles(shaclFiles, profile);

      // Load all SHACL files for the profile
      for (const shaclFile of prioritizedFiles) {
        try {
          console.debug(`📥 Attempting to fetch: ${shaclFile}`);
          
          // Determine if this is a local file or remote URL
          const isLocalFile = !shaclFile.startsWith('http://') && !shaclFile.startsWith('https://');
          const fileUrl = isLocalFile ? `/${shaclFile}` : shaclFile;
          
          console.debug(`📁 Loading ${isLocalFile ? 'local' : 'remote'} file: ${fileUrl}`);
          
          const response = await fetch(fileUrl);
          if (!response.ok) {
            console.warn(`❌ Failed to fetch SHACL file: ${fileUrl} (${response.status} ${response.statusText})`);
            failedFiles.push(shaclFile);
            continue; // Skip this file but continue with others
          }
          const shaclContent = await response.text();
          console.debug(`📄 Loaded ${shaclContent.length} characters from ${fileUrl}`);
          
          // Show first few lines for debugging
          const lines = shaclContent.split('\n').slice(0, 5);
          console.debug(`📋 First lines of ${shaclFile}:`, lines);
          
          // Parse the SHACL file content using async method
          const fileQuads = await this.parseSHACLContent(shaclContent, shaclFile);
          console.debug(`✅ Parsed ${fileQuads.length} quads from ${shaclFile}`);
          totalQuadsLoaded += fileQuads.length;
          loadedFiles.push(shaclFile);
          
          // Add all quads to the dataset
          for (const quad of fileQuads) {
            dataset.add(quad);
          }
        } catch (error) {
          console.error(`❌ Error loading SHACL file ${shaclFile}:`, error);
          failedFiles.push(shaclFile);
        }
      }

      console.debug(`📊 SHACL loading summary for ${profile}:`);
      console.debug(`   ✅ Successfully loaded: ${loadedFiles.length} files`);
      console.debug(`   ❌ Failed to load: ${failedFiles.length} files`);
      console.debug(`   📊 Total quads loaded: ${totalQuadsLoaded}`);
      
      if (failedFiles.length > 0) {
        console.warn(`⚠️ Some SHACL files failed to load:`, failedFiles);
      }

      // Validate that we have meaningful SHACL shapes
      if (totalQuadsLoaded === 0) {
        console.error(`❌ No SHACL quads loaded for profile ${profile}! Check file URLs and network connectivity.`);
      } else {
        // Count actual shape definitions
        const shapeCount = this.countShapeDefinitions(dataset);
        console.debug(`🔍 Found ${shapeCount} SHACL shape definitions`);
        
        if (shapeCount === 0) {
          console.warn(`⚠️ No SHACL shape definitions found in loaded files for ${profile}. This may indicate import issues.`);
        }
      }

      this.shaclShapesCache.set(profile, dataset);
      return dataset;
    } catch (error) {
      console.error(`Error loading SHACL shapes for profile ${profile}:`, error);
      throw error;
    }
  }

  /**
   * Prioritize SHACL files for loading to ensure imports are loaded first
   */
  private static prioritizeSHACLFiles(files: string[], profile: ValidationProfile): string[] {
    if (profile === 'dcat_ap_es') {
      // For DCAT-AP-ES, load in specific order:
      // 1. Imports first
      // 2. Common shapes second
      // 3. Specific entity shapes last
      const priorityOrder = [
        'shacl_imports.ttl',
        'shacl_mdr_imports.ttl', 
        'shacl_common_shapes.ttl',
        'shacl_mdr-vocabularies.shape.ttl',
        'shacl_catalog_shape.ttl',
        'shacl_dataservice_shape.ttl',
        'shacl_dataset_shape.ttl',
        'shacl_distribution_shape.ttl'
      ];

      const sorted = [...files].sort((a, b) => {
        const aIndex = priorityOrder.findIndex(p => a.includes(p));
        const bIndex = priorityOrder.findIndex(p => b.includes(p));
        
        // If both are in priority list, sort by priority
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only one is in priority list, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // If neither is in priority list, keep original order
        return 0;
      });

      console.debug(`📋 SHACL files loading order for ${profile}:`, sorted);
      return sorted;
    }

    // For other profiles, return files as-is
    return files;
  }

  /**
   * Count actual SHACL shape definitions in the dataset
   */
  private static countShapeDefinitions(dataset: any): number {
    let shapeCount = 0;
    
    try {
      for (const quad of dataset) {
        // Count triples where the object is sh:NodeShape or sh:PropertyShape
        if (quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
            (quad.object.value === 'http://www.w3.org/ns/shacl#NodeShape' ||
             quad.object.value === 'http://www.w3.org/ns/shacl#PropertyShape')) {
          shapeCount++;
        }
      }
    } catch (error) {
      console.debug('Error counting shape definitions:', error);
    }
    
    return shapeCount;
  }

  /**
   * Diagnose SHACL loading issues
   */
  private static async diagnoseSHACLLoadingIssues(profile: ValidationProfile): Promise<{
    totalFiles: number;
    failedFiles: number;
    accessibleFiles: number;
    issues: string[];
  }> {
    const shaclFiles = this.getSHACLFilesForProfile(profile);
    let failedFiles = 0;
    let accessibleFiles = 0;
    const issues: string[] = [];

    for (const file of shaclFiles) {
      try {
        // Determine if this is a local file or remote URL
        const isLocalFile = !file.startsWith('http://') && !file.startsWith('https://');
        const fileUrl = isLocalFile ? `/${file}` : file;
        
        const response = await fetch(fileUrl, { method: 'HEAD' });
        if (response.ok) {
          accessibleFiles++;
        } else {
          failedFiles++;
          issues.push(`${file}: HTTP ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        failedFiles++;
        issues.push(`${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      totalFiles: shaclFiles.length,
      failedFiles,
      accessibleFiles,
      issues
    };
  }

  /**
   * Get SHACL files for a given profile
   */
  private static getSHACLFilesForProfile(profile: ValidationProfile): string[] {
    const mqaConfig = mqaConfigData as MQAConfig;
    const profileConfig = mqaConfig.profiles[profile];
    
    if (!profileConfig) {
      console.warn(`❌ No configuration found for profile: ${profile}`);
      return [];
    }

    const defaultVersion = profileConfig.defaultVersion;
    const versionConfig = profileConfig.versions[defaultVersion];
    
    if (!versionConfig) {
      console.warn(`❌ No version configuration found for profile: ${profile}, version: ${defaultVersion}`);
      return [];
    }

    // Get SHACL files from configuration
    const shaclFiles = versionConfig.shaclFiles || [];
    console.log(`📋 Found ${shaclFiles.length} SHACL files in config for profile ${profile} (v${defaultVersion}):`, shaclFiles);
    
    if (shaclFiles.length === 0) {
      console.warn(`⚠️ No SHACL files configured for profile: ${profile}, version: ${defaultVersion}`);
    }

    return shaclFiles;
  }

  /**
   * Parse RDF content into a dataset
   */
  private static async parseRDFContent(content: string, format: string = 'turtle'): Promise<any> {
    try {
      console.debug(`📝 Parsing RDF content (${format}): ${content.length} characters`);
      
      const dataset = rdfDataset.dataset();
      const parsedQuads = await this.parseSHACLContent(content, `RDF-${format}`);
      
      console.debug(`📊 Parsed ${parsedQuads.length} RDF quads from content`);
      
      // Log sample quads for debugging
      if (parsedQuads.length > 0) {
        console.debug(`📋 Sample RDF quads:`);
        parsedQuads.slice(0, 5).forEach((quad, index) => {
          console.debug(`   ${index + 1}. ${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`);
        });
        if (parsedQuads.length > 5) {
          console.debug(`   ... and ${parsedQuads.length - 5} more quads`);
        }
      }

      for (const quad of parsedQuads) {
        dataset.add(quad);
      }

      return dataset;
    } catch (error) {
      console.error('❌ Error parsing RDF content:', error);
      throw error;
    }
  }

  /**
   * Extract value from shacl-engine RDF Term or complex object
   * Improved version based on RDF/JS specification and shacl-engine documentation
   */
  private static extractTermValue(term: any): string {
    if (!term) return '';
    
    // If it's already a string
    if (typeof term === 'string') return term;
    
    // If it's an array, process each element and take the first non-empty result
    if (Array.isArray(term)) {
      for (const item of term) {
        const value = this.extractTermValue(item);
        if (value) return value;
      }
      return '';
    }
    
    // RDF/JS Term interface - standard way to handle RDF terms
    // This covers NamedNode, Literal, BlankNode, Variable, DefaultGraph
    if (term.termType && term.value !== undefined) {
      switch (term.termType) {
        case 'NamedNode':
        case 'Literal':
          return term.value;
        case 'BlankNode':
          // For blank nodes, return a readable identifier
          return term.value.startsWith('_:') ? term.value : `_:${term.value}`;
        case 'Variable':
          return `?${term.value}`;
        case 'DefaultGraph':
          return 'default-graph';
        default:
          return term.value;
      }
    }
    
    // Legacy RDF term properties (for older libraries)
    const possibleProperties = ['value', 'uri', 'id', 'iri'];
    for (const prop of possibleProperties) {
      if (term[prop] !== undefined) {
        const value = term[prop];
        if (typeof value === 'string') {
          return value;
        } else if (typeof value === 'number') {
          return String(value);
        }
      }
    }
    
    // Handle Quad-like objects (subject, predicate, object, graph)
    if (term.subject && term.predicate && term.object) {
      // This is likely a Quad, extract the object value
      return this.extractTermValue(term.object);
    }
    
    // Handle objects with nested term structures
    if (term._term) {
      return this.extractTermValue(term._term);
    }
    
    // Handle pointer-like structures from shacl-engine
    if (term.ptr && term.ptr.ptrs && Array.isArray(term.ptr.ptrs)) {
      for (const ptr of term.ptr.ptrs) {
        if (ptr._term) {
          const value = this.extractTermValue(ptr._term);
          if (value) return value;
        }
      }
    }
    
    // Handle objects with toString method that returns meaningful content
    if (typeof term === 'object' && typeof term.toString === 'function') {
      const stringValue = term.toString();
      if (stringValue && 
          stringValue !== '[object Object]' && 
          stringValue !== '[object undefined]' &&
          !stringValue.startsWith('[object ')) {
        return stringValue;
      }
    }
    
    // Handle functions (some RDF libraries use functions for lazy evaluation)
    if (typeof term === 'function') {
      try {
        const result = term();
        if (result && typeof result === 'string') {
          return result;
        }
        // Recursively try to extract from function result
        return this.extractTermValue(result);
      } catch (e) {
        console.debug('Failed to call term function:', e);
      }
    }
    
    // Handle primitive values
    if (typeof term === 'number' || typeof term === 'boolean') {
      return String(term);
    }
        
    // Fallback to empty string
    return '';
  }

  /**
   * Extract path from shacl-engine path array based on the actual shacl-engine structure
   */
  private static extractPath(path: any): string {
    if (!path) return '';
    
    // If it's already a string
    if (typeof path === 'string') return path;
    
    // If it's not an array, try to extract value directly
    if (!Array.isArray(path)) {
      return this.extractTermValue(path);
    }
    
    // Process array of Step objects
    const pathParts: string[] = [];
    
    for (const step of path) {
      if (!step) continue;
      
      // Each step should have predicates array
      if (step.predicates && Array.isArray(step.predicates)) {
        const predicateValues = step.predicates.map((pred: any) => this.extractTermValue(pred)).filter(Boolean);
        
        if (predicateValues.length === 1) {
          pathParts.push(predicateValues[0]);
        } else if (predicateValues.length > 1) {
          // Multiple predicates means alternative path
          pathParts.push(`(${predicateValues.join(' | ')})`);
        }
      } else {
        // Fallback: try to extract value from step directly
        const stepValue = this.extractTermValue(step);
        if (stepValue) pathParts.push(stepValue);
      }
    }
    
    return pathParts.length > 0 ? pathParts.join('/') : '';
  }

  /**
   * Parse SHACL validation result from shacl-engine
   */
  private static parseSHACLResult(validationReport: any, shaclShapes?: any, profile?: ValidationProfile): SHACLValidationResult {
    const results: SHACLViolation[] = [];

    console.debug('📋 Parsing SHACL validation report:', {
      hasResults: !!validationReport.results,
      resultsCount: validationReport.results?.length || 0,
      conforms: validationReport.conforms
    });

    // shacl-engine returns results in validationReport.results
    if (validationReport.results) {
      for (const result of validationReport.results) {

        const entityContext = this.extractEntityContext(result);
        const foafPage = this.extractFoafPage(result, shaclShapes) || 
                        (profile ? this.generateDocumentationUrl(result, profile) : undefined);

        const violation: SHACLViolation = {
          focusNode: this.extractTermValue(result.focusNode),
          path: this.extractPath(result.path),
          value: this.extractTermValue(result.value),
          message: this.extractMessages(result),
          severity: this.mapSeverityFromSHACLEngine(result.severity),
          sourceConstraintComponent: this.extractSourceConstraintComponent(result),
          sourceShape: this.extractSourceShape(result),
          resultSeverity: this.extractTermValue(result.resultSeverity),
          foafPage,
          entityContext
        };

        results.push(violation);
      }
    }

    return {
      conforms: validationReport.conforms || false,
      results,
      text: validationReport.text,
      graph: undefined // Remove problematic dataset access
    };
  }

  /**
   * Analyze SHACL shapes to provide better context for complex constraints
   * This helps users understand what the validation expects
   */
  private static analyzeComplexShapeContext(sourceShape: string, constraintComponent: string): {
    shapeType: string;
    expectedFormat: string;
    helpText: { [key: string]: string };
  } {
    const result = {
      shapeType: 'unknown',
      expectedFormat: '',
      helpText: {} as { [key: string]: string }
    };
    
    // Date/DateTime Convention Analysis
    if (sourceShape.includes('DateOrDateTimeDataTypetConvention')) {
      result.shapeType = 'dateTime';
      result.expectedFormat = 'ISO-8601';
      result.helpText = {
        'es': 'Se acepta: YYYY-MM-DD (fecha), YYYY-MM-DDThh:mm:ss (fecha y hora), YYYY-MM (año-mes), YYYY (año)',
        'en': 'Accepted: YYYY-MM-DD (date), YYYY-MM-DDThh:mm:ss (datetime), YYYY-MM (year-month), YYYY (year)'
      };
    }
    
    // Multilingual Literal Convention Analysis
    else if (sourceShape.includes('LiteralMultilingualConvention')) {
      result.shapeType = 'multilingualLiteral';
      result.expectedFormat = 'rdf:langString';
      result.helpText = {
        'es': 'Requerido: texto con etiqueta de idioma (ej: "texto"@es)',
        'en': 'Required: text with language tag (e.g., "text"@en)'
      };
    }
    
    // Non-Empty Literal Convention Analysis
    else if (sourceShape.includes('NonEmptyLiteralConvention')) {
      result.shapeType = 'nonEmptyLiteral';
      result.expectedFormat = 'non-empty string';
      result.helpText = {
        'es': 'Requerido: texto no vacío (sin solo espacios en blanco)',
        'en': 'Required: non-empty text (not just whitespace)'
      };
    }
    
    // Location Shape Analysis
    else if (sourceShape.includes('Location_Shape')) {
      result.shapeType = 'location';
      result.expectedFormat = 'geographical data';
      result.helpText = {
        'es': 'Requerido: al menos una de dcat:bbox, dcat:centroid, o locn:geometry',
        'en': 'Required: at least one of dcat:bbox, dcat:centroid, or locn:geometry'
      };
    }
    
    // License Document Shape Analysis
    else if (sourceShape.includes('LicenseDocument_Shape')) {
      result.shapeType = 'license';
      result.expectedFormat = 'license IRI or document';
      result.helpText = {
        'es': 'Requerido: IRI de licencia válida o documento de licencia',
        'en': 'Required: valid license IRI or license document'
      };
    }
    
    // Agent Shape Analysis
    else if (sourceShape.includes('Agent_Shape')) {
      result.shapeType = 'agent';
      result.expectedFormat = 'agent properties';
      result.helpText = {
        'es': 'Requerido: foaf:name, y opcionalmente dct:identifier y dct:type',
        'en': 'Required: foaf:name, and optionally dct:identifier and dct:type'
      };
    }
    
    return result;
  }

  /**
   * Enhanced message extraction for complex shapes (sh:or, sh:and, sh:not)
   * Provides more detailed and contextual error messages for complex SHACL constraints
   */
  private static enhanceComplexShapeMessages(result: any, originalMessages: string[]): string[] {
    try {
      const sourceConstraint = this.extractSourceConstraintComponent(result);
      const sourceShape = this.extractTermValue(result.sourceShape || result.shape);
      const value = this.extractTermValue(result.value);
      const path = this.extractPath(result.path);
      
      // Handle sh:or constraints (multiple alternatives)
      if (sourceConstraint.includes('OrConstraintComponent') || sourceConstraint.includes('sh:or')) {
        return this.enhanceOrConstraintMessages(originalMessages, sourceShape, value, path);
      }
      
      // Handle sh:and constraints (multiple requirements)
      if (sourceConstraint.includes('AndConstraintComponent') || sourceConstraint.includes('sh:and')) {
        return this.enhanceAndConstraintMessages(originalMessages, sourceShape, value, path);
      }
      
      // Handle sh:not constraints (negation)
      if (sourceConstraint.includes('NotConstraintComponent') || sourceConstraint.includes('sh:not')) {
        return this.enhanceNotConstraintMessages(originalMessages, sourceShape, value, path);
      }
      
      // Handle datatype constraints with better context
      if (sourceConstraint.includes('DatatypeConstraintComponent')) {
        return this.enhanceDatatypeConstraintMessages(originalMessages, sourceShape, value, path);
      }
      
      // Handle pattern constraints with better explanations
      if (sourceConstraint.includes('PatternConstraintComponent')) {
        return this.enhancePatternConstraintMessages(originalMessages, sourceShape, value, path);
      }
      
      return originalMessages;
    } catch (error) {
      console.debug('Error enhancing complex shape messages:', error);
      return originalMessages;
    }
  }

  /**
   * Enhance error messages for sh:or constraints
   */
  private static enhanceOrConstraintMessages(originalMessages: string[], sourceShape: string, value: string, path: string): string[] {
    const enhanced: string[] = [];
    const context = this.analyzeComplexShapeContext(sourceShape, 'sh:OrConstraintComponent');
    
    // Add context-specific messages based on shape analysis
    if (context.shapeType === 'dateTime') {
      enhanced.push('"El valor debe ser de tipo fecha (xsd:date, xsd:dateTime, xsd:gYear, o xsd:gYearMonth) con formato ISO-8601"@es');
      enhanced.push('"The value must be a date type (xsd:date, xsd:dateTime, xsd:gYear, or xsd:gYearMonth) with ISO-8601 format"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else if (context.shapeType === 'location') {
      enhanced.push('"La ubicación debe especificar información geográfica válida"@es');
      enhanced.push('"Location must specify valid geographical information"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else if (context.shapeType === 'license') {
      enhanced.push('"La licencia debe ser un documento de licencia válido o un IRI reconocido"@es');
      enhanced.push('"License must be a valid license document or recognized IRI"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else {
      // Generic OR constraint message
      enhanced.push('"El valor no cumple ninguna de las opciones permitidas"@es');
      enhanced.push('"Value does not match any of the allowed alternatives"@en');
    }
    
    if (value) {
      enhanced.push(`"Valor recibido: ${value}"@es`);
      enhanced.push(`"Received value: ${value}"@en`);
    }
    
    // Add original messages for specific technical details
    enhanced.push(...originalMessages);
    
    return enhanced;
  }

  /**
   * Enhance error messages for sh:and constraints
   */
  private static enhanceAndConstraintMessages(originalMessages: string[], sourceShape: string, value: string, path: string): string[] {
    const enhanced: string[] = [];
    
    enhanced.push('"El valor debe cumplir todos los requisitos especificados"@es');
    enhanced.push('"Value must satisfy all specified requirements"@en');
    
    // Add original messages for specific details
    enhanced.push(...originalMessages);
    
    return enhanced;
  }

  /**
   * Enhance error messages for sh:not constraints
   */
  private static enhanceNotConstraintMessages(originalMessages: string[], sourceShape: string, value: string, path: string): string[] {
    const enhanced: string[] = [];
    
    enhanced.push('"El valor no debe cumplir la condición prohibida"@es');
    enhanced.push('"Value must not satisfy the prohibited condition"@en');
    
    // Add original messages for specific details
    enhanced.push(...originalMessages);
    
    return enhanced;
  }

  /**
   * Enhance error messages for datatype constraints
   */
  private static enhanceDatatypeConstraintMessages(originalMessages: string[], sourceShape: string, value: string, path: string): string[] {
    const enhanced: string[] = [];
    const context = this.analyzeComplexShapeContext(sourceShape, 'sh:DatatypeConstraintComponent');
    
    if (context.shapeType === 'multilingualLiteral') {
      enhanced.push('"El texto debe incluir una etiqueta de idioma válida"@es');
      enhanced.push('"Text must include a valid language tag"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else if (value) {
      enhanced.push(`"Tipo de dato incorrecto para valor: ${value}"@es`);
      enhanced.push(`"Incorrect data type for value: ${value}"@en`);
    }
    
    // Add original messages for specific requirements
    enhanced.push(...originalMessages);
    
    return enhanced;
  }

  /**
   * Enhance error messages for pattern constraints
   */
  private static enhancePatternConstraintMessages(originalMessages: string[], sourceShape: string, value: string, path: string): string[] {
    const enhanced: string[] = [];
    const context = this.analyzeComplexShapeContext(sourceShape, 'sh:PatternConstraintComponent');
    
    if (context.shapeType === 'dateTime') {
      enhanced.push('"Formato de fecha incorrecto. Use ISO-8601"@es');
      enhanced.push('"Incorrect date format. Use ISO-8601"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else if (context.shapeType === 'nonEmptyLiteral') {
      enhanced.push('"El texto no puede estar vacío o contener solo espacios en blanco"@es');
      enhanced.push('"Text cannot be empty or contain only whitespace"@en');
      enhanced.push(`"${context.helpText.es}"@es`);
      enhanced.push(`"${context.helpText.en}"@en`);
    } else {
      enhanced.push('"El valor no cumple el patrón requerido"@es');
      enhanced.push('"Value does not match the required pattern"@en');
    }
    
    if (value) {
      enhanced.push(`"Valor recibido: ${value}"@es`);
      enhanced.push(`"Received value: ${value}"@en`);
    }
    
    // Add original messages for technical details
    enhanced.push(...originalMessages);
    
    return enhanced;
  }

  /**
   * Extract messages from SHACL result with enhanced complex shape support
   */
  private static extractMessages(result: any): string[] {
    const messages: string[] = [];
    
    if (result.message) {
      if (Array.isArray(result.message)) {
        // Handle array of messages
        for (const msg of result.message) {
          const extractedValue = this.extractTermValue(msg);
          if (extractedValue) {
            // Check if it's a language-tagged literal
            if (msg && msg.language) {
              messages.push(`"${extractedValue}"@${msg.language}`);
            } else {
              messages.push(`"${extractedValue}"`);
            }
          }
        }
      } else {
        // Handle single message
        const extractedValue = this.extractTermValue(result.message);
        if (extractedValue) {
          // Check if it's a language-tagged literal
          if (result.message && result.message.language) {
            messages.push(`"${extractedValue}"@${result.message.language}`);
          } else {
            messages.push(`"${extractedValue}"`);
          }
        }
      }
    }
    
    // If no messages found, provide a default
    if (messages.length === 0) {
      messages.push('"Validation constraint violated"');
    }
    
    // Enhance messages for complex shapes
    const enhancedMessages = this.enhanceComplexShapeMessages(result, messages);
    
    return enhancedMessages;
  }

  /**
   * Extract entity context from focus node or source shape
   * Attempts to determine what type of entity (dcat:Dataset, dcat:Distribution, etc.) 
   * the constraint applies to by analyzing the source shape or focus node
   */
  private static extractEntityContext(result: any): string {
    try {
      // Enhanced entity extraction using more comprehensive patterns
      const sourceShape = this.extractTermValue(result.sourceShape || result.shape);
      const focusNode = this.extractTermValue(result.focusNode);
      const path = this.extractPath(result.path);
      
      // First, try to extract from source shape patterns
      if (sourceShape) {
        // DCAT-AP-ES specific patterns
        if (sourceShape.includes('Catalog') || sourceShape.includes('catalog')) {
          return 'dcat:Catalog';
        } else if (sourceShape.includes('Dataset') || sourceShape.includes('dataset')) {
          return 'dcat:Dataset';
        } else if (sourceShape.includes('Distribution') || sourceShape.includes('distribution')) {
          return 'dcat:Distribution';
        } else if (sourceShape.includes('DataService') || sourceShape.includes('dataservice') || sourceShape.includes('dataService')) {
          return 'dcat:DataService';
        } else if (sourceShape.includes('Organization') || sourceShape.includes('organization')) {
          return 'foaf:Organization';
        } else if (sourceShape.includes('Agent') || sourceShape.includes('agent')) {
          return 'foaf:Agent';
        } else if (sourceShape.includes('ContactPoint') || sourceShape.includes('contactpoint') || sourceShape.includes('vCard')) {
          return 'vcard:Organization';
        } else if (sourceShape.includes('LicenseDocument') || sourceShape.includes('license')) {
          return 'dct:LicenseDocument';
        } else if (sourceShape.includes('PeriodOfTime') || sourceShape.includes('temporal')) {
          return 'dct:PeriodOfTime';
        } else if (sourceShape.includes('Location') || sourceShape.includes('spatial')) {
          return 'dct:Location';
        }
      }
      
      // Second, try to infer from focus node patterns
      if (focusNode) {
        if (focusNode.includes('/catalog') || focusNode.includes('catalogo')) {
          return 'dcat:Catalog';
        } else if (focusNode.includes('/dataset') || focusNode.includes('/datos/')) {
          return 'dcat:Dataset';
        } else if (focusNode.includes('/distribution') || focusNode.includes('/distribucion/')) {
          return 'dcat:Distribution';
        } else if (focusNode.includes('/service') || focusNode.includes('/servicio/')) {
          return 'dcat:DataService';
        } else if (focusNode.includes('/organization') || focusNode.includes('/organizacion/')) {
          return 'foaf:Organization';
        } else if (focusNode.includes('/contact') || focusNode.includes('/contacto/')) {
          return 'vcard:Organization';
        }
      }
      
      // Third, try to infer from path/property patterns
      if (path) {
        const pathLower = path.toLowerCase();
        if (pathLower.includes('accessurl') || pathLower.includes('downloadurl') || 
            pathLower.includes('format') || pathLower.includes('mediatype') || 
            pathLower.includes('bytesize')) {
          return 'dcat:Distribution';
        } else if (pathLower.includes('keyword') || pathLower.includes('theme') || 
                   pathLower.includes('temporal') || pathLower.includes('spatial') ||
                   pathLower.includes('description') || pathLower.includes('title')) {
          return 'dcat:Dataset';
        } else if (pathLower.includes('homepage') || pathLower.includes('name') || 
                   pathLower.includes('mbox') || pathLower.includes('publisher')) {
          return 'foaf:Organization';
        } else if (pathLower.includes('fn') || pathLower.includes('hasEmail') || 
                   pathLower.includes('hasURL') || pathLower.includes('hasTelephone')) {
          return 'vcard:Organization';
        } else if (pathLower.includes('endpointurl') || pathLower.includes('servesdataset')) {
          return 'dcat:DataService';
        }
      }
      
      // Fourth, try to infer from constraint component patterns
      const constraintComponent = this.extractSourceConstraintComponent(result);
      if (constraintComponent) {
        const componentLower = constraintComponent.toLowerCase();
        if (componentLower.includes('format') || componentLower.includes('media')) {
          return 'dcat:Distribution';
        } else if (componentLower.includes('theme') || componentLower.includes('keyword')) {
          return 'dcat:Dataset';
        }
      }
      
      // If sourceShape has a meaningful name, try to extract the entity type
      if (sourceShape) {
        // Look for common RDF type patterns
        const lastSeparator = Math.max(sourceShape.lastIndexOf('#'), sourceShape.lastIndexOf('/'));
        if (lastSeparator > -1) {
          const className = sourceShape.substring(lastSeparator + 1);
          // Remove common shape suffixes
          const cleanClassName = className.replace(/Shape$|Restriction$|Constraint$/i, '');
          if (cleanClassName && cleanClassName !== className) {
            return cleanClassName;
          }
        }
      }
      
      return 'Unknown Entity';
    } catch (error) {
      console.debug('Error extracting entity context:', error);
      return 'Unknown Entity';
    }
  }

  /**
   * Generate documentation URL for SHACL result based on entity and property
   * This creates links to profile documentation for better error understanding
   */
  private static generateDocumentationUrl(result: any, profile: ValidationProfile): string | undefined {
    try {
      const path = this.extractPath(result.path);
      const entityContext = this.extractEntityContext(result);
      
      if (!path || !entityContext || entityContext === 'Unknown Entity') {
        return undefined;
      }
      
      // Generate URLs based on profile
      if (profile === 'dcat_ap_es') {
        return this.generateDCATAPESDocumentationUrl(entityContext, path);
      } else if (profile === 'dcat_ap') {
        return this.generateDCATAPDocumentationUrl(entityContext, path);
      } else if (profile === 'nti_risp') {
        return this.generateNTIRISPDocumentationUrl(entityContext, path);
      }
      
      return undefined;
    } catch (error) {
      console.debug('Error generating documentation URL:', error);
      return undefined;
    }
  }

  /**
   * Generate DCAT-AP-ES documentation URL
   * Format: https://datosgobes.github.io/DCAT-AP-ES/#nota-{prefijo_entidad}-{prefijo_propiedad}
   */
  private static generateDCATAPESDocumentationUrl(entityContext: string, path: string): string | undefined {
    try {
      // Map entity types to prefixes
      const entityPrefixMap: { [key: string]: string } = {
        'dcat:Catalog': 'dcat_catalog',
        'dcat:Dataset': 'dcat_dataset',
        'dcat:Distribution': 'dcat_distribution',
        'dcat:DataService': 'dcat_dataservice',
        'foaf:Organization': 'foaf_organization',
        'foaf:Agent': 'foaf_agent',
        'vcard:Organization': 'vcard_organization',
        'dct:LicenseDocument': 'dct_licensedocument',
        'dct:PeriodOfTime': 'dct_periodofTime',
        'dct:Location': 'dct_location'
      };

      // Extract property from path (handle complex paths)
      let property = path;
      if (path.includes('/')) {
        // For complex paths, take the first property
        property = path.split('/')[0];
      }

      // Convert property URI to prefix format
      const propertyPrefix = this.convertURIToPrefix(property);
      const entityPrefix = entityPrefixMap[entityContext];

      if (entityPrefix && propertyPrefix) {
        // Format: nota-{entity_prefix}-{property_prefix}
        const anchor = `nota-${entityPrefix}-${propertyPrefix}`;
        return `https://datosgobes.github.io/DCAT-AP-ES/#${anchor}`;
      }

      return undefined;
    } catch (error) {
      console.debug('Error generating DCAT-AP-ES documentation URL:', error);
      return undefined;
    }
  }

  /**
   * Generate DCAT-AP documentation URL
   */
  private static generateDCATAPDocumentationUrl(entityContext: string, path: string): string | undefined {
    try {
      // For DCAT-AP, we can link to the SEMIC documentation
      const entityFragment = entityContext.replace(':', '').toLowerCase();
      return `https://semiceu.github.io/DCAT-AP/releases/2.1.1/#${entityFragment}`;
    } catch (error) {
      console.debug('Error generating DCAT-AP documentation URL:', error);
      return undefined;
    }
  }

  /**
   * Generate NTI-RISP documentation URL
   */
  private static generateNTIRISPDocumentationUrl(entityContext: string, path: string): string | undefined {
    try {
      // NTI-RISP links to BOE documentation
      return 'https://www.boe.es/eli/es/res/2013/02/19/(4)';
    } catch (error) {
      console.debug('Error generating NTI-RISP documentation URL:', error);
      return undefined;
    }
  }

  /**
   * Convert URI to prefix format for documentation URLs
   */
  private static convertURIToPrefix(uri: string): string | undefined {
    // Common namespace mappings for DCAT-AP-ES
    const namespaceMap: { [key: string]: string } = {
      'http://www.w3.org/ns/dcat#': 'dcat',
      'http://purl.org/dc/terms/': 'dct',
      'http://xmlns.com/foaf/0.1/': 'foaf',
      'http://www.w3.org/2006/vcard/ns#': 'vcard',
      'http://www.w3.org/ns/adms#': 'adms',
      'http://www.w3.org/2004/02/skos/core#': 'skos',
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
      'http://www.w3.org/2000/01/rdf-schema#': 'rdfs'
    };

    try {
      // Handle already prefixed URIs
      if (uri.includes(':') && !uri.startsWith('http')) {
        return uri.replace(':', '_');
      }

      // Handle full URIs
      for (const [namespace, prefix] of Object.entries(namespaceMap)) {
        if (uri.startsWith(namespace)) {
          const localName = uri.substring(namespace.length);
          return `${prefix}_${localName}`;
        }
      }

      // Extract from URI structure
      const lastSeparator = Math.max(uri.lastIndexOf('#'), uri.lastIndexOf('/'));
      if (lastSeparator > -1) {
        const localName = uri.substring(lastSeparator + 1);
        // Try to determine prefix from URI structure
        if (uri.includes('dcat')) return `dcat_${localName}`;
        if (uri.includes('dcterms') || uri.includes('dc/terms')) return `dct_${localName}`;
        if (uri.includes('foaf')) return `foaf_${localName}`;
        if (uri.includes('vcard')) return `vcard_${localName}`;
        return localName;
      }

      return uri;
    } catch (error) {
      console.debug('Error converting URI to prefix:', error);
      return undefined;
    }
  }

  /**
   * Extract source constraint component from SHACL result with enhanced complex shape detection
   */
  private static extractSourceConstraintComponent(result: any): string {
    // Based on shacl-engine result structure, check for constraintComponent.value
    if (result.constraintComponent && result.constraintComponent.value) {
      const componentURI = result.constraintComponent.value;
      // Convert full URI to short form: http://www.w3.org/ns/shacl#MinCountConstraintComponent -> sh:MinCountConstraintComponent
      if (componentURI.includes('#')) {
        const componentName = componentURI.split('#')[1];
        return `sh:${componentName}`;
      }
      return componentURI;
    }
    
    // Fallback to existing logic
    if (result.sourceConstraintComponent) {
      return this.extractTermValue(result.sourceConstraintComponent);
    }
    
    // Enhanced detection for complex shapes based on source shape patterns
    const sourceShape = this.extractTermValue(result.sourceShape || result.shape);
    if (sourceShape) {
      // Detect constraint types from shape name/URI patterns
      if (sourceShape.includes('DateOrDateTimeDataTypetConvention')) {
        return 'sh:OrConstraintComponent';
      } else if (sourceShape.includes('LiteralMultilingualConvention')) {
        return 'sh:DatatypeConstraintComponent';
      } else if (sourceShape.includes('NonEmptyLiteralConvention')) {
        return 'sh:PatternConstraintComponent';
      } else if (sourceShape.includes('Location_Shape')) {
        return 'sh:OrConstraintComponent';
      }
    }
    
    // Check result properties for constraint indicators
    if (result.value && result.resultPath) {
      // This suggests a property constraint
      return 'sh:PropertyConstraintComponent';
    } else if (result.focusNode) {
      // This suggests a node constraint
      return 'sh:NodeConstraintComponent';
    }
    
    // Default fallback
    return 'sh:ConstraintComponent';
  }

  /**
   * Extract source shape from SHACL result
   */
  private static extractSourceShape(result: any): string {
    // Try to get source shape from direct property
    if (result.sourceShape) {
      return this.extractTermValue(result.sourceShape);
    }
    
    // For shacl-engine, the shape structure is complex but we can try to extract some identifier
    if (result.shape && result.shape.ptr && result.shape.ptr.ptrs && result.shape.ptr.ptrs.length > 0) {
      const shapePtr = result.shape.ptr.ptrs[0];
      
      // Try to get a meaningful identifier from the shape
      if (shapePtr._term && shapePtr._term.value) {
        return shapePtr._term.value;
      }
      
      // If we have edges, try to find a shape-related URI
      if (shapePtr.edges && shapePtr.edges.length > 0) {
        for (const edge of shapePtr.edges) {
          if (edge.subject && edge.subject.value) {
            const subjectValue = edge.subject.value;
            // Look for URIs that seem to be shape definitions
            if (subjectValue.includes('Shape') || 
                subjectValue.includes('Restriction') || 
                subjectValue.includes('datosgobes.github.io/DCAT-AP-ES/')) {
              return subjectValue;
            }
          }
        }
      }
    }
    
    // Generate a simple blank node ID rather than a complex urn
    const timestamp = Date.now();
    return `_:shape${timestamp % 10000}`;  // Shorter, cleaner ID
  }

  /**
   * Extract foaf:page URL from SHACL shapes for additional information
   */
  private static extractFoafPage(result: any, shaclShapes?: any): string | undefined {
    if (!shaclShapes || !result.sourceShape) {
      return undefined;
    }

    try {
      const sourceShapeUri = result.sourceShape?.value || result.sourceShape?.toString();
      if (!sourceShapeUri) return undefined;

      // Search for foaf:page in the SHACL shapes dataset
      for (const quad of shaclShapes) {
        if (quad.subject.value === sourceShapeUri && 
            quad.predicate.value === 'http://xmlns.com/foaf/0.1/page') {
          return quad.object.value;
        }
      }
    } catch (error) {
      console.warn('Error extracting foaf:page:', error);
    }

    return undefined;
  }

  /**
   * Map SHACL severity from shacl-engine format
   */
  private static mapSeverityFromSHACLEngine(severity: any): SHACLSeverity {
    if (!severity) return 'Violation';
    
    const severityValue = severity.value || severity.toString() || '';
    
    if (severityValue.includes('Violation') || severityValue.includes('violation') || severityValue.includes('sh:Violation')) {
      return 'Violation';
    } else if (severityValue.includes('Warning') || severityValue.includes('warning') || severityValue.includes('sh:Warning')) {
      return 'Warning';
    } else if (severityValue.includes('Info') || severityValue.includes('info') || severityValue.includes('sh:Info')) {
      return 'Info';
    }
    
    return 'Violation'; // Default to violation for safety
  }

  /**
   * Validate RDF content against SHACL shapes using shacl-engine
   */
  public static async validateRDF(
    rdfContent: string,
    profile: ValidationProfile,
    format: string = 'turtle'
  ): Promise<SHACLReport> {
    try {
      console.log(`🔍 Running SHACL validation with shacl-engine for profile: ${profile}`);
      
      // Load SHACL shapes
      const shapes = await this.getSHACLShapes(profile);
      const shapesCount = Array.from(shapes).length;
      console.log(`📊 Loaded ${shapesCount} SHACL shape quads for validation`);
      
      if (shapesCount === 0) {
        console.warn(`⚠️ No SHACL shapes loaded for profile ${profile}! This will result in 0 violations.`);
        
        // Get diagnostic information about what failed
        const diagnosticInfo = await this.diagnoseSHACLLoadingIssues(profile);
        
        return {
          profile,
          conforms: false,
          totalViolations: 1,
          violations: [{
            focusNode: '',
            message: [
              `No SHACL shapes could be loaded for profile ${profile}`,
              `${diagnosticInfo.totalFiles} files configured, ${diagnosticInfo.failedFiles} failed to load`,
              'Common causes: Network connectivity, CORS issues, or malformed SHACL files',
              'Check browser console for detailed error messages'
            ],
            severity: 'Violation',
            sourceConstraintComponent: 'system:NoShapesError',
            sourceShape: 'system:ValidationShape',
            entityContext: 'System Error'
          }],
          warnings: [],
          infos: [],
          timestamp: new Date().toISOString()
        };
      }
      
      // Parse RDF data
      const data = await this.parseRDFContent(rdfContent, format);
      const dataCount = Array.from(data).length;
      console.debug(`📊 Loaded ${dataCount} RDF data quads for validation`);

      // Create validator with SPARQL support and debug for entity context
      console.debug(`🔧 Creating SHACL validator with SPARQL support and entity context extraction...`);
      const validator = new Validator(shapes, {
        factory: rdfDataModel,
        debug: true, // Enable debug mode for detailed entity information
        details: true,
        validations: sparqlValidations // Add SPARQL validations support
      });

      // Run validation with debug options to extract entity context
      console.debug(`⚙️ Running SHACL validation with entity context extraction...`);
      let report;
      try {
        report = await validator.validate({ dataset: data });
        console.debug(`📋 SHACL validation report:`, {
          conforms: report.conforms,
          hasResults: !!report.results,
          resultsLength: report.results?.length || 0
        });
      } catch (validationError: any) {
        // Handle specific regex error that occurs with some SHACL constraints
        if (validationError.message?.includes('Invalid regular expression') || 
            validationError.message?.includes('Invalid group')) {
          console.warn(`⚠️ SHACL validation failed due to regex compatibility issue:`, validationError.message);
          console.warn(`📝 This often occurs with advanced SHACL string patterns that aren't JavaScript-compatible`);
          
          // Return a mock result indicating validation issues exist (conservative approach)
          return {
            profile,
            conforms: false,
            totalViolations: 1,
            violations: [{
              focusNode: '',
              message: [`SHACL validation failed due to regex compatibility: ${validationError.message}`],
              severity: 'Violation',
              sourceConstraintComponent: 'system:RegexCompatibilityError',
              sourceShape: 'system:ValidationShape'
            }],
            warnings: [],
            infos: [],
            timestamp: new Date().toISOString()
          };
        } else {
          // Re-throw other validation errors
          throw validationError;
        }
      }
      
      // Parse results
      const validationResult = this.parseSHACLResult(report, shapes, profile);

      // Categorize violations by severity
      const violations = validationResult.results.filter(r => r.severity === 'Violation');
      const warnings = validationResult.results.filter(r => r.severity === 'Warning');
      const infos = validationResult.results.filter(r => r.severity === 'Info');

      console.log(`✅ SHACL validation completed: ${violations.length} violations, ${warnings.length} warnings, ${infos.length} info`);

      return {
        profile,
        conforms: validationResult.conforms,
        totalViolations: violations.length,
        violations,
        warnings,
        infos,
        timestamp: new Date().toISOString(),
        reportDataset: validationResult.graph
      };

    } catch (error) {
      console.error('SHACL validation error:', error);
      
      // Return error report
      return {
        profile,
        conforms: false,
        totalViolations: 1,
        violations: [{
          focusNode: '',
          message: [`SHACL validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          severity: 'Violation',
          sourceConstraintComponent: 'system:ValidationError',
          sourceShape: 'system:ValidationShape'
        }],
        warnings: [],
        infos: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate compliance score based on SHACL validation
   * Binary scoring: conforme = 100%, no conforme = 0%
   */
  public static calculateComplianceScore(report: SHACLReport): number {
    console.log(`📊 Calculating compliance score - Conforms: ${report.conforms}, Violations: ${report.totalViolations}`);
    
    // Binary compliance scoring as requested by user:
    // Si el perfil no es conforme con la validacion SHACL, entonces la metrica de compliance es 0
    // La validacion es binaria
    if (report.conforms && report.totalViolations === 0) {
      console.log(`✅ SHACL: CONFORME - Compliance score: 100%`);
      return 100; // Full compliance
    } else {
      console.log(`❌ SHACL: NO CONFORME - Compliance score: 0%`);
      return 0; // No compliance if any violations exist
    }
  }

  /**
   * Export SHACL report as Turtle (enhanced version)
   */
  public static async exportReportAsTurtle(report: SHACLReport): Promise<string> {
    const timestamp = new Date().toISOString();
    
    let turtle = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# SHACL Validation Report for ${report.profile}
# Generated by shacl-engine and mjanez/metadata-quality-stack

<urn:shacl:report:${report.profile}:${Date.now()}> a sh:ValidationReport ;
    sh:conforms ${report.conforms} ;
    dct:created "${timestamp}"^^xsd:dateTime ;
    dct:description "Este archivo contiene el informe de validación SHACL para el perfil ${report.profile}. Se han detectado ${report.totalViolations} violaciones."@es ;
    dct:description "This file contains the SHACL validation report for profile ${report.profile}. A total of ${report.totalViolations} violations were found."@en ;
    dct:title "Informe de Validación SHACL para el perfil ${report.profile}"@es ;
    dct:title "SHACL Validation Report for profile ${report.profile}"@en ;
    dct:format <http://publications.europa.eu/resource/authority/file-type/RDF_TURTLE> ;
    dct:subject <urn:dataset:${report.profile}> ;
    foaf:homepage <https://github.com/mjanez/metadata-quality-stack> ;
    rdfs:seeAlso <https://github.com/mjanez/metadata-quality-stack/blob/feature/main/react-app/README.md> ;
    rdfs:comment "Validation report generated by MQA SHACL validation" .

`;

    // Add violation results
    report.violations.forEach((violation, index) => {
      const resultId = `urn:shacl:result:violation:${index}`;
      turtle += `
${resultId} a sh:ValidationResult ;
    sh:resultSeverity sh:Violation ;
    sh:focusNode <${violation.focusNode || 'unknown'}> ;`;

      // Handle multiple messages with language tags as separate properties
      if (violation.message.length > 0) {
        violation.message.forEach((msg) => {
          turtle += `
    sh:resultMessage ${msg} ;`;
        });
      }

      turtle += `
    sh:sourceConstraintComponent ${violation.sourceConstraintComponent} ;
    sh:sourceShape ${violation.sourceShape} `;
      
      if (violation.path) {
        turtle += `;
    sh:resultPath <${violation.path}> `;
      }
      
      if (violation.value) {
        turtle += `;
    sh:value "${violation.value.replace(/"/g, '\\"')}" `;
      }
      
      turtle += ' .\n';
    });

    // Add warning results
    report.warnings.forEach((warning, index) => {
      const resultId = `urn:shacl:result:warning:${index}`;
      turtle += `
${resultId} a sh:ValidationResult ;
    sh:resultSeverity sh:Warning ;
    sh:focusNode <${warning.focusNode || 'unknown'}> ;`;

      // Handle multiple messages with language tags as separate properties
      if (warning.message.length > 0) {
        warning.message.forEach((msg) => {
          turtle += `
    sh:resultMessage ${msg} ;`;
        });
      }

      turtle += `
    sh:sourceConstraintComponent ${warning.sourceConstraintComponent} ;
    sh:sourceShape ${warning.sourceShape} `;

      if (warning.path) {
        turtle += `;
    sh:resultPath <${warning.path}> `;
      }
      
      turtle += ' .\n';
    });

    // Add info results
    report.infos.forEach((info, index) => {
      const resultId = `urn:shacl:result:info:${index}`;
      turtle += `
${resultId} a sh:ValidationResult ;
    sh:resultSeverity sh:Info ;
    sh:focusNode <${info.focusNode || 'unknown'}> ;`;

      // Handle multiple messages with language tags as separate properties
      if (info.message.length > 0) {
        info.message.forEach((msg) => {
          turtle += `
    sh:resultMessage ${msg} ;`;
        });
      }

      turtle += `
    sh:sourceConstraintComponent <${info.sourceConstraintComponent}> ;
    sh:sourceShape <${info.sourceShape}> `;
      
      if (info.path) {
        turtle += `;
    sh:resultPath <${info.path}> `;
      }
      
      turtle += ' .\n';
    });

    return turtle;
  }

  /**
   * Export SHACL report as CSV for non-RDF users
   */
  public static async exportReportAsCSV(report: SHACLReport): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // CSV headers
    const headers = [
      'Severity',
      'Focus Node',
      'Path',
      'Value',
      'Message',
      'Source Shape',
      'Constraint Component',
      'Additional Info URL'
    ];
    
    // Combine all violations, warnings, and infos
    const allIssues = [
      ...report.violations,
      ...report.warnings,
      ...report.infos
    ];
    
    // Convert to CSV rows
    const csvRows = [];
    
    // Add metadata header
    csvRows.push(headers.join(','));
    
    for (const issue of allIssues) {
      const row = [
        issue.severity,
        this.escapeCsvValue(issue.focusNode || ''),
        this.escapeCsvValue(issue.path || ''),
        this.escapeCsvValue(issue.value || ''),
        this.escapeCsvValue(issue.message.join('; ')),
        this.escapeCsvValue(issue.sourceShape || ''),
        this.escapeCsvValue(issue.sourceConstraintComponent || ''),
        this.escapeCsvValue(issue.foafPage || '')
      ];
      
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Escape CSV values (handle commas, quotes, newlines)
   */
  private static escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Clear cache (useful for testing or when SHACL files are updated)
   */
  public static clearCache(): void {
    this.shaclShapesCache.clear();
    console.debug('SHACL shapes cache cleared');
  }
}

export default SHACLValidationService;