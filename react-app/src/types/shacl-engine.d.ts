// Type declarations for shacl-engine and RDF/JS packages

declare module 'shacl-engine' {
  export interface ValidationOptions {
    factory?: any;
    validations?: any;
    debug?: boolean;
    details?: boolean;
  }

  export interface ValidationResult {
    conforms: boolean;
    results?: any[];
    text?: string;
    dataset?: any;
  }

  export class Validator {
    constructor(shapes: any, options?: ValidationOptions);
    validate(data: { dataset: any }): Promise<ValidationResult>;
  }
}

declare module 'shacl-engine/sparql.js' {
  export const validations: any;
}

declare module '@rdfjs/data-model' {
  const dataModel: any;
  export default dataModel;
}

declare module '@rdfjs/dataset' {
  interface Dataset {
    add(quad: any): Dataset;
    delete(quad: any): Dataset;
    has(quad: any): boolean;
    match(subject?: any, predicate?: any, object?: any, graph?: any): Dataset;
    [Symbol.iterator](): Iterator<any>;
  }

  function dataset(): Dataset;
  
  const rdfDataset: {
    dataset: typeof dataset;
  };
  
  export default rdfDataset;
}