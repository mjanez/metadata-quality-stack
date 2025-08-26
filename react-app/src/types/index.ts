// RDF Format types
export type RDFFormat = 'turtle' | 'rdfxml' | 'jsonld' | 'ntriples' | 'auto';

// Validation profile types  
export type ValidationProfile = 'dcat_ap' | 'dcat_ap_es' | 'nti_risp';

// MQA Configuration types
export interface MQAConfig {
  profiles: {
    [key in ValidationProfile]: {
      name: string;
      maxScore: number;
      shaclFiles: string[];
      dimensions: {
        [dimension: string]: {
          maxScore: number;
        };
      };
    };
  };
  metricsByProfile: {
    [key in ValidationProfile]: {
      [dimension: string]: MQAMetricConfig[];
    };
  };
  metricLabels: {
    [metricId: string]: {
      en: string;
      es: string;
    };
  };
}

export interface MQAMetricConfig {
  id: string;
  weight: number;
  property: string;
}

// Quality metrics types
export interface QualityMetric {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  description: string;
  category: 'findability' | 'accessibility' | 'interoperability' | 'reusability' | 'contextuality';
  property?: string;
  found?: boolean;
  value?: string;
}

export interface QualityResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  metrics: QualityMetric[];
  byCategory: {
    [key: string]: {
      score: number;
      maxScore: number;
      percentage: number;
      metrics: QualityMetric[];
    };
  };
}

// Validation result types
export interface ValidationResult {
  profile: ValidationProfile;
  content: string;
  quality: QualityResult;
  stats: {
    triples: number;
    subjects: number;
    predicates: number;
    objects: number;
    datasets: number;
    dataServices: number;
    distributions: number;
  };
  timestamp: string;
}

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning' | 'info';
  path?: string;
  line?: number;
}

export interface ValidationWarning extends ValidationError {
  suggestion?: string;
}

// Input types
export interface ValidationInput {
  content: string;
  format: RDFFormat;
  source: 'url' | 'text';
  url?: string;
}

// Vocabulary types
export interface VocabularyItem {
  value: string;
  label?: string;
  category?: string;
}

// Configuration types
export interface AppConfig {
  baseIRI: string;
  profiles: {
    [key in ValidationProfile]: {
      name: string;
      description: string;
      shaclFiles: string[];
    };
  };
  vocabularies: string[];
}

// SHACL Validation types
export interface SHACLValidationResult {
  conforms: boolean;
  results: SHACLViolation[];
  text?: string;
  graph?: any;
}

export interface SHACLViolation {
  focusNode: string;
  path?: string;
  value?: string;
  message: string[];
  severity: SHACLSeverity;
  sourceConstraintComponent: string;
  sourceShape: string;
  resultSeverity?: string;
}

export type SHACLSeverity = 'Violation' | 'Warning' | 'Info';

export interface SHACLReport {
  profile: ValidationProfile;
  conforms: boolean;
  totalViolations: number;
  violations: SHACLViolation[];
  warnings: SHACLViolation[];
  infos: SHACLViolation[];
  timestamp: string;
  reportDataset?: any;
}

// Extended Validation Result with SHACL
export interface ExtendedValidationResult extends ValidationResult {
  shaclReport?: SHACLReport;
}
