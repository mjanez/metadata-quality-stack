import { 
  ValidationProfile, 
  SHACLViolation,
  SHACLReport,
  MQAConfig
} from '../types';
import mqaConfigData from '../config/mqa-config.json';

// ITB API Interfaces - Based on real API documentation
interface ITBValidationRequest {
  contentToValidate: string;
  contentSyntax: 'text/turtle' | 'application/rdf+xml' | 'application/ld+json' | 'application/n-triples';
  embeddingMethod: 'STRING' | 'URL' | 'BASE64';
  reportSyntax?: 'application/json' | 'text/turtle' | 'application/rdf+xml';
  externalRules: ITBRuleSet[];
  validationType?: string;
  locale?: string;
}

interface ITBRuleSet {
  ruleSet: string;
  embeddingMethod: 'STRING' | 'URL' | 'BASE64';
  ruleSyntax: 'text/turtle' | 'application/rdf+xml' | 'application/ld+json';
}
// ITB API Interfaces - Based on actual API response format
interface ITBValidationResponse {
  date: string;
  result: 'SUCCESS' | 'FAILURE';
  overview: {
    profileID: string;
  };
  counters: {
    nrOfAssertions: number;
    nrOfErrors: number;
    nrOfWarnings: number;
  };
  context: any;
  reports: {
    error?: ITBSimpleAssertion[];
    warning?: ITBSimpleAssertion[];
    info?: ITBSimpleAssertion[];
  };
  name: string;
}

interface ITBSimpleAssertion {
  description: string;
  location: string;
}

export class ITBSHACLService {
  private static readonly ITB_BASE_URL = 'https://www.itb.ec.europa.eu/shacl';
  private static readonly DOMAIN = 'any'; // Using 'any' domain for custom shapes

  /**
   * Validate RDF content using ITB SHACL Validator REST API
   */
  static async validateRDF(
    rdfContent: string, 
    profile: ValidationProfile,
    locale: string = 'es'
  ): Promise<SHACLReport> {
    try {
      console.debug(`🔍 Running ITB SHACL validation for profile: ${profile} with locale: ${locale}`);
      
      // Get SHACL files URLs for the profile
      const shaclUrls = this.getSHACLFilesForProfile(profile);
      
      if (shaclUrls.length === 0) {
        throw new Error(`No SHACL files configured for profile: ${profile}`);
      }

      console.debug(`📋 Using ${shaclUrls.length} SHACL files for validation:`, shaclUrls);

      // Prepare external rules (SHACL shapes) according to API documentation
      const externalRules: ITBRuleSet[] = shaclUrls.map(url => ({
        ruleSet: url,
        embeddingMethod: 'URL',
        ruleSyntax: 'text/turtle'
      }));

      // Prepare validation request according to API documentation
      const request: ITBValidationRequest = {
        contentToValidate: rdfContent,
        contentSyntax: 'text/turtle',
        embeddingMethod: 'STRING',
        reportSyntax: 'application/json', // Request JSON format for easier parsing
        externalRules,
        validationType: 'any', // Changed from 'any' to 'complete' for full validation
        locale: locale // Use the provided locale parameter
      };

      console.debug(`🌐 Sending validation request to ITB REST API...`);
      
      // Make API call to ITB using the correct REST endpoint
      const response = await fetch(`${this.ITB_BASE_URL}/${this.DOMAIN}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`ITB API error: ${response.status} ${response.statusText}`);
      }

      // ITB returns JSON response when reportSyntax is 'application/json'
      const validationResponse: ITBValidationResponse = await response.json();
      console.debug(`📊 Received validation response from ITB:`, {
        result: validationResponse.result,
        errorsCount: validationResponse.counters?.nrOfErrors || 0,
        warningsCount: validationResponse.counters?.nrOfWarnings || 0
      });

      // Parse the ITB validation response 
      return this.parseITBValidationResponse(validationResponse, profile);

    } catch (error) {
      console.error('❌ Error in ITB SHACL validation:', error);
      throw error;
    }
  }

  /**
   * Get SHACL files for a given profile from config
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
    console.debug(`📋 Found ${shaclFiles.length} SHACL files in config for profile ${profile} (v${defaultVersion}):`, shaclFiles);
    
    if (shaclFiles.length === 0) {
      console.warn(`⚠️ No SHACL files configured for profile: ${profile}, version: ${defaultVersion}`);
      return [];
    }

    // Return URLs as-is if they're already GitHub raw URLs, otherwise convert local paths
    const processedUrls = shaclFiles.map(filePath => {
      if (filePath.startsWith('https://raw.githubusercontent.com/')) {
        // Already a GitHub raw URL, use as-is
        return filePath;
      } else {
        // Convert local file paths to GitHub raw URLs
        return `https://raw.githubusercontent.com/mjanez/metadata-quality-stack/refs/heads/main/react-app/public/${filePath}`;
      }
    });

