declare module 'rdfxml-streaming-parser' {
  export class RdfXmlParser {
    constructor(options?: { baseIRI?: string });
    on(event: 'data', listener: (quad: any) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    write(data: string): void;
    end(): void;
  }
}
