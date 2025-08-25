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
  SHACLSeverity 
} from '../types';

export class SHACLValidationService {
  private static shaclShapesCache: Map<ValidationProfile, any> = new Map();

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

      // Load all SHACL files for the profile
      for (const shaclFile of shaclFiles) {
        const response = await fetch(`${process.env.PUBLIC_URL}/${shaclFile}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch SHACL file: ${shaclFile}`);
        }
        const shaclContent = await response.text();
        
        // Parse SHACL content as Turtle using N3
        const parser = new N3Parser({ factory: rdfDataModel });
        const parsedQuads: any[] = [];
        
        parser.parse(shaclContent, (error, quad, prefixes) => {
          if (error) {
            throw error;
          }
          if (quad) {
            parsedQuads.push(quad);
          }
        });
        
        for (const quad of parsedQuads) {
          dataset.add(quad);
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
   * Get SHACL files for a given profile
   */
  private static getSHACLFilesForProfile(profile: ValidationProfile): string[] {
    const shaclFileMap: Record<ValidationProfile, string[]> = {
      'dcat_ap': [
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_shapes.ttl',
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_range.ttl'
      ],
      'dcat_ap_es': [
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_shapes.ttl',
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_range.ttl',
        'docs/shacl/dcat-ap-es/1.0.0/shacl_dataset_shape.ttl',
        'docs/shacl/dcat-ap-es/1.0.0/shacl_distribution_shape.ttl',
        'docs/shacl/dcat-ap-es/1.0.0/shacl_dataservice_shape.ttl',
        'docs/shacl/dcat-ap-es/1.0.0/shacl_catalog_shape.ttl',
        'docs/shacl/dcat-ap-es/1.0.0/shacl_common_shapes.ttl'
      ],
      'nti_risp': [
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_shapes.ttl',
        'docs/shacl/dcat-ap/3.0.0/dcat-ap_3.0.0_shacl_range.ttl'
        // Note: NTI-RISP specific shapes would be added here when available
      ]
    };

    return shaclFileMap[profile] || [];
  }

  /**
   * Parse RDF content into a dataset
   */
  private static async parseRDFContent(content: string, format: string = 'turtle'): Promise<any> {
    try {
      const dataset = rdfDataset.dataset();
      const parser = new N3Parser({ factory: rdfDataModel });
      const parsedQuads: any[] = [];
      
      parser.parse(content, (error, quad, prefixes) => {
        if (error) {
          throw error;
        }
        if (quad) {
          parsedQuads.push(quad);
        }
      });
      
      for (const quad of parsedQuads) {
        dataset.add(quad);
      }

      return dataset;
    } catch (error) {
      console.error('Error parsing RDF content:', error);
      throw error;
    }
  }

  /**
   * Parse SHACL validation result from shacl-engine
   */
  private static parseSHACLResult(validationReport: any): SHACLValidationResult {
    const results: SHACLViolation[] = [];

    // shacl-engine returns results in validationReport.results
    if (validationReport.results) {
      for (const result of validationReport.results) {
        const violation: SHACLViolation = {
          focusNode: result.focusNode?.value || result.focusNode?.toString() || '',
          path: result.path?.value || result.path?.toString(),
          value: result.value?.value || result.value?.toString(),
          message: this.extractMessages(result),
          severity: this.mapSeverityFromSHACLEngine(result.severity),
          sourceConstraintComponent: result.sourceConstraintComponent?.value || result.sourceConstraintComponent?.toString() || '',
          sourceShape: result.sourceShape?.value || result.sourceShape?.toString() || '',
          resultSeverity: result.resultSeverity?.value || result.resultSeverity?.toString()
        };

        results.push(violation);
      }
    }

    return {
      conforms: validationReport.conforms || false,
      results,
      text: validationReport.text,
      graph: validationReport.dataset
    };
  }

  /**
   * Extract messages from SHACL result
   */
  private static extractMessages(result: any): string[] {
    if (result.message) {
      if (Array.isArray(result.message)) {
        return result.message.map((m: any) => m.value || m.toString());
      } else {
        return [result.message.value || result.message.toString()];
      }
    }
    return ['Validation constraint violated'];
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
      
      // Parse RDF data
      const data = await this.parseRDFContent(rdfContent, format);

      // Create validator with SPARQL support
      const validator = new Validator(shapes, {
        factory: rdfDataModel,
        validations: sparqlValidations,
        debug: true,
        details: true
      });

      // Run validation
      const report = await validator.validate({ dataset: data });
      
      // Parse results
      const validationResult = this.parseSHACLResult(report);

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
   */
  public static calculateComplianceScore(report: SHACLReport): number {
    if (report.conforms) {
      return 100; // Full compliance
    }

    // Calculate score based on violation severity
    const violationPenalty = report.violations.length * 10;
    const warningPenalty = report.warnings.length * 2;
    const infoPenalty = report.infos.length * 0.5;
    
    const totalPenalty = violationPenalty + warningPenalty + infoPenalty;
    const score = Math.max(0, 100 - totalPenalty);
    
    return Math.round(score);
  }

  /**
   * Export SHACL report as Turtle (enhanced version)
   */
  public static async exportReportAsTurtle(report: SHACLReport): Promise<string> {
    const timestamp = new Date().toISOString();
    
    let turtle = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# SHACL Validation Report for ${report.profile}
# Generated by shacl-engine
# Timestamp: ${timestamp}

<urn:shacl:report:${report.profile}:${Date.now()}> a sh:ValidationReport ;
    sh:conforms ${report.conforms} ;
    dct:created "${timestamp}"^^xsd:dateTime ;
    dct:subject <urn:dataset:${report.profile}> ;
    rdfs:comment "Validation report generated by MQA SHACL validation" .

`;

    // Add violation results
    report.violations.forEach((violation, index) => {
      const resultId = `urn:shacl:result:violation:${index}`;
      turtle += `
${resultId} a sh:ValidationResult ;
    sh:resultSeverity sh:Violation ;
    sh:focusNode <${violation.focusNode || 'unknown'}> ;
    sh:resultMessage "${violation.message.join(', ').replace(/"/g, '\\"')}" ;
    sh:sourceConstraintComponent <${violation.sourceConstraintComponent}> ;
    sh:sourceShape <${violation.sourceShape}> `;
      
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
    sh:focusNode <${warning.focusNode || 'unknown'}> ;
    sh:resultMessage "${warning.message.join(', ').replace(/"/g, '\\"')}" ;
    sh:sourceConstraintComponent <${warning.sourceConstraintComponent}> ;
    sh:sourceShape <${warning.sourceShape}> `;
      
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
    sh:focusNode <${info.focusNode || 'unknown'}> ;
    sh:resultMessage "${info.message.join(', ').replace(/"/g, '\\"')}" ;
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
   * Clear cache (useful for testing or when SHACL files are updated)
   */
  public static clearCache(): void {
    this.shaclShapesCache.clear();
    console.log('SHACL shapes cache cleared');
  }
}

export default SHACLValidationService;