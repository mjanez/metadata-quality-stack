import { RDFFormat } from '../types';

/**
 * Auto-detect RDF format based on content
 */
export function detectRDFFormat(content: string): RDFFormat {
  if (!content || !content.trim()) {
    return 'auto';
  }

  const trimmedContent = content.trim();
  
  // Check for XML declaration or RDF/XML structure
  if (trimmedContent.startsWith('<?xml') || 
      trimmedContent.includes('<rdf:RDF') || 
      trimmedContent.includes('<RDF') ||
      /<[a-zA-Z][^>]*xmlns[^>]*>/.test(trimmedContent)) {
    return 'rdfxml';
  }
  
  // Check for JSON-LD structure
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
      // If it's valid JSON but not JSON-LD, still might be JSON-LD without context
      return 'jsonld';
    } catch {
      // Not valid JSON, continue checking other formats
    }
  }
  
  // Check for N-Triples (simple triple format)
  const lines = trimmedContent.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length > 0) {
    const ntriplesPattern = /^<[^>]+>\s+<[^>]+>\s+(?:<[^>]+>|"[^"]*"(?:\^\^<[^>]+>)?|\w+)\s*\.?\s*$/;
    const validNTriplesLines = lines.filter(line => 
      line.startsWith('#') || // Comments
      ntriplesPattern.test(line)
    );
    
    // If most lines look like N-Triples, it's probably N-Triples
    if (validNTriplesLines.length / lines.length > 0.8) {
      return 'ntriples';
    }
  }
  
  // Check for Turtle/TTL features
  if (trimmedContent.includes('@prefix') || 
      trimmedContent.includes('@base') ||
      trimmedContent.includes('PREFIX') ||
      trimmedContent.includes('BASE') ||
      /\w+:\w+/.test(trimmedContent)) { // Prefixed names
    return 'turtle';
  }
  
  // Default fallback
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