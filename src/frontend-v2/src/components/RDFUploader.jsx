import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { validationStore } from '../lib/stores';
import { validateData } from '../lib/shacl-validator';

export default function RDFUploader() {
  const [fileContent, setFileContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState('turtle');
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      setFileContent(e.target.result);
    };
    reader.readAsText(file);
  };
  
  const handleValidate = async () => {
    if (!fileContent) return;
    
    setIsLoading(true);
    try {
      const report = await validateData(fileContent, format);
      validationStore.set({ report, isValidated: true });
    } catch (error) {
      console.error('Validation error:', error);
      validationStore.set({ error: error.message, isValidated: false });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="uploader">
      <h2>Upload RDF Data</h2>
      <div className="format-selector">
        <label>
          Format:
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="turtle">Turtle (TTL)</option>
            <option value="rdf-xml">RDF/XML</option>
            <option value="json-ld">JSON-LD</option>
            <option value="n-triples">N-Triples</option>
          </select>
        </label>
      </div>
      <div className="file-input">
        <input type="file" accept=".ttl,.rdf,.xml,.jsonld,.json,.nt" onChange={handleFileUpload} />
      </div>
      {fileContent && (
        <button 
          className="validate-button" 
          onClick={handleValidate}
          disabled={isLoading}
        >
          {isLoading ? 'Validating...' : 'Validate'}
        </button>
      )}
    </div>
  );
}