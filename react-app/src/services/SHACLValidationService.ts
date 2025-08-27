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
          console.log(`✅ Parsing completed for ${fileName}: ${parsedQuads.length} quads`);
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
      console.log(`🔍 Found ${matches.length} problematic regex patterns:`, matches);
      
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
    
    console.log(`🧹 SHACL regex cleanup: Fixed ${replacements} problematic patterns`);
    
    return cleaned;
  }

  /**
   * Get SHACL shapes for a given profile
   */
  private static async getSHACLShapes(profile: ValidationProfile): Promise<any> {
    if (this.shaclShapesCache.has(profile)) {
      return this.shaclShapesCache.get(profile);
    }

    try {
      const shaclFiles = this.getSHACLFilesForProfile(profile);
      const dataset = rdfDataset.dataset();

      console.log(`📚 Loading SHACL shapes for profile: ${profile}`);
      console.log(`📂 Files to load: ${shaclFiles.length}`);
      let totalQuadsLoaded = 0;

      // Load all SHACL files for the profile
      for (const shaclFile of shaclFiles) {
        try {
          console.log(`📥 Attempting to fetch: ${shaclFile}`);
          const response = await fetch(shaclFile);
          if (!response.ok) {
            console.warn(`❌ Failed to fetch SHACL file: ${shaclFile} (${response.status} ${response.statusText})`);
            continue; // Skip this file but continue with others
          }
          const shaclContent = await response.text();
          console.log(`📄 Loaded ${shaclContent.length} characters from ${shaclFile}`);
          
          // Show first few lines for debugging
          const lines = shaclContent.split('\n').slice(0, 5);
          console.log(`📋 First lines of ${shaclFile}:`, lines);
          
          // Parse the SHACL file content using async method
          const fileQuads = await this.parseSHACLContent(shaclContent, shaclFile);
          console.log(`✅ Parsed ${fileQuads.length} quads from ${shaclFile}`);
          totalQuadsLoaded += fileQuads.length;
          
          // Add all quads to the dataset
          for (const quad of fileQuads) {
            dataset.add(quad);
          }
        } catch (error) {
          console.error(`❌ Error loading SHACL file ${shaclFile}:`, error);
        }
      }

      console.log(`📊 Total SHACL quads loaded for ${profile}: ${totalQuadsLoaded}`);
      this.shaclShapesCache.set(profile, dataset);
      return dataset;
    } catch (error) {
      console.error(`Error loading SHACL shapes for profile ${profile}:`, error);
      throw error;
    }
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
      console.log(`📝 Parsing RDF content (${format}): ${content.length} characters`);
      
      const dataset = rdfDataset.dataset();
      const parsedQuads = await this.parseSHACLContent(content, `RDF-${format}`);
      
      console.log(`📊 Parsed ${parsedQuads.length} RDF quads from content`);
      
      // Log sample quads for debugging
      if (parsedQuads.length > 0) {
        console.log(`📋 Sample RDF quads:`);
        parsedQuads.slice(0, 5).forEach((quad, index) => {
          console.log(`   ${index + 1}. ${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`);
        });
        if (parsedQuads.length > 5) {
          console.log(`   ... and ${parsedQuads.length - 5} more quads`);
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
   */
  private static extractTermValue(term: any): string {
    if (!term) return '';
    
    // If it's already a string
    if (typeof term === 'string') return term;
    
    // If it's an array, take the first element
    if (Array.isArray(term)) {
      return term.length > 0 ? this.extractTermValue(term[0]) : '';
    }
    
    // If it's a termType object (NamedNode, Literal, BlankNode)
    if (term.termType && term.value) {
      return term.value;
    }
    
    // If it has a .value property
    if (term.value !== undefined) {
      return typeof term.value === 'string' ? term.value : String(term.value);
    }
    
    // Try other common RDF term properties
    if (term.uri !== undefined) {
      return typeof term.uri === 'string' ? term.uri : String(term.uri);
    }
    
    if (term.id !== undefined) {
      return typeof term.id === 'string' ? term.id : String(term.id);
    }
    
    if (term.iri !== undefined) {
      return typeof term.iri === 'string' ? term.iri : String(term.iri);
    }
    
    // If it's an object with a toString method that doesn't return [object Object]
    if (typeof term === 'object' && term.toString) {
      const stringValue = term.toString();
      if (stringValue !== '[object Object]') {
        return stringValue;
      }
    }
    
    // Last resort: check if it's a function (some RDF libraries use functions)
    if (typeof term === 'function') {
      try {
        const result = term();
        if (typeof result === 'string') {
          return result;
        }
      } catch (e) {
        // Ignore function call errors
      }
    }
    
    // Fallback to empty string rather than [object Object]
    console.warn('⚠️ Could not extract term value from:', term);
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
  private static parseSHACLResult(validationReport: any, shaclShapes?: any): SHACLValidationResult {
    const results: SHACLViolation[] = [];

    console.log('📋 Parsing SHACL validation report:', {
      hasResults: !!validationReport.results,
      resultsCount: validationReport.results?.length || 0,
      conforms: validationReport.conforms
    });

    // shacl-engine returns results in validationReport.results
    if (validationReport.results) {
      for (const result of validationReport.results) {
        // Debug logging to understand shacl-engine result structure
        console.log('🔍 SHACL result structure:', {
          resultKeys: Object.keys(result),
          hasSourceConstraintComponent: !!result.sourceConstraintComponent,
          hasSourceShape: !!result.sourceShape,
          hasConstraint: !!result.constraint,
          hasShape: !!result.shape,
          hasValidator: !!result.validator,
          hasValidation: !!result.validation,
          constraintType: result.constraint ? typeof result.constraint : 'undefined',
          shapeType: result.shape ? typeof result.shape : 'undefined',
          validatorType: result.validator ? typeof result.validator : 'undefined',
          validationType: result.validation ? typeof result.validation : 'undefined',
          fullResult: result
        });

        const violation: SHACLViolation = {
          focusNode: this.extractTermValue(result.focusNode),
          path: this.extractPath(result.path),
          value: this.extractTermValue(result.value),
          message: this.extractMessages(result),
          severity: this.mapSeverityFromSHACLEngine(result.severity),
          sourceConstraintComponent: this.extractSourceConstraintComponent(result),
          sourceShape: this.extractSourceShape(result),
          resultSeverity: this.extractTermValue(result.resultSeverity),
          foafPage: this.extractFoafPage(result, shaclShapes)
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
   * Extract messages from SHACL result
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
    
    return messages;
  }

  /**
   * Extract source constraint component from SHACL result
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
        return {
          profile,
          conforms: false, // Changed to false when no shapes loaded
          totalViolations: 1,
          violations: [{
            focusNode: '',
            message: [`No SHACL shapes could be loaded for profile ${profile}`],
            severity: 'Violation',
            sourceConstraintComponent: 'system:NoShapesError',
            sourceShape: 'system:ValidationShape'
          }],
          warnings: [],
          infos: [],
          timestamp: new Date().toISOString()
        };
      }
      
      // Parse RDF data
      const data = await this.parseRDFContent(rdfContent, format);
      const dataCount = Array.from(data).length;
      console.log(`📊 Loaded ${dataCount} RDF data quads for validation`);

      // Create validator with SPARQL support
      console.log(`🔧 Creating SHACL validator with SPARQL support...`);
      const validator = new Validator(shapes, {
        factory: rdfDataModel,
        debug: false,
        details: true,
        validations: sparqlValidations // Add SPARQL validations support
      });

      // Run validation
      console.log(`⚙️ Running SHACL validation...`);
      let report;
      try {
        report = await validator.validate({ dataset: data });
        console.log(`📋 SHACL validation report:`, {
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
      const validationResult = this.parseSHACLResult(report, shapes);

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
    console.log('SHACL shapes cache cleared');
  }
}

export default SHACLValidationService;