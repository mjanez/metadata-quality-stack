import { RDFFormat } from '../types';

/**
 * Auto-detect RDF format based on content
 */
export function detectRDFFormat(content: string): RDFFormat {
  if (!content || !content.trim()) {
    return 'auto';
  }

  const trimmedContent = content.trim();
  
  // Check for XML declaration or RDF/XML structure FIRST (most specific)
  if (trimmedContent.startsWith('<?xml') || 
      trimmedContent.includes('<rdf:RDF') || 
      trimmedContent.includes('<RDF') ||
      /<[a-zA-Z][^>]*xmlns[^>]*rdf/.test(trimmedContent) ||
      /<[a-zA-Z][^>]*xmlns[^>]*="[^"]*rdf[^"]*"/.test(trimmedContent)) {
    return 'rdfxml';
  }
  
  // Check for JSON-LD structure SECOND (also very specific)
  if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) ||
      (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmedContent);
      // Check for JSON-LD keywords
      if (typeof parsed === 'object' && parsed !== null) {
        const jsonStr = JSON.stringify(parsed);
        if (jsonStr.includes('"@context"') || 
            jsonStr.includes('"@id"') || 
            jsonStr.includes('"@type"') ||
            jsonStr.includes('"@graph"')) {
          return 'jsonld';
        }
      }
      // If it's valid JSON but doesn't have JSON-LD keywords, assume it might still be JSON-LD
      return 'jsonld';
    } catch {
      // Not valid JSON, continue checking other formats
    }
  }
  
  // Check for N-Triples FIRST (more specific pattern - absolute URIs)
  // N-Triples starts with absolute URIs and doesn't use prefixes
  if (trimmedContent.startsWith('<http') || trimmedContent.startsWith('<urn:')) {
    const lines = trimmedContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    if (lines.length > 0) {
      const ntriplesPattern = /^<[^>]+>\s+<[^>]+>\s+(?:<[^>]+>|"[^"]*"(?:\^\^<[^>]+>)?|[^\s]+)\s*\.\s*$/;
      const validNTriplesLines = lines.filter(line => ntriplesPattern.test(line));
      
      // If most lines look like N-Triples, it's probably N-Triples
      if (validNTriplesLines.length / lines.length > 0.7) {
        return 'ntriples';
      }
    }
  }
  
  // Check for Turtle/TTL features (prefixes, shortened URIs)
  if (trimmedContent.includes('@prefix') || 
      trimmedContent.includes('@base') ||
      trimmedContent.includes('PREFIX') ||
      trimmedContent.includes('BASE') ||
      /^\w+:\s*</.test(trimmedContent) || // prefix: <uri>
      /\w+:\w+\s/.test(trimmedContent)) { // prefixed names with space
    return 'turtle';
  }
  
  // Default fallback to turtle
  return 'turtle';
}

/**
 * Get human-readable format name
 */
export function getFormatDisplayName(format: RDFFormat): string {
  switch (format) {
    case 'turtle': return 'Turtle/TTL';
    case 'rdfxml': return 'RDF/XML';
    case 'jsonld': return 'JSON-LD';
    case 'ntriples': return 'N-Triples';
    case 'auto': return 'Auto-detect';
    default: return String(format).toUpperCase();
  }
}