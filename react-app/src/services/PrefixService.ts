/**
 * Service to handle prefix management for RDF URIs
 */
export interface PrefixMap {
  [prefix: string]: string;
}

export class PrefixService {
  private static instance: PrefixService;
  private prefixes: PrefixMap = {};
  private loaded = false;

  private constructor() {}

  static getInstance(): PrefixService {
    if (!PrefixService.instance) {
      PrefixService.instance = new PrefixService();
    }
    return PrefixService.instance;
  }

  /**
   * Load prefixes from the prefixes.ttl file
   */
  async loadPrefixes(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const response = await fetch('/data/prefixes.ttl');
      if (!response.ok) {
        throw new Error(`Failed to load prefixes: ${response.statusText}`);
      }

      const prefixesContent = await response.text();
      this.parsePrefixes(prefixesContent);
      this.loaded = true;
      console.debug('📋 Loaded prefixes:', this.prefixes);
    } catch (error) {
      console.error('❌ Error loading prefixes:', error);
      // Set default prefixes if loading fails
      this.setDefaultPrefixes();
      this.loaded = true;
    }
  }

  /**
   * Parse Turtle prefix declarations
   */
  private parsePrefixes(content: string): void {
    const lines = content.split('\n');
    const prefixPattern = /@prefix\s+([a-zA-Z0-9_-]*):?\s+<([^>]+)>/;

    for (const line of lines) {
      const match = line.match(prefixPattern);
      if (match) {
        const prefix = match[1];
        const namespace = match[2];
        this.prefixes[prefix] = namespace;
      }
    }
  }

  /**
   * Set default prefixes as fallback
   */
  private setDefaultPrefixes(): void {
    this.prefixes = {
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'adms': 'http://www.w3.org/ns/adms#',
      'cc': 'http://creativecommons.org/ns#',
      'dcat': 'http://www.w3.org/ns/dcat#',
      'dct': 'http://purl.org/dc/terms/',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'locn': 'http://www.w3.org/ns/locn#',
      'geo': 'http://www.opengis.net/ont/geosparql#',
      'owl': 'http://www.w3.org/2002/07/owl#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'sh': 'http://www.w3.org/ns/shacl#',
      'skos': 'http://www.w3.org/2004/02/skos/core#',
      'vcard': 'http://www.w3.org/2006/vcard/ns#',
      'eli': 'http://data.europa.eu/eli/ontology#',
      'schema': 'http://schema.org/',
      'time': 'http://www.w3.org/2006/time#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'dcatapes': 'https://datosgobes.github.io/DCAT-AP-ES/',
      'dcatap': 'http://data.europa.eu/r5r/'
    };
  }

  /**
   * Convert a full URI to a prefixed form if possible
   */
  contractURI(uri: string): string {
    if (!uri) return uri;

    // If it's already a prefixed URI, return as-is
    if (uri.includes(':') && !uri.startsWith('http')) {
      return uri;
    }

    // Try to find a matching prefix
    for (const [prefix, namespace] of Object.entries(this.prefixes)) {
      if (uri.startsWith(namespace)) {
        const localName = uri.substring(namespace.length);
        return `${prefix}:${localName}`;
      }
    }

    // If no prefix found, return the local name part
    const lastSlash = uri.lastIndexOf('/');
    const lastHash = uri.lastIndexOf('#');
    const separator = Math.max(lastSlash, lastHash);
    
    if (separator > -1) {
      return uri.substring(separator + 1);
    }
    
    return uri;
  }

  /**
   * Expand a prefixed URI to its full form
   */
  expandURI(prefixedUri: string): string {
    if (!prefixedUri || !prefixedUri.includes(':')) {
      return prefixedUri;
    }

    const [prefix, localName] = prefixedUri.split(':', 2);
    const namespace = this.prefixes[prefix];
    
    if (namespace) {
      return namespace + localName;
    }
    
    return prefixedUri;
  }

  /**
   * Get all available prefixes
   */
  getPrefixes(): PrefixMap {
    return { ...this.prefixes };
  }

  /**
   * Get a specific namespace for a prefix
   */
  getNamespace(prefix: string): string | undefined {
    return this.prefixes[prefix];
  }

  /**
   * Check if prefixes are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}