    return processedUrls;
  }

  /**
   * Parse ITB validation response (JSON format) to our internal SHACLReport format
   */
  private static parseITBValidationResponse(response: ITBValidationResponse, profile: ValidationProfile): SHACLReport {
    console.debug('📋 Parsing ITB validation response...');
    
    try {
      const violations: SHACLViolation[] = [];
      const warnings: SHACLViolation[] = [];
      const infos: SHACLViolation[] = [];
      
      // Check conformance from result value
      const conforms = response.result === 'SUCCESS';
      
      // Parse the response based on actual ITB structure
      // The response directly contains the reports
      
      // Process errors
      if (response?.reports?.error) {
        console.debug(`🔍 Processing ${response.reports.error.length} error assertions...`);
        
        for (const errorAssertion of response.reports.error) {
          try {
            const violation = this.parseITBSimpleAssertion(errorAssertion);
            violation.severity = 'Violation';
            violations.push(violation);
            
            console.debug(`✅ Parsed Violation: ${violation.focusNode} - ${violation.message[0]?.substring(0, 100)}...`);
          } catch (assertionError) {
            console.error(`❌ Error parsing individual error assertion:`, assertionError);
          }
        }
      }

      // Process warnings
      if (response?.reports?.warning) {
        console.debug(`🔍 Processing ${response.reports.warning.length} warning assertions...`);
        
        for (const warningAssertion of response.reports.warning) {
          try {
            const warning = this.parseITBSimpleAssertion(warningAssertion);
            warning.severity = 'Warning';
            warnings.push(warning);
            
            console.debug(`✅ Parsed Warning: ${warning.focusNode} - ${warning.message[0]?.substring(0, 100)}...`);
          } catch (assertionError) {
            console.error(`❌ Error parsing individual warning assertion:`, assertionError);
          }
        }
      }

      // Process info (if present)
      if (response?.reports?.info) {
        console.debug(`🔍 Processing ${response.reports.info.length} info assertions...`);
        
        for (const infoAssertion of response.reports.info) {
          try {
            const info = this.parseITBSimpleAssertion(infoAssertion);
            info.severity = 'Info';
            infos.push(info);
            
            console.debug(`✅ Parsed Info: ${info.focusNode} - ${info.message[0]?.substring(0, 100)}...`);
          } catch (assertionError) {
            console.error(`❌ Error parsing individual info assertion:`, assertionError);
          }
        }
      }

      console.debug(`✅ ITB SHACL validation completed: ${violations.length} violations, ${warnings.length} warnings, ${infos.length} infos, conforms: ${conforms}`);

      return {
        profile,
        conforms,
        totalViolations: violations.length,
        violations,
        warnings,
        infos,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error parsing ITB validation response:', error);
      throw error;
    }
  }

  /**
   * Parse individual ITB simple assertion to our SHACLViolation format
   */
  private static parseITBSimpleAssertion(assertion: ITBSimpleAssertion): SHACLViolation {
    // Extract focus node and path from location string
    // Location format: "[Focus node] - [URL] - [Result path] - [property]"
    const { focusNode, path } = this.parseITBLocation(assertion.location);
    
    return {
      focusNode: focusNode || '',
      path: path || '',
      value: '',
      message: [assertion.description || 'Validation constraint violated'],
      severity: 'Violation', // Will be updated by calling method
      sourceConstraintComponent: this.inferConstraintComponent(assertion.description),
      sourceShape: 'ITB:ValidationShape',
      resultSeverity: '',
      foafPage: this.generateDocumentationUrl(assertion.description, path),
      entityContext: this.inferEntityContext(focusNode, path)
    };
  }

  /**
   * Parse ITB location string to extract focus node and path
   * Format: "[Focus node] - [URL] - [Result path] - [property]"
   */
  private static parseITBLocation(location: string): { focusNode: string | null; path: string | null } {
    try {
      // Split by " - " to get parts
      const parts = location.split(' - ');
      
      let focusNode: string | null = null;
      let path: string | null = null;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        
        // Look for focus node (usually after "[Focus node]" or "[Nodo de enfoque]")
        if ((part.includes('Focus node') || part.includes('Nodo de enfoque')) && i + 1 < parts.length) {
          const nextPart = parts[i + 1].trim();
          // Remove brackets and extract URL-like content
          if (nextPart.startsWith('[') && nextPart.endsWith(']')) {
            focusNode = nextPart.slice(1, -1);
          } else if (nextPart.includes('http')) {
            focusNode = nextPart;
          }
        }
        
        // Look for path (usually after "[Result path]" or "[Trayectoria de resultados]") 
        if ((part.includes('Result path') || part.includes('Trayectoria') || part.includes('resultados')) && i + 1 < parts.length) {
          const pathPart = parts[i + 1].trim();
          if (pathPart.startsWith('[') && pathPart.endsWith(']')) {
            path = pathPart.slice(1, -1);
          } else {
            path = pathPart;
          }
        }
      }
      
      return { focusNode, path };
    } catch (error) {
      console.debug('Error parsing ITB location:', error);
      return { focusNode: null, path: null };
    }
  }

  /**
   * Infer constraint component from error description
   */
  private static inferConstraintComponent(description: string): string {
    if (!description) return 'sh:ConstraintComponent';
    
    const descLower = description.toLowerCase();
    
    if (descLower.includes('menos de') || descLower.includes('less than') || descLower.includes('mínimo')) {
      return 'sh:MinCountConstraintComponent';
    } else if (descLower.includes('más de') || descLower.includes('more than') || descLower.includes('máximo')) {
      return 'sh:MaxCountConstraintComponent';
    } else if (descLower.includes('tipo de dato') || descLower.includes('datatype')) {
      return 'sh:DatatypeConstraintComponent';
    } else if (descLower.includes('formato') || descLower.includes('pattern') || descLower.includes('patrón')) {
      return 'sh:PatternConstraintComponent';
    } else if (descLower.includes('debe contener') || descLower.includes('should contain') || descLower.includes('required')) {
      return 'sh:MinCountConstraintComponent';
    } else if (descLower.includes('debería contener') || descLower.includes('should contain')) {
      return 'sh:RecommendationConstraintComponent';
    } else if (descLower.includes('shape') || descLower.includes('forma')) {
      return 'sh:NodeShapeConstraintComponent';
    }
    
    return 'sh:ConstraintComponent';
  }

  /**
   * Infer entity context from focus node and path
   */
  private static inferEntityContext(focusNode: string | null, path: string | null): string {
    if (focusNode) {
      const focusLower = focusNode.toLowerCase();
      if (focusLower.includes('catalog') || focusLower.includes('catalogo')) {
        return 'dcat:Catalog';
      } else if (focusLower.includes('dataset') || focusLower.includes('datos')) {
        return 'dcat:Dataset';
      } else if (focusLower.includes('distribution') || focusLower.includes('distribucion')) {
        return 'dcat:Distribution';
      } else if (focusLower.includes('dataservice') || focusLower.includes('servicio')) {
        return 'dcat:DataService';
      }
    }
    
    if (path) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes('keyword') || pathLower.includes('theme')) {
        return 'dcat:Dataset';
      } else if (pathLower.includes('accessurl') || pathLower.includes('downloadurl')) {
        return 'dcat:Distribution';
      } else if (pathLower.includes('publisher') || pathLower.includes('contactpoint')) {
        return 'foaf:Organization';
      }
    }
    
    return 'Unknown Entity';
  }

  /**
   * Generate documentation URL based on description and path
   */
  private static generateDocumentationUrl(description: string, path: string | null): string | undefined {
    // For DCAT-AP-ES errors, try to generate URLs to the specification
    if (description.includes('DCAT-AP-ES') || description.includes('datosgobes.github.io')) {
      return 'https://datosgobes.github.io/DCAT-AP-ES/';
    }
    
    if (path) {
      const pathLower = path.toLowerCase();
      if (pathLower.includes('dcat') || pathLower.includes('dcterms')) {
        return 'https://datosgobes.github.io/DCAT-AP-ES/';
      }
    }
    
    return undefined;
  }

  /**
   * Calculate compliance score from SHACL results
   * Binary scoring: conforme = 100%, no conforme = 0%
   */
  static calculateComplianceScore(report: SHACLReport, locale: string = 'en'): number {
    console.log(`📊 Calculating compliance score - Conforms: ${report.conforms}, Violations: ${report.totalViolations}`);
    
    // Binary compliance scoring:
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

}