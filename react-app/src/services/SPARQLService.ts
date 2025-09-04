import { ValidationProfile } from '../types';
import mqaConfigData from '../config/mqa-config.json';

/**
 * Interface for SPARQL query parameters
 */
export interface SPARQLQueryParams {
  [key: string]: string;
}

/**
 * Interface for predefined SPARQL queries
 */
export interface PredefinedSPARQLQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  parameters: {
    name: string;
    label: string;
    placeholder: string;
    required: boolean;
    defaultValue?: string;
  }[];
  profile: ValidationProfile;
  endpoint: string;
}

/**
 * Interface for SPARQL query configuration
 */
interface SPARQLQueryConfig {
  id: string;
  name: string;
  description: string;
  file: string;
  endpoint: string;
  parameters: {
    name: string;
    label: string;
    placeholder: string;
    required: boolean;
    defaultValue?: string;
  }[];
}

/**
 * Interface for SPARQL query execution result
 */
export interface SPARQLQueryResult {
  success: boolean;
  data?: string; // RDF content in Turtle format
  error?: string;
  resultsCount?: number;
  executionTime?: number;
}

/**
 * Service for executing SPARQL queries and managing predefined queries
 */
export class SPARQLService {
  private static instance: SPARQLService;
  private predefinedQueries: PredefinedSPARQLQuery[] = [];
  private queriesLoaded: boolean = false;

  private constructor() {
    // Queries will be loaded asynchronously
  }

  public static getInstance(): SPARQLService {
    if (!SPARQLService.instance) {
      SPARQLService.instance = new SPARQLService();
    }
    return SPARQLService.instance;
  }

  /**
   * Load predefined SPARQL queries from mqa-config
   */
  private async loadPredefinedQueries(): Promise<void> {
    if (this.queriesLoaded) return;

    try {
      console.debug('📥 Loading SPARQL queries from mqa-config...');
      
      // Get queries from mqa-config
      const sparqlConfig = (mqaConfigData as any).sparqlConfig;
      if (!sparqlConfig || !sparqlConfig.queries) {
        throw new Error('No sparqlConfig found in mqa-config.json');
      }

      const defaultEndpoint = sparqlConfig.defaultEndpoint || 'https://datos.gob.es/virtuoso/sparql';
      
      // Load queries for each profile
      for (const [profile, queries] of Object.entries(sparqlConfig.queries)) {
        for (const queryConfig of queries as any[]) {
          try {
            console.debug(`📥 Loading query: ${queryConfig.name}`);

            this.predefinedQueries.push({
              id: queryConfig.id,
              name: queryConfig.name,
              description: queryConfig.description,
              query: queryConfig.query,
              parameters: queryConfig.parameters || [],
              profile: profile as ValidationProfile,
              endpoint: defaultEndpoint
            });

                        console.log(`✅ Loaded query: ${queryConfig.name}`);
          } catch (error) {
            console.error(`❌ Error loading query ${queryConfig.id}:`, error);
          }
        }
      }
      
      this.queriesLoaded = true;
      console.log(`✅ Loaded ${this.predefinedQueries.length} SPARQL queries from mqa-config`);
      
    } catch (error) {
      console.error('❌ Error loading SPARQL queries from mqa-config:', error);
      // Keep empty array if everything fails
      this.predefinedQueries = [];
      this.queriesLoaded = true;
    }
  }

  /**
   * Get predefined queries for a specific profile
   */
  public async getPredefinedQueries(profile?: ValidationProfile): Promise<PredefinedSPARQLQuery[]> {
    await this.loadPredefinedQueries();
    
    if (profile) {
      return this.predefinedQueries.filter(q => q.profile === profile);
    }
    return this.predefinedQueries;
  }

  /**
   * Get a specific predefined query by ID
   */
  public async getPredefinedQuery(id: string): Promise<PredefinedSPARQLQuery | undefined> {
    await this.loadPredefinedQueries();
    return this.predefinedQueries.find(q => q.id === id);
  }

  /**
   * Replace parameters in SPARQL query
   */
  public replaceQueryParameters(query: string, parameters: SPARQLQueryParams): string {
    let processedQuery = query;
    
    // Replace all parameter placeholders with their values
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processedQuery = processedQuery.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return processedQuery;
  }

  /**
   * Execute a SPARQL query against an endpoint
   */
  public async executeSPARQLQuery(
    endpoint: string, 
    query: string, 
    parameters?: SPARQLQueryParams,
    timeoutMs: number = 30000
  ): Promise<SPARQLQueryResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Executing SPARQL query against endpoint:', endpoint);
      
      // Replace parameters if provided
      const processedQuery = parameters ? this.replaceQueryParameters(query, parameters) : query;
      console.log('📝 Processed SPARQL query:', processedQuery);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // Prepare form data for SPARQL endpoint
      const formData = new URLSearchParams();
      formData.append('query', processedQuery);
      formData.append('format', 'turtle'); // Request Turtle format
      
      // Execute the query
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/turtle, application/rdf+xml, text/plain'
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`SPARQL endpoint error: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const data = await response.text();
      
      // Verify we got RDF content
      if (!data || data.trim().length === 0) {
        throw new Error('No data returned from SPARQL endpoint');
      }
      
      // Simple heuristic to count results (count triple patterns)
      const resultsCount = this.estimateResultsCount(data);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ SPARQL query executed successfully in ${executionTime}ms, ~${resultsCount} results`);
      
      return {
        success: true,
        data,
        resultsCount,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ SPARQL query execution failed:', error);
      
      let errorMessage = 'SPARQL query execution failed';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Query timeout after ${timeoutMs}ms`;
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * Estimate the number of results from RDF content
   */
  private estimateResultsCount(rdfContent: string): number {
    // Simple heuristic: count lines that look like RDF triples
    const lines = rdfContent.split('\n');
    let count = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Count lines that are not comments, prefixes, or empty
      if (trimmed && 
          !trimmed.startsWith('#') && 
          !trimmed.startsWith('@prefix') && 
          !trimmed.startsWith('@base') &&
          (trimmed.includes(' ') || trimmed.includes('\t'))) {
        count++;
      }
    }
    
    return Math.max(1, Math.floor(count / 3)); // Rough estimate: 3 lines per entity
  }

  /**
   * Validate SPARQL query syntax (basic validation)
   */
  public validateSPARQLQuery(query: string): { valid: boolean; error?: string } {
    try {
      // Basic SPARQL syntax validation
      if (!query || query.trim().length === 0) {
        return { valid: false, error: 'Query cannot be empty' };
      }
      
      const trimmedQuery = query.trim().toUpperCase();
      
      // Check if it's a CONSTRUCT or SELECT query
      if (!trimmedQuery.startsWith('SELECT') && 
          !trimmedQuery.startsWith('CONSTRUCT') && 
          !trimmedQuery.startsWith('DESCRIBE') && 
          !trimmedQuery.startsWith('ASK')) {
        return { valid: false, error: 'Query must be a SELECT, CONSTRUCT, DESCRIBE, or ASK query' };
      }
      
      // Check for WHERE clause (required for most queries)
      if (!trimmedQuery.includes('WHERE')) {
        return { valid: false, error: 'Query must contain a WHERE clause' };
      }
      
      // Basic bracket matching
      const openBrackets = (query.match(/\{/g) || []).length;
      const closeBrackets = (query.match(/\}/g) || []).length;
      
      if (openBrackets !== closeBrackets) {
        return { valid: false, error: 'Mismatched brackets in query' };
      }
      
      return { valid: true };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Query validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export default SPARQLService;