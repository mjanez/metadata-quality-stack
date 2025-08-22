import { Parser as N3Parser, Writer as N3Writer, Store as N3Store } from 'n3';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { RDFFormat } from '../types';

export class RDFService {
  /**
   * Detect RDF format from content
   */
  public static detectFormat(content: string): RDFFormat {
    const trimmed = content.trim();
    
    if (trimmed.startsWith('<?xml') || 
        trimmed.includes('<rdf:RDF') || 
        trimmed.includes('<RDF') ||
        trimmed.includes('xmlns:rdf=')) {
      return 'rdfxml';
    }
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed['@context'] || parsed['@graph'] || parsed['@id']) {
          return 'jsonld';
        }
      } catch (e) {
        // Not valid JSON, continue checking
      }
    }
    
    if (trimmed.includes('<') && trimmed.includes('>') && trimmed.includes(' .')) {
      const lines = trimmed.split('\n');
      const ntriplesPattern = /^<[^>]+>\s+<[^>]+>\s+.*\s+\.$/;
      if (lines.some(line => ntriplesPattern.test(line.trim()))) {
        return 'ntriples';
      }
    }
    
    return 'turtle';
  }

  /**
   * Convert RDF/XML to Turtle
   */
  public static async convertRdfXmlToTurtle(rdfXmlContent: string, baseIRI: string = 'http://example.org/'): Promise<string> {
    try {
      console.log('🔄 Converting RDF/XML to Turtle...');
      
      const parser = new RdfXmlParser({ baseIRI });
      const store = new N3Store();
      
      return new Promise((resolve, reject) => {
        parser.on('data', (quad) => {
          store.addQuad(quad);
        });
        
        parser.on('error', (error) => {
          console.error('❌ RDF/XML Parser error:', error);
          reject(new Error(`RDF/XML parsing failed: ${error.message}`));
        });
        
        parser.on('end', () => {
          try {
            const writer = new N3Writer({
              prefixes: {
                rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
                dcat: 'http://www.w3.org/ns/dcat#',
                dcterms: 'http://purl.org/dc/terms/',
                foaf: 'http://xmlns.com/foaf/0.1/',
                vcard: 'http://www.w3.org/2006/vcard/ns#',
                adms: 'http://www.w3.org/ns/adms#'
              }
            });

            const quads = store.getQuads();
            console.log(`✅ Parsed ${quads.length} quads from RDF/XML`);
            
            writer.addQuads(quads);
            writer.end((error, result) => {
              if (error) {
                reject(error);
              } else {
                console.log('✅ RDF/XML successfully converted to Turtle');
                resolve(result);
              }
            });
          } catch (conversionError) {
            reject(conversionError);
          }
        });

        parser.write(rdfXmlContent);
        parser.end();
      });
      
    } catch (error) {
      console.error('❌ Failed to convert RDF/XML to Turtle:', error);
      throw new Error(`RDF/XML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch content from URL
   */
  public static async fetchFromUrl(url: string): Promise<string> {
    try {
      console.log(`🌐 Fetching content from URL: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      console.log(`✅ Successfully fetched ${content.length} characters from URL`);
      return content;
    } catch (error) {
      console.error('❌ Failed to fetch from URL:', error);
      throw new Error(`Failed to fetch from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse and count RDF statistics
   */
  public static async parseAndCount(turtleContent: string): Promise<{ 
    triples: number; 
    subjects: number; 
    predicates: number; 
    objects: number;
    datasets: number;
    dataServices: number;
    distributions: number;
  }> {
    return new Promise((resolve, reject) => {
      const store = new N3Store();
      const parser = new N3Parser({ format: 'text/turtle' });

      parser.parse(turtleContent, (error, quad, prefixes) => {
        if (error) {
          reject(error);
        } else if (quad) {
          store.addQuad(quad);
        } else {
          // End of parsing
          const subjects = new Set();
          const predicates = new Set();
          const objects = new Set();
          
          // DCAT entity counters
          const datasets = new Set();
          const dataServices = new Set();
          const distributions = new Set();

          const quads = store.getQuads();
          quads.forEach(quad => {
            subjects.add(quad.subject.value);
            predicates.add(quad.predicate.value);
            objects.add(quad.object.value);
            
            // Count DCAT entities based on rdf:type
            if (quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
              const objectValue = quad.object.value;
              if (objectValue === 'http://www.w3.org/ns/dcat#Dataset') {
                datasets.add(quad.subject.value);
              } else if (objectValue === 'http://www.w3.org/ns/dcat#DataService') {
                dataServices.add(quad.subject.value);
              } else if (objectValue === 'http://www.w3.org/ns/dcat#Distribution') {
                distributions.add(quad.subject.value);
              }
            }
          });

          resolve({
            triples: store.size,
            subjects: subjects.size,
            predicates: predicates.size,
            objects: objects.size,
            datasets: datasets.size,
            dataServices: dataServices.size,
            distributions: distributions.size
          });
        }
      });
    });
  }

  /**
   * Normalize RDF content to Turtle format
   */
  public static async normalizeToTurtle(content: string, isUrl: boolean = false): Promise<string> {
    if (isUrl) {
      content = await this.fetchFromUrl(content);
    }

    const format = this.detectFormat(content);
    
    if (format === 'rdfxml') {
      return await this.convertRdfXmlToTurtle(content);
    } else if (format === 'turtle') {
      return content;
    } else {
      throw new Error(`Unsupported RDF format: ${format}`);
    }
  }
}

export default RDFService;
