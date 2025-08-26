import { Store as N3Store, Parser as N3Parser } from 'n3';
import { ValidationProfile, MQAConfig, QualityResult, QualityMetric, VocabularyItem, SHACLReport, ProfileSelection } from '../types';
import { RDFService } from './RDFService';
import mqaConfig from '../config/mqa-config.json';

export class MQAService {
  private static instance: MQAService;
  private config: MQAConfig;
  private vocabularies: Map<string, VocabularyItem[]> = new Map();

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

      console.log(`📚 Loading vocabulary: ${name}`);
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
   * Parse RDF content into N3 Store
   */
  private async parseRDF(content: string): Promise<N3Store> {
    return new Promise((resolve, reject) => {
      const store = new N3Store();
      const parser = new N3Parser({ format: 'text/turtle' });

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
  private hasProperty(store: N3Store, property: string): { found: boolean; values: string[] } {
    const quads = store.getQuads();
    const matchingQuads = quads.filter(quad => quad.predicate.value === property);
    const values = matchingQuads.map(quad => {
      if (quad.object.termType === 'Literal') {
        return quad.object.value;
      } else if (quad.object.termType === 'NamedNode') {
        return quad.object.value;
      }
      return quad.object.value;
    });

    return {
      found: matchingQuads.length > 0,
      values: values
    };
  }

  /**
   * Check if value is in vocabulary (deprecated, use checkVocabularyMatch instead)
   */
  private async isInVocabulary(value: string, vocabularyName: string): Promise<boolean> {
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
      const propertyCheck = this.hasProperty(store, fullProperty);
      found = propertyCheck.found;
      values = propertyCheck.values;

      if (found) {
        // Enhanced scoring based on metric type
        score = await this.calculateMetricScore(id, values, weight);
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
  private async calculateMetricScore(metricId: string, values: string[], maxWeight: number): Promise<number> {
    if (!values || values.length === 0) {
      return 0;
    }

    switch (metricId) {
      // Format-related metrics
      case 'dct_format_vocabulary':
      case 'dct_mediaType_vocabulary':
        const vocabName = metricId.includes('format') ? 'file_types' : 'media_types';
        return await this.checkVocabularyMatch(values, vocabName) ? maxWeight : 0;

      case 'dct_format_nonproprietary':
        return await this.checkVocabularyMatch(values, 'non_proprietary') ? maxWeight : 0;

      case 'dct_format_machinereadable':
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
   * Check if any value matches vocabulary entries
   */
  private async checkVocabularyMatch(values: string[], vocabularyName: string): Promise<boolean> {
    const vocabulary = await this.loadVocabulary(vocabularyName);
    
    // Filter out empty or invalid values
    const validValues = values.filter(value => value && typeof value === 'string' && value.trim().length > 0);
    
    return validValues.some(value => 
      vocabulary.some(item => 
        (item.value && this.normalizeValue(item.value) === this.normalizeValue(value)) ||
        (item.label && this.normalizeValue(item.label) === this.normalizeValue(value))
      )
    );
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
    profileSelection: ProfileSelection | ValidationProfile
  ): Promise<{ quality: QualityResult; shaclReport: SHACLReport }> {
    try {
      // Extract profile string from ProfileSelection or use as-is if it's a string
      const profile: ValidationProfile = typeof profileSelection === 'string' 
        ? profileSelection 
        : profileSelection.profile;
        
      console.log(`🔍 Starting MQA+SHACL evaluation for profile: ${profile}`);

      // Run standard MQA evaluation
      const quality = await this.calculateQuality(content, profile);

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

      console.log(`✅ MQA+SHACL evaluation completed. SHACL conforms: ${shaclReport.conforms}`);

      return { quality, shaclReport };

    } catch (error) {
      console.error('❌ MQA+SHACL evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate quality assessment for RDF content
   */
  public async calculateQuality(content: string, profile: ValidationProfile): Promise<QualityResult> {
    try {
      console.log(`🔍 Starting MQA evaluation for profile: ${profile}`);
      
      // Parse RDF content
      const store = await this.parseRDF(content);
      console.log(`📊 Parsed RDF store with ${store.size} triples`);

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
        console.log(`📋 Evaluating ${metrics.length} metrics for category: ${category}`);
        
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
