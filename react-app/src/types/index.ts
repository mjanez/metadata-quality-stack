// RDF Format types
export type RDFFormat = 'turtle' | 'rdfxml' | 'jsonld' | 'ntriples' | 'auto';

// Validation profile types  
export type ValidationProfile = 'dcat_ap' | 'dcat_ap_es' | 'nti_risp';

// Tab system types
export interface ValidationTab {
  id: string;
  name: string;
  result: ExtendedValidationResult | null;
  isValidating: boolean;
  error: string | null;
  createdAt: Date;
}

export interface TabState {
  tabs: ValidationTab[];
  activeTabId: string | null;
  nextTabId: number;
}

// Profile Version type
export interface ProfileVersion {
  name: string;
  maxScore: number;
  icon?: string;
  url?: string;
  sampleUrl?: string;
  shaclFiles: string[];
  dimensions: {
    [dimension: string]: {
      maxScore: number;
    };
  };
}

// MQA Configuration types
export interface MQAConfig {
  profiles: {
    [key in ValidationProfile]: {
      versions: {
        [version: string]: ProfileVersion;
      };
      defaultVersion: string;
    };
  };
  metricsByProfile: {
    [key in ValidationProfile]: {
      [dimension: string]: MQAMetricConfig[];
    };
  };
  evaluationSettings?: {
    useProportionalEvaluation: boolean;
    minimumEntityThreshold: number;
    description?: string;
  };
  sparqlConfig?: {
    defaultEndpoint: string;
    queries: {
      [profile: string]: {
        id: string;
        name: string;
        description: string;
        query: string;
        parameters: Array<{
          name: string;
          label: string;
          placeholder: string;
          required: boolean;
          defaultValue?: string;
        }>;
      }[];
    };
  };
  app_info?: {
    name: string;
    version: string;
    repository: string;
    url: string;
    see_also?: string;
    description: string;
  };
}

export interface MQAMetricConfig {
  id: string;
  weight: number;
  property: string;
}

// Profile Selection with Version
export interface ProfileSelection {
  profile: ValidationProfile;
  version: string;
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
  // Proportional evaluation fields
  entityType?: 'Dataset' | 'Distribution' | 'Catalog' | 'Multi';
  totalEntities?: number;
  compliantEntities?: number;
  compliancePercentage?: number;
  // Multi-entity specific fields
  datasetEntities?: { total: number; compliant: number };
  distributionEntities?: { total: number; compliant: number };
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
  source: 'url' | 'text' | 'sparql';
  url?: string;
  sparqlEndpoint?: string;
  sparqlQuery?: string;
  sparqlParameters?: { [key: string]: string };
}

// Vocabulary types
export interface VocabularyItem {
  uri: string;      // Primary URI identifier (from JSONL files)
  value?: string;   // Legacy support
  label?: string;   // Human-readable label
  category?: string;
}

// RDF Validation types
export interface RDFValidationResult {
  valid: boolean;
  error?: string;
  lineNumber?: number;
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
  foafPage?: string; // URL with additional information about the rule
  entityContext?: string; // Entity type (e.g., dcat:Dataset, dcat:Distribution) that the constraint applies to
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
