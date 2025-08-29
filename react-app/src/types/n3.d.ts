declare module 'n3' {
  export interface Quad {
    subject: any;
    predicate: any;
    object: any;
    graph?: any;
  }

  export class Parser {
    constructor(options?: any);
    parse(input: string, callback: (error: Error | null, quad: Quad | null, prefixes?: any) => void): void;
  }

  export class Writer {
    constructor(options?: any);
    addQuad(quad: Quad): void;
    addQuads(quads: Quad[]): void;
    end(callback: (error: Error | null, result: string) => void): void;
  }

  export class Store {
    constructor();
    addQuad(quad: Quad): void;
    getQuads(): Quad[];
    size: number;
  }

  export const DataFactory: {
    namedNode(value: string): any;
    literal(value: string, languageOrDatatype?: string | any): any;
    blankNode(value?: string): any;
    quad(subject: any, predicate: any, object: any, graph?: any): Quad;
  };
}
