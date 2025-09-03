import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationProfile } from '../types';
import { SPARQLService, PredefinedSPARQLQuery, SPARQLQueryParams } from '../services/SPARQLService';

interface PredefinedQueriesComponentProps {
  profile: ValidationProfile;
  onQuerySelect: (query: string, endpoint: string, parameters: SPARQLQueryParams) => void;
}

const PredefinedQueriesComponent: React.FC<PredefinedQueriesComponentProps> = ({
  profile,
  onQuerySelect
}) => {
  const { t } = useTranslation();
  const [sparqlService] = useState(() => SPARQLService.getInstance());
  const [availableQueries, setAvailableQueries] = useState<PredefinedSPARQLQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<PredefinedSPARQLQuery | null>(null);
  const [parameters, setParameters] = useState<SPARQLQueryParams>({});
  const [loading, setLoading] = useState(false);

  const [selectedQueryId, setSelectedQueryId] = useState<string>('');

  useEffect(() => {
    // Load predefined queries for the current profile
    const loadQueries = async () => {
      setLoading(true);
      try {
        const queries = await sparqlService.getPredefinedQueries(profile);
        setAvailableQueries(queries);
      } catch (error) {
        console.error('Error loading predefined queries:', error);
        setAvailableQueries([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadQueries();
    
    // Reset selection when profile changes
    setSelectedQuery(null);
    setSelectedQueryId('');
    setParameters({});
  }, [profile, sparqlService]);

  const handleQuerySelection = async (queryId: string) => {
    setSelectedQueryId(queryId);
    
    if (!queryId) {
      setSelectedQuery(null);
      setParameters({});
      return;
    }

    try {
      const query = await sparqlService.getPredefinedQuery(queryId);
      if (query) {
        setSelectedQuery(query);
        
        // Initialize parameters with default values
        const initialParams: SPARQLQueryParams = {};
        query.parameters.forEach(param => {
          initialParams[param.name] = param.defaultValue || '';
        });
        setParameters(initialParams);
        
        // Auto-select the query immediately with processed parameters
        const processedQuery = sparqlService.replaceQueryParameters(query.query, initialParams);
        onQuerySelect(processedQuery, query.endpoint, initialParams);
      }
    } catch (error) {
      console.error('Error loading query:', error);
    }
  };

  const handleParameterChange = (paramName: string, value: string) => {
    const newParams = {
      ...parameters,
      [paramName]: value
    };
    setParameters(newParams);
    
    // Auto-update query when parameters change
    if (selectedQuery) {
      const processedQuery = sparqlService.replaceQueryParameters(selectedQuery.query, newParams);
      onQuerySelect(processedQuery, selectedQuery.endpoint, newParams);
    }
  };

  if (loading) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-hourglass-split me-2"></i>
        {t('sparql.loadingQueries')}
      </div>
    );
  }

  if (availableQueries.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        {t('sparql.noQueriesAvailable', { profile: t(`profiles.${profile}`) })}
      </div>
    );
  }

  return (
    <div className="predefined-queries">
      <h6 className="mb-3">
        <i className="bi bi-collection me-2"></i>
        {t('sparql.predefinedQueries')}
      </h6>

      {/* Query Selection */}
      <div className="mb-3">
        <label htmlFor="querySelect" className="form-label">
          {t('sparql.selectQuery')}
        </label>
        <select
          id="querySelect"
          className="form-select"
          value={selectedQueryId}
          onChange={(e) => handleQuerySelection(e.target.value)}
          disabled={loading}
        >
          <option value="">{t('sparql.selectQueryHelp')}</option>
          {availableQueries.map((query, index) => (
            <option key={`${query.profile}-${query.id}-${index}`} value={query.id}>
              {query.name}
            </option>
          ))}
        </select>
        {selectedQuery && (
          <div className="form-text">
            <i className="bi bi-info-circle me-1"></i>
            {selectedQuery.description}
          </div>
        )}
      </div>

      {/* Parameters */}
      {selectedQuery && selectedQuery.parameters.length > 0 && (
        <div className="mb-3">
          <h6 className="mb-2">
            <i className="bi bi-sliders me-2"></i>
            {t('sparql.parameters')}
          </h6>
          {selectedQuery.parameters.map(param => (
            <div key={param.name} className="mb-2">
              <label htmlFor={`param-${param.name}`} className="form-label">
                {param.label}
                {param.required && <span className="text-danger ms-1">*</span>}
              </label>
              <input
                type="text"
                id={`param-${param.name}`}
                className="form-control"
                placeholder={param.placeholder}
                value={parameters[param.name] || ''}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                required={param.required}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredefinedQueriesComponent;