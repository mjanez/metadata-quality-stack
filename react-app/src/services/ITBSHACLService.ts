import { 
  ValidationProfile, 
  SHACLValidationResult, 
  SHACLViolation, 
  SHACLSeverity,
  MQAConfig
} from '../types';
import { SHACLMessageService, LocalizedMessage } from './SHACLMessageService';
import mqaConfigData from '../config/mqa-config.json';

interface ITBValidationRequest {
  contentToValidate: string;
  contentSyntax: string;
  embeddingMethod?: 'STRING' | 'URL' | 'BASE64';
  reportSyntax: string;
  externalRules: ITBRuleSet[];
}

interface ITBRuleSet {
  ruleSet: string;
  embeddingMethod: 'URL' | 'STRING';
  ruleSyntax: string;
}

export class ITBSHACLService {
  private static readonly ITB_BASE_URL = 'https://www.itb.ec.europa.eu/shacl';
  private static readonly DOMAIN = 'any'; // Using 'any' domain for custom shapes

  /**
   * Validate RDF content using ITB SHACL Validator API
   */
  static async validateRDF(
    rdfContent: string, 
    profile: ValidationProfile
  ): Promise<SHACLValidationResult> {
    try {
      console.log(`🔍 Running ITB SHACL validation for profile: ${profile}`);
      
      // Get SHACL files URLs for the profile
      const shaclUrls = this.getSHACLFilesForProfile(profile);
      
      if (shaclUrls.length === 0) {
        throw new Error(`No SHACL files configured for profile: ${profile}`);
      }

      console.log(`📋 Using ${shaclUrls.length} SHACL files for validation:`, shaclUrls);

      // Prepare external rules (SHACL shapes)
      const externalRules: ITBRuleSet[] = shaclUrls.map(url => ({
        ruleSet: url,
        embeddingMethod: 'URL' as const,
        ruleSyntax: 'text/turtle'
      }));

      // Prepare validation request
      const request: ITBValidationRequest = {
        contentToValidate: rdfContent,
        contentSyntax: 'text/turtle',
        embeddingMethod: 'STRING',
        reportSyntax: 'text/turtle', // Request Turtle format for easier parsing
        externalRules
      };

      console.log(`🌐 Sending validation request to ITB API...`);
      
      // Make API call to ITB
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

      // ITB returns the validation report directly as text (not JSON)
      const reportText = await response.text();
      console.log(`📊 Received validation report from ITB (${reportText.length} characters)`);

      // Parse the SHACL validation report
      return this.parseSHACLReport(reportText);

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
    console.log(`📋 Found ${shaclFiles.length} SHACL files in config for profile ${profile} (v${defaultVersion}):`, shaclFiles);
    
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

    console.log(`📋 Using ${processedUrls.length} SHACL files for ITB validation:`, processedUrls);
    return processedUrls;
  }

  /**
   * Parse SHACL validation report from ITB (Turtle format)
   */
  private static parseSHACLReport(reportTurtle: string): SHACLValidationResult {
    console.log('📋 Parsing ITB SHACL validation report...');
    
    try {
      const results: SHACLViolation[] = [];
      
      // Check conformance
      const conformsMatch = reportTurtle.match(/sh:conforms\s+(true|false)/);
      const conforms = conformsMatch ? conformsMatch[1] === 'true' : true;
      
      // Parse each sh:result block
      // The pattern matches: sh:result [ ... ]
      const resultBlockPattern = /sh:result\s*\[\s*([^\]]+(?:\[[^\]]*\][^\]]*)*)\s*\]/g;
      let match;
      
      console.log(`� Searching for sh:result blocks in report...`);
      
      while ((match = resultBlockPattern.exec(reportTurtle)) !== null) {
        const resultBlock = match[1];
        console.log(`📋 Processing sh:result block: ${resultBlock.substring(0, 100)}...`);
        
        try {
          const violation: SHACLViolation = {
            focusNode: this.extractValueFromBlock(resultBlock, 'sh:focusNode') || '',
            path: this.extractValueFromBlock(resultBlock, 'sh:resultPath') || '',
            value: this.extractValueFromBlock(resultBlock, 'sh:value') || '',
            message: this.extractMessagesFromBlock(resultBlock),
            severity: this.mapSeverity(this.extractValueFromBlock(resultBlock, 'sh:resultSeverity')),
            sourceConstraintComponent: this.extractValueFromBlock(resultBlock, 'sh:sourceConstraintComponent') || '',
            sourceShape: this.extractValueFromBlock(resultBlock, 'sh:sourceShape') || '[]',
            resultSeverity: this.extractValueFromBlock(resultBlock, 'sh:resultSeverity') || '',
            foafPage: ''
          };
          
          results.push(violation);
          console.log(`✅ Parsed violation: ${violation.severity} on ${violation.focusNode} path ${violation.path}`);
        } catch (blockError) {
          console.error(`❌ Error parsing individual sh:result block:`, blockError);
        }
      }

      console.log(`✅ ITB SHACL validation completed: ${results.length} violations found, conforms: ${conforms}`);

      return {
        conforms,
        results,
        text: reportTurtle,
        graph: undefined
      };

    } catch (error) {
      console.error('❌ Error parsing ITB SHACL report:', error);
      throw error;
    }
  }

  /**
   * Extract value from a result block using improved regex
   */
  private static extractValueFromBlock(block: string, property: string): string | null {
    // Handle both full URIs and prefixed names
    const patterns = [
      // Pattern for URIs: sh:focusNode <http://example.org/resource>
      new RegExp(`${property}\\s+<([^>]+)>`, 'i'),
      // Pattern for prefixed names: sh:resultPath foaf:page
      new RegExp(`${property}\\s+([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)`, 'i'),
      // Pattern for simple values: sh:resultSeverity sh:Warning
      new RegExp(`${property}\\s+(sh:[a-zA-Z0-9_-]+)`, 'i'),
      // Pattern for bare values: sh:sourceShape []
      new RegExp(`${property}\\s+([^;\\s]+)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = block.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract message from block, handling multiple messages with language tags
   */
  private static extractMessageFromBlock(block: string): string | null {
    // Pattern for messages with language tags: sh:resultMessage "The dataset should..."@en, "El dataset debe..."@es
    const multiMessagePattern = /sh:resultMessage\s+((?:"[^"]*"(?:@[a-z]{2})?\s*,?\s*)+)/i;
    const multiMatch = block.match(multiMessagePattern);
    
    if (multiMatch) {
      // Return the full message string with all languages
      return multiMatch[1].trim();
    }
    
    // Fallback to single message pattern
    const singleMessagePattern = /sh:resultMessage\s+"([^"]+)"(?:@[a-z]{2})?/i;
    const singleMatch = block.match(singleMessagePattern);
    return singleMatch ? singleMatch[1] : null;
  }

  /**
   * Extract multiple localized messages from a block
   */
  private static extractMessagesFromBlock(block: string): string[] {
    const messages: string[] = [];
    
    // First try to get the full message block
    const fullMessage = this.extractMessageFromBlock(block);
    if (!fullMessage) {
      return ['Validation constraint violated'];
    }
    
    // Parse with SHACLMessageService to handle language tags
    const parsedMessages = SHACLMessageService.parseMessages(fullMessage);
    
    // Convert back to strings with language tags for compatibility
    return parsedMessages.map(msg => {
      const languageTag = msg.language ? `@${msg.language}` : '';
      return `"${msg.text}"${languageTag}`;
    });
  }

  /**
   * Map SHACL severity from ITB to our internal format
   */
  private static mapSeverity(severity: string | null): SHACLSeverity {
    if (!severity) return 'Violation';
    
    if (severity.includes('Violation')) return 'Violation';
    if (severity.includes('Warning')) return 'Warning';
    if (severity.includes('Info')) return 'Info';
    
    return 'Violation'; // Default
  }

  /**
   * Calculate compliance score from SHACL results
   */
  static calculateComplianceScore(result: SHACLValidationResult): number {
    if (result.conforms) {
      return 100;
    }
    
    // Simple scoring: each violation reduces score
    const violations = result.results.filter(r => r.severity === 'Violation').length;
    const warnings = result.results.filter(r => r.severity === 'Warning').length;
    
    // Violations are more serious than warnings
    const totalIssues = violations + (warnings * 0.5);
    
    // Simple formula - can be adjusted
    const score = Math.max(0, 100 - (totalIssues * 10));
    
    return Math.round(score);
  }
}