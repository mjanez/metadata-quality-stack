"""
Metadata validation module.
This module provides functions for validating metadata against the MQA methodology
using RDFlib and pyshacl.
"""
import logging
import ssl
import csv
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Callable, Set, Union
from urllib.parse import quote
from abc import ABC, abstractmethod
import requests
import rdflib
from rdflib import Graph, URIRef, Literal, BNode
from rdflib.namespace import RDF, RDFS, DCTERMS, DCAT, XSD
from pyshacl import validate
from io import BytesIO, StringIO

from .helpers import check_url_status
from .shacl_updater import update_shacl_files
from .converters import get_metric_label
from .models import Rating, DimensionType
from .config import (
    RATING_THRESHOLDS, MAX_SCORES, SHACLLevel,
    DCAT_AP_SHACL_FILES, DCAT_AP_ES_SHACL_FILES, DCAT_AP_ES_HVD_SHACL_FILES, NTI_RISP_SHACL_FILES,
    DCAT_AP_SHAPES_URL, DCAT_AP_ES_SHAPES_URL, NTI_RISP_SHAPES_URL, DEFAULT_METRICS, SSL_VERIFY, ALLOW_INSECURE_URLS, MQA_VOCABS, METRICS_BY_PROFILE
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

VOCAB_CACHE = {}

# Calcular la puntuación máxima posible para cada perfil
def calculate_max_score(metrics):
    """Calculate maximum possible score from a list of metrics."""
    max_score = 0
    for metric in metrics:
        max_score += metric["weight"]
    return max_score

MAX_SCORES = {
    "dcat_ap": 405,  # Valor predefinido para DCAT-AP
    "dcat_ap_es": 405,  # Valor predefinido para DCAT-AP-ES
    "nti_risp": calculate_max_score(METRICS_BY_PROFILE["nti_risp"])
}

# Umbrales de puntuación por perfil
RATING_THRESHOLDS_BY_PROFILE = {
    "dcat_ap": {
        "excellent": 351,
        "good": 221,
        "sufficient": 121
    },
    "dcat_ap_es": {
        "excellent": 351,
        "good": 221,
        "sufficient": 121
    },
    "nti_risp": {
        "excellent": int(MAX_SCORES["nti_risp"] * 0.8),  # Calculando dinámicamente para NTI-RISP
        "good": int(MAX_SCORES["nti_risp"] * 0.6),
        "sufficient": int(MAX_SCORES["nti_risp"] * 0.4)
    }
}

# Abstract checker class for implementing metric checks
class MetricChecker(ABC):
    """Abstract base class for implementing metric checks."""
    
    @abstractmethod
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        """
        Check the metric against the graph.
        
        Args:
            g: RDFlib Graph
            resources: List of resources to check
            context: Optional additional context
            
        Returns:
            Tuple of (count, population)
        """
        pass

# Registry for metric checkers
class MetricRegistry:
    """
    Registry for metric definitions and their associated checkers.
    This allows for dynamic registration and execution of metric checks.
    """
    
    def __init__(self):
        """Initialize the registry."""
        self.metrics = {}
        self.checkers = {}
    
    def register_metric(self, metric_id: str, dimension: str, weight: int) -> None:
        """
        Register a metric definition.
        
        Args:
            metric_id: Unique identifier for the metric
            dimension: Dimension the metric belongs to
            weight: Weight of the metric in the overall score
        """
        self.metrics[metric_id] = {
            "id": metric_id,
            "dimension": dimension,
            "weight": weight
        }
    
    def register_checker(self, metric_id: str, checker: MetricChecker) -> None:
        """
        Register a checker for a metric.
        
        Args:
            metric_id: ID of the metric
            checker: Checker implementation for the metric
        """
        if metric_id not in self.metrics:
            raise ValueError(f"Metric {metric_id} not registered")
        
        self.checkers[metric_id] = checker
    
    def get_metric(self, metric_id: str) -> Dict[str, Any]:
        """
        Get a metric definition.
        
        Args:
            metric_id: ID of the metric
        
        Returns:
            Metric definition dictionary
        """
        return self.metrics.get(metric_id)
    
    def get_checker(self, metric_id: str) -> Optional[MetricChecker]:
        """
        Get the checker for a metric.
        
        Args:
            metric_id: ID of the metric
        
        Returns:
            Checker for the metric or None if not found
        """
        return self.checkers.get(metric_id)
    
    def get_all_metrics(self) -> List[Dict[str, Any]]:
        """
        Get all registered metrics.
        
        Returns:
            List of metric definitions
        """
        return list(self.metrics.values())

# Global registry instance
registry = MetricRegistry()

# Register all metrics based on MQA methodology from config
def register_standard_metrics(profile="dcat_ap_es"):
    """
    Register metrics based on the selected profile.
    
    Args:
        profile: The profile to use ('dcat_ap', 'dcat_ap_es', 'nti_risp')
    """
    # Limpiar registro previo si existe
    registry.metrics = {}
    
    # Obtener métricas específicas del perfil
    metrics_to_register = METRICS_BY_PROFILE.get(profile, DEFAULT_METRICS)
    
    # Registrar las métricas
    for metric in metrics_to_register:
        registry.register_metric(metric["id"], metric["dimension"], metric["weight"])

# Inicialmente registramos las métricas para DCAT-AP-ES por defecto
register_standard_metrics("dcat_ap_es")

# Metric checker implementations
class PropertyChecker(MetricChecker):
    """Check for the existence of a specific property on resources."""
    
    def __init__(self, property_uri: URIRef):
        """
        Initialize the checker with a property URI.
        
        Args:
            property_uri: The RDF property to check for
        """
        self.property_uri = property_uri
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        """
        Check how many resources have the specified property.
        
        Args:
            g: RDFlib Graph
            resources: Resource URIs to check
            context: Optional additional context
            
        Returns:
            Tuple of (count of resources with property, total resources)
        """
        count = 0
        total = len(resources)
        
        if total == 0:
            return (0, 0)
        
        for res in resources:
            if any(g.triples((res, self.property_uri, None))):
                count += 1
        
        return (count, total)

class EntityTypePropertyChecker(MetricChecker):
    """Check for the existence of a specific property on resources of a specific type."""
    
    def __init__(self, property_uri: URIRef, entity_type: URIRef):
        """
        Initialize the checker with a property URI and entity type.
        
        Args:
            property_uri: The RDF property to check for
            entity_type: The RDF type of entities that should have this property
        """
        self.property_uri = property_uri
        self.entity_type = entity_type
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        """
        Check how many resources of the specified type have the property.
        
        Args:
            g: RDFlib Graph
            resources: Resource URIs to check (filtered by type)
            context: Optional additional context
            
        Returns:
            Tuple of (count of resources with property, total resources of that type)
        """
        # Find all entities of the specified type
        entities_of_type = list(g.subjects(RDF.type, self.entity_type))
        
        total = len(entities_of_type)
        count = 0
        
        if total == 0:
            return (0, 0)
        
        # For each entity of the correct type, check if it has the property
        for entity in entities_of_type:
            if any(g.triples((entity, self.property_uri, None))):
                count += 1
        
        return (count, total)

class MultipleEntityTypesPropertyChecker(MetricChecker):
    """
    Check for the existence of a property on resources of multiple entity types.
    Combina la lógica de EntityTypePropertyChecker para varios tipos a la vez.
    """

    def __init__(self, property_uri: URIRef, entity_types: List[URIRef]):
        """
        Args:
            property_uri: The RDF property a verificar
            entity_types: Lista de tipos RDF a los que se debe aplicar la verificación
        """
        self.property_uri = property_uri
        self.entity_types = entity_types

    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        total = 0
        count = 0
        
        # For each type, obtain its entities and check if they have the property
        for etype in self.entity_types:
            entities_of_type = list(g.subjects(RDF.type, etype))
            total += len(entities_of_type)
            
            for entity in entities_of_type:
                if any(g.triples((entity, self.property_uri, None))):
                    count += 1
        
        return (count, total)

class EntityTypeURLStatusChecker(MetricChecker):
    """Check if URLs in a property return HTTP 200-299 status for specific entity types."""
    
    def __init__(self, property_uri: URIRef, entity_type: URIRef):
        self.property_uri = property_uri
        self.entity_type = entity_type
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        count = 0
        urls_to_check = []
        
        # Initial log
        logger.debug(f"Starting URL validation for property {self.property_uri}")
        
        # We can filter entities based on resources if provided
        if resources and len(resources) > 0:
            entities_of_type = [entity for entity in resources 
                               if (entity, RDF.type, self.entity_type) in g]
        else:
            entities_of_type = list(g.subjects(RDF.type, self.entity_type))
        
        logger.debug(f"Found {len(entities_of_type)} entities of type {self.entity_type}")
        
        # PRIMERO: Recopilar todas las URLs para verificar
        for entity in entities_of_type:
            for _, _, url_obj in g.triples((entity, self.property_uri, None)):
                if isinstance(url_obj, URIRef):
                    url = str(url_obj)
                    urls_to_check.append((entity, url))
                    logger.debug(f"Found URL to check: {url} for entity {entity}")
                elif isinstance(url_obj, Literal):
                    url = str(url_obj)
                    urls_to_check.append((entity, url))
                    logger.debug(f"Found URL literal to check: {url} for entity {entity}")
        
        total = len(urls_to_check)
        logger.debug(f"Total URLs to validate: {total}")
        
        if total == 0:
            logger.debug(f"No URLs found to validate with property {self.property_uri}")
            return (0, 0)
        
        # Get settings from context
        timeout = context.get('timeout', 5) if context else 5
        verify_ssl = not ALLOW_INSECURE_URLS if ALLOW_INSECURE_URLS else SSL_VERIFY
        
        # SEGUNDO: Verificar cada URL
        for entity, url in urls_to_check:
            try:
                # Try to normalize URL if it's not properly formatted
                if not url.startswith(('http://', 'https://')):
                    url = f"http://{url}"
                    logger.debug(f"Normalized URL: {url}")
                
                # First try HEAD request which is faster
                try:
                    logger.debug(f"Attempting HEAD request for {url}")
                    response = requests.head(url, timeout=timeout, allow_redirects=True, verify=verify_ssl)
                    if 200 <= response.status_code < 300:
                        count += 1
                        logger.debug(f"✅ Valid URL (HEAD) {url} - Status: {response.status_code}")
                        continue
                    else:
                        logger.debug(f"❌ HEAD request failed for {url} - Status: {response.status_code}")
                except Exception as e:
                    logger.debug(f"HEAD request failed for {url}: {str(e)}")
                    # If HEAD fails, try GET
                    pass
                
                # If HEAD didn't work or status code wasn't 2xx, try GET
                try:
                    logger.debug(f"Attempting GET request for {url}")
                    response = requests.get(url, timeout=timeout, allow_redirects=True, verify=verify_ssl)
                    if 200 <= response.status_code < 300:
                        count += 1
                        logger.debug(f"✅ Valid URL (GET) {url} - Status: {response.status_code}")
                    else:
                        logger.debug(f"❌ GET request failed for {url} - Status: {response.status_code}")
                except Exception as e:
                    logger.debug(f"GET request failed for {url}: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error validating URL {url} for entity {entity}: {str(e)}")
    
        logger.debug(f"Validation completed: {count}/{total} valid URLs")
        return (count, total)

class VocabularyComplianceChecker(MetricChecker):
    """Check if property values come from a CSV-based vocabulary."""

    def __init__(
        self,
        property_uris: List[URIRef],
        csv_path: str,
        compare_column: str = None,
    ):
        """
        Initialize with property URIs and path to CSV vocabulary file.
        If compare_column is not provided, the first column in the CSV is used.
        """
        self.property_uris = property_uris
        self.csv_path = csv_path
        self.compare_column = compare_column

        if self.csv_path not in VOCAB_CACHE:
            allowed_uris = set()
            with open(self.csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                # Detect the first column if not provided compare_column
                if not self.compare_column and reader.fieldnames:
                    self.compare_column = reader.fieldnames[0]

                for row in reader:
                    if self.compare_column in row:
                        allowed_uris.add(row[self.compare_column])
            VOCAB_CACHE[self.csv_path] = allowed_uris

        self.allowed_uris = VOCAB_CACHE[self.csv_path]

    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        total_values = 0
        compliant_count = 0

        for res in resources:
            for prop in self.property_uris:
                for _, _, value in g.triples((res, prop, None)):
                    total_values += 1
                    if isinstance(value, URIRef):
                        if str(value) in self.allowed_uris:
                            compliant_count += 1

        return (compliant_count, total_values)

class SHACLComplianceChecker(MetricChecker):
    """Check compliance with SHACL shapes."""
    
    def __init__(self, shacl_files: List[str], fallback_url: str = None, auto_update: bool = True):
        """
        Initialize the checker with SHACL shapes files.
        
        Args:
            shacl_files: List of paths to SHACL shapes files
            fallback_url: URL to use if local files are not available
            auto_update: Whether to automatically update SHACL files
        """
        self.shacl_files = shacl_files
        self.fallback_url = fallback_url
        self.auto_update = auto_update
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        """
        Check SHACL compliance. The entire graph either conforms or it doesn't.
        
        Args:
            g: RDFlib Graph
            resources: Resource URIs (not used for SHACL validation)
            context: Optional additional context
            
        Returns:
            Tuple of (1 or 0 for compliance, 1 for the total)
        """
        # Update SHACL files if auto-update is enabled
        if self.auto_update:
            try:
                update_shacl_files()
            except Exception as e:
                logger.warning(f"Failed to update SHACL files: {e}")
        
        try:
            # Load all SHACL shapes into a single graph
            shapes_graph = Graph()
            
            # Try to load local files first
            local_files_loaded = False
            
            for shacl_file in self.shacl_files:
                if os.path.exists(shacl_file):
                    try:
                        shapes_graph.parse(shacl_file, format="turtle")
                        logger.info(f"Successfully loaded SHACL shapes from {shacl_file}")
                        local_files_loaded = True
                    except Exception as e:
                        logger.warning(f"Error loading SHACL shapes from {shacl_file}: {str(e)}")
            
            # If local files could not be loaded, try the fallback URL
            if not local_files_loaded and self.fallback_url:
                try:
                    shapes_graph.parse(self.fallback_url, format="turtle")
                    logger.info(f"Successfully loaded SHACL shapes from fallback URL {self.fallback_url}")
                    local_files_loaded = True
                except Exception as e:
                    logger.error(f"Error loading SHACL shapes from fallback URL {self.fallback_url}: {str(e)}")
            
            if not local_files_loaded:
                logger.error("Could not load any SHACL shapes")
                return (0, 1)  # No conformidad si no se pueden cargar las formas SHACL
            
            # Perform validation
            try:
                conforms, results_graph, results_text = validate(g, shacl_graph=shapes_graph)
                logger.info(f"SHACL validation result: {'Conforms' if conforms else 'Does not conform'}")
                
                # Binary compliance - 1 if conforms, 0 if not
                return (1, 1) if conforms else (0, 1)
                        
            except Exception as e:
                if "global flags not at the start of the expression" in str(e):
                    logger.warning(f"SHACL validation skipped due to regex format issues in SHACL shapes: {str(e)}")
                    return (0, 1)  # No conformidad para errores de expresiones regulares
                else:
                    logger.error(f"Error during SHACL validation: {str(e)}")
                    return (0, 1)  # No conformidad para otros errores
            
        except Exception as e:
            logger.error(f"Error in SHACL compliance check: {str(e)}")
            return (0, 1)  # No conformidad para errores generales

class MultiLevelSHACLComplianceChecker(MetricChecker):
    """Check compliance with multiple levels of SHACL validation."""
    
    def __init__(self, shacl_files_by_level: Dict[int, List[str]], 
                 fallback_url: str = None, level: int = SHACLLevel.LEVEL_1):
        """
        Initialize the checker with SHACL shapes files by level.
        
        Args:
            shacl_files_by_level: Dictionary mapping levels to lists of SHACL files
            fallback_url: URL to use if local files are not available
            level: The validation level to use (1-3)
        """
        self.shacl_files_by_level = shacl_files_by_level
        self.fallback_url = fallback_url
        self.level = level
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        """
        Check SHACL compliance at the specified level.
        
        Args:
            g: RDFlib Graph
            resources: Resource URIs (not used for SHACL validation)
            context: Optional additional context
            
        Returns:
            Tuple of (1 or 0 for compliance, 1 for the total)
        """
        # Get the validation level from context if provided
        level = context.get("shacl_level", self.level) if context else self.level
        
        # Get the SHACL files for this level
        shacl_files = self.shacl_files_by_level.get(level, [])
        
        # Create a standard SHACL checker with these files
        checker = SHACLComplianceChecker(
            shacl_files=shacl_files,
            fallback_url=self.fallback_url
        )
        
        # Run the check
        return checker.check(g, resources, context)

class VocabularyLabelComplianceChecker_NTI(MetricChecker):
    """
    Check if property format labels comply with a CSV-based vocabulary using the second column.
    Specifically designed for NTI-RISP where format values often use rdfs:label.
    """

    def __init__(
        self,
        property_uris: List[URIRef],
        csv_path: str,
        label_column: str = "label_es",  # Segundo columna que contiene las etiquetas
        label_property: URIRef = RDFS.label
    ):
        """
        Initialize with property URIs, path to CSV vocabulary file, and label column.
        
        Args:
            property_uris: The RDF properties to check
            csv_path: Path to the CSV file containing allowed values
            label_column: Column in CSV with labels to compare against
            label_property: Property to get the label from (defaults to rdfs:label)
        """
        self.property_uris = property_uris
        self.csv_path = csv_path
        self.label_column = label_column
        self.label_property = label_property
        self.allowed_labels = set()  # Will store label values

        # Load allowed labels from CSV
        cache_key = f"{self.csv_path}_{self.label_column}"
        if cache_key not in VOCAB_CACHE:
            allowed_labels = set()
            with open(self.csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                
                # Get the allowed labels from the specified column
                for row in reader:
                    if self.label_column in row and row[self.label_column]:
                        # Add label values (lowercased for case-insensitive matching)
                        allowed_labels.add(row[self.label_column].lower())
                
            VOCAB_CACHE[cache_key] = allowed_labels
            
        self.allowed_labels = VOCAB_CACHE[cache_key]
        logger.debug(f"Loaded {len(self.allowed_labels)} allowed labels for NTI-RISP format checking")

    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        total_values = 0
        compliant_count = 0

        for res in resources:
            for prop in self.property_uris:
                for _, _, format_value in g.triples((res, prop, None)):
                    total_values += 1
                    
                    # Case 1: Check if it's a URI and has a label
                    if isinstance(format_value, URIRef):
                        has_matching_label = False
                        for _, _, label in g.triples((format_value, self.label_property, None)):
                            label_text = str(label).lower()
                            if label_text in self.allowed_labels:
                                compliant_count += 1
                                has_matching_label = True
                                break
                        
                        # If no label was found, try the URI itself
                        if not has_matching_label:
                            uri_text = str(format_value).lower()
                            if any(label in uri_text for label in self.allowed_labels):
                                compliant_count += 1
                    
                    # Case 2: Check if it's a BNode with a label
                    elif isinstance(format_value, BNode):
                        has_matching_label = False
                        for _, _, label in g.triples((format_value, self.label_property, None)):
                            label_text = str(label).lower()
                            if label_text in self.allowed_labels:
                                compliant_count += 1
                                has_matching_label = True
                                break
                    
                    # Case 3: Check if it's a literal that matches directly
                    elif isinstance(format_value, Literal):
                        literal_text = str(format_value).lower()
                        if literal_text in self.allowed_labels:
                            compliant_count += 1

        return (compliant_count, total_values)

# Register all checkers for metrics
CHECKER_DEFINITIONS = {
    # Findability checkers
    "dcat_keyword": lambda: EntityTypePropertyChecker(DCAT.keyword, DCAT.Dataset),
    "dcat_theme": lambda: EntityTypePropertyChecker(DCAT.theme, DCAT.Dataset),
    "dct_spatial": lambda: EntityTypePropertyChecker(DCTERMS.spatial, DCAT.Dataset),
    "dct_temporal": lambda: EntityTypePropertyChecker(DCTERMS.temporal, DCAT.Dataset),
    
    # Accessibility checkers
    "dcat_accessURL_status": lambda: EntityTypeURLStatusChecker(DCAT.accessURL, DCAT.Distribution),
    "dcat_downloadURL": lambda: EntityTypePropertyChecker(DCAT.downloadURL, DCAT.Distribution),
    "dcat_downloadURL_status": lambda: EntityTypeURLStatusChecker(DCAT.downloadURL, DCAT.Distribution),
    
    # Interoperability checkers
    "dct_format": lambda: EntityTypePropertyChecker(DCTERMS.format, DCAT.Distribution),
    "dcat_mediaType": lambda: EntityTypePropertyChecker(DCAT.mediaType, DCAT.Distribution),
    "dct_format_vocabulary": lambda: VocabularyComplianceChecker([DCTERMS.format], MQA_VOCABS['file_types']),
    "dct_mediaType_vocabulary": lambda: VocabularyComplianceChecker([DCAT.mediaType], MQA_VOCABS['media_types']),
    "dct_format_nonproprietary": lambda: VocabularyComplianceChecker([DCTERMS.format], MQA_VOCABS['non_proprietary']),
    "dct_format_machinereadable": lambda: VocabularyComplianceChecker([DCTERMS.format], MQA_VOCABS['machine_readable']),
    
    # SHACL compliance checkers
    "dcat_ap_compliance": lambda: MultiLevelSHACLComplianceChecker(
                            DCAT_AP_SHACL_FILES,
                            fallback_url=DCAT_AP_SHAPES_URL,
                            level=SHACLLevel.LEVEL_2),
    "dcat_ap_es_compliance": lambda: SHACLComplianceChecker(
                            DCAT_AP_ES_SHACL_FILES,
                            fallback_url=DCAT_AP_ES_SHAPES_URL),
    "nti_risp_compliance": lambda: SHACLComplianceChecker(
                            NTI_RISP_SHACL_FILES,
                            fallback_url=NTI_RISP_SHAPES_URL),
    
    # Reusability checkers
    "dct_license": lambda: EntityTypePropertyChecker(DCTERMS.license, DCAT.Distribution),
    "dct_license_vocabulary": lambda: VocabularyComplianceChecker([DCTERMS.license], MQA_VOCABS['license']),
    "dct_accessRights": lambda: EntityTypePropertyChecker(DCTERMS.accessRights, DCAT.Dataset),
    "dct_accessRights_vocabulary": lambda: VocabularyComplianceChecker([DCTERMS.accessRights], MQA_VOCABS['access_rights']),
    "dcat_contactPoint": lambda: EntityTypePropertyChecker(DCAT.contactPoint, DCAT.Dataset),
    "dct_publisher": lambda: EntityTypePropertyChecker(DCTERMS.publisher, DCAT.Dataset),
    
    # Contextuality checkers
    "dct_rights": lambda: EntityTypePropertyChecker(DCTERMS.rights, DCAT.Distribution),
    "dcat_byteSize": lambda: EntityTypePropertyChecker(DCAT.byteSize, DCAT.Distribution),
    "dct_issued": lambda: MultipleEntityTypesPropertyChecker(DCTERMS.issued, [DCAT.Dataset, DCAT.Distribution]),
    "dct_modified": lambda: MultipleEntityTypesPropertyChecker(DCTERMS.modified, [DCAT.Dataset, DCAT.Distribution]),
    
    # NTI-RISP specific checkers
    "dct_format_vocabulary_nti_risp": lambda: VocabularyLabelComplianceChecker_NTI(
        [DCTERMS.format], MQA_VOCABS['file_types'], label_column="label_es"
    )    
}

# Nueva función para registrar checkers específicos por perfil
def register_standard_checkers(profile="dcat_ap_es"):
    """
    Registra los checkers correspondientes al perfil especificado.
    
    Args:
        profile: El perfil a utilizar ('dcat_ap', 'dcat_ap_es', 'nti_risp')
    """
    # Obtener métricas específicas del perfil
    metrics_to_register = METRICS_BY_PROFILE.get(profile, DEFAULT_METRICS)
    
    # Limpiar registro previo de checkers
    registry.checkers = {}
    
    # Para cada métrica en el perfil, registrar su checker correspondiente
    for metric in metrics_to_register:
        metric_id = metric["id"]
        
        # Obtener el constructor del checker para esta métrica
        checker_constructor = CHECKER_DEFINITIONS.get(metric_id)
        if checker_constructor:
            try:
                # Crear y registrar el checker
                registry.register_checker(metric_id, checker_constructor())
                logger.debug(f"Registered checker for metric {metric_id}")
            except Exception as e:
                logger.error(f"Error registering checker for metric {metric_id}: {str(e)}")
        else:
            logger.warning(f"No checker defined for metric {metric_id}")

def validate_metadata_quality(url: str, model: str = "dcat_ap_es", shacl_level: int = SHACLLevel.LEVEL_2) -> Dict[str, Any]:
    """
    Validate the metadata quality of a catalog at the given URL.
    
    Args:
        url: URL to the catalog in RDF or TTL format
        model: Model to validate against ('dcat_ap', 'dcat_ap_es', 'nti_risp')
        shacl_level: SHACL validation level (1-3)
        
    Returns:
        A quality report dictionary
        
    Raises:
        Exception: On validation errors
    """
    logger.info(f"Starting validation for URL: {url} using model: {model}")
    
    try:
        # Load the RDF graph
        g = load_graph(url)
        logger.info(f"Loaded graph with {len(g)} triples")
        
        # Registrar métricas específicas para el modelo seleccionado
        register_standard_metrics(model)
        register_standard_checkers(model) 
        
        # Create a context with model-specific settings
        context = {
            "model": model,
            "shacl_level": shacl_level
        }
        
        # Calculate metrics
        metrics_results = calculate_metrics(g, shacl_level, model=model)
        
        # Calculate dimension scores
        dimension_scores = calculate_dimension_scores(metrics_results)
        
        # Calculate total score
        total_score = sum(dimension_scores.values())
        
        # Determine rating
        rating = determine_rating(total_score, model)
        
        # Create report
        report = {
            "source": url,
            "created": datetime.now().strftime("%Y-%m-%d"),
            "model": model,
            "totalScore": total_score,
            "rating": rating,
            "dimensions": dimension_scores,
            "metrics": metrics_results
        }
        
        logger.info(f"Validation completed for {url} using model {model}. Score: {total_score}, Rating: {rating}")
        return report
        
    except Exception as e:
        logger.error(f"Error validating {url}: {str(e)}")
        raise Exception(f"Failed to validate metadata: {str(e)}")
def load_graph(url: str) -> Graph:
    """
    Load an RDF graph from a URL.
    
    Args:
        url: URL to the RDF data
        
    Returns:
        RDFlib Graph
        
    Raises:
        Exception: If the URL cannot be accessed or parsed
    """
    g = Graph()
    
    try:
        # Determine format based on content type or file extension
        format_guess = None
        
        if url.endswith(".rdf") or url.endswith(".xml"):
            format_guess = "xml"
        elif url.endswith(".ttl"):
            format_guess = "turtle"
        elif url.endswith(".n3"):
            format_guess = "n3"
        elif url.endswith(".jsonld"):
            format_guess = "json-ld"
        
        # Make a HEAD request to get content-type if format wasn't determined by extension
        verify_ssl = not ALLOW_INSECURE_URLS if ALLOW_INSECURE_URLS else SSL_VERIFY
        
        if not format_guess:
            try:
                head_response = requests.head(url, verify=verify_ssl, timeout=10)
                content_type = head_response.headers.get('content-type', '')
                
                if 'xml' in content_type:
                    format_guess = "xml"
                elif 'turtle' in content_type or 'ttl' in content_type:
                    format_guess = "turtle"
                elif 'n3' in content_type:
                    format_guess = "n3"
                elif 'json' in content_type:
                    format_guess = "json-ld"
            except Exception as e:
                logger.warning(f"Error determining content type: {str(e)}")
        
        # Default to XML format if still not determined
        if not format_guess:
            format_guess = "xml"
            
        logger.info(f"Parsing RDF with format: {format_guess}")
        
        try:
            # Usar un contexto SSL personalizado cuando se permite URLs inseguras
            if not verify_ssl:
                # Desactivar completamente la verificación SSL para RDFlib
                import urllib.request
                ssl_ctx = ssl._create_unverified_context()
                opener = urllib.request.build_opener(
                    urllib.request.HTTPSHandler(context=ssl_ctx)
                )
                urllib.request.install_opener(opener)
                
                # Parse the URL without SSL verification
                g.parse(location=url, format=format_guess, publicID=url)
            else:
                # Parse with standard SSL verification
                g.parse(location=url, format=format_guess, publicID=url)
                
        except Exception as parse_error:
            logger.warning(f"Direct parsing failed: {str(parse_error)}, trying manual request")
            # If direct parsing fails, try with manual request
            response = requests.get(url, verify=verify_ssl, timeout=10)
            response.raise_for_status()
            
            # Try to parse the content directly
            g.parse(data=response.content, format=format_guess, publicID=url)
        
        logger.info(f"Successfully loaded graph with {len(g)} triples from {url}")
        return g
        
    except Exception as e:
        logger.error(f"Error loading graph from {url}: {str(e)}")
        raise Exception(f"Could not load RDF data from {url}: {str(e)}")

def calculate_metrics(g: Graph, shacl_level: int = SHACLLevel.LEVEL_2, model: str = "dcat_ap") -> List[Dict[str, Any]]:
    """
    Calculate all metrics for the graph using the registry.
    
    Args:
        g: RDFlib Graph
        shacl_level: SHACL validation level (1-3)
        model: Model to validate against ('dcat_ap', 'dcat_ap_es', 'nti_risp')
        
    Returns:
        List of metric results
    """
    results = []
    
    # Count dataset and distribution resources
    datasets = list(g.subjects(RDF.type, DCAT.Dataset))
    distributions = list(g.subjects(RDF.type, DCAT.Distribution))
    
    logger.info(f"Found {len(datasets)} datasets and {len(distributions)} distributions")
    
    context = {
        "shacl_level": shacl_level,
        "model": model
    }
    
    all_metrics = registry.get_all_metrics()
    compliance_included = False
    
    for metric in all_metrics:
        metric_id = metric["id"]
        dimension = metric["dimension"]
        weight = metric["weight"]
        
        # Manejar los métricos de compliance según el modelo seleccionado
        if metric_id.endswith("_compliance"):
            if compliance_included:
                continue
                
            if (model == "dcat_ap" and metric_id == "dcat_ap_compliance") or \
               (model == "dcat_ap_es" and metric_id == "dcat_ap_es_compliance") or \
               (model == "nti_risp" and metric_id == "nti_risp_compliance"):
                compliance_included = True
            else:
                continue
        
        checker = registry.get_checker(metric_id)
        
        if checker is None:
            logger.warning(f"No checker found for metric {metric_id}, skipping")
            continue
        
        # Determinar los recursos a verificar según el tipo de métrica
        if metric_id.startswith("dcat_"):
            # Métricas relacionadas con Dataset
            if "Dataset" in str(checker.__class__):
                resources_to_check = datasets
            # Métricas relacionadas con Distribution
            else:
                resources_to_check = distributions
        elif metric_id.startswith("dct_"):
            # Métricas que pueden aplicar a ambos tipos
            if "MultipleEntityTypes" in str(checker.__class__):
                resources_to_check = datasets + distributions
            # Métricas específicas de Dataset
            elif "Dataset" in str(checker.__class__):
                resources_to_check = datasets
            # Métricas específicas de Distribution
            else:
                resources_to_check = distributions
        else:
            # Para otros tipos de métricas, usar todos los recursos
            resources_to_check = datasets + distributions
        
        try:
            count, population = checker.check(g, resources_to_check, context)
        except Exception as e:
            logger.error(f"Error checking metric {metric_id}: {str(e)}")
            count, population = 0, len(resources_to_check) if resources_to_check else 1
        
        percentage = count / population if population > 0 else 0
        points = percentage * weight
        
        result = {
            "id": metric_id,
            "dimension": dimension,
            "count": count,
            "population": population,
            "percentage": percentage,
            "points": points,
            "weight": weight,
            "label_en": get_metric_label(metric_id, "en"),
            "label_es": get_metric_label(metric_id, "es")
        }
        
        results.append(result)
    
    return results

def calculate_dimension_scores(metrics: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Calculate scores for each dimension.
    
    Args:
        metrics: List of metric results
        
    Returns:
        Dictionary of dimension scores
    """
    dimension_scores = {
        DimensionType.FINDABILITY: 0,
        DimensionType.ACCESSIBILITY: 0,
        DimensionType.INTEROPERABILITY: 0,
        DimensionType.REUSABILITY: 0,
        DimensionType.CONTEXTUALITY: 0
    }
    
    # Sum points for each dimension
    for metric in metrics:
        dimension = metric["dimension"]
        points = metric["points"]
        dimension_scores[dimension] += points
    
    # Round to integers
    for dim in dimension_scores:
        dimension_scores[dim] = round(dimension_scores[dim])
    
    return dimension_scores

def determine_rating(total_score: int, model: str = "dcat_ap_es") -> Rating:
    """
    Determine the quality rating based on the total score.
    
    Args:
        total_score: The total quality score
        model: The model used for validation
        
    Returns:
        The quality rating
    """
    # Usar los umbrales específicos del perfil
    thresholds = RATING_THRESHOLDS_BY_PROFILE.get(model, RATING_THRESHOLDS)
    
    if total_score >= thresholds["excellent"]:
        return Rating.EXCELLENT
    elif total_score >= thresholds["good"]:
        return Rating.GOOD
    elif total_score >= thresholds["sufficient"]:
        return Rating.SUFFICIENT
    else:
        return Rating.BAD
    
def validate_metadata_from_content(content: str, content_type: str, model: str = "dcat_ap_es", shacl_level: int = SHACLLevel.LEVEL_2) -> Dict[str, Any]:
    """
    Validate the metadata quality of directly provided content.
    
    Args:
        content: String content in RDF format
        content_type: MIME type of the content (e.g., 'application/rdf+xml')
        model: Model to validate against ('dcat_ap', 'dcat_ap_es', 'nti_risp')
        shacl_level: SHACL validation level (1-3)
        
    Returns:
        A quality report dictionary
        
    Raises:
        Exception: On validation errors
    """
    logger.info(f"Starting validation for direct content with format: {content_type} using model: {model}")
    
    try:
        # Parse the content into an RDFlib graph
        g = load_graph_from_content(content, content_type)
        
        # Registrar métricas específicas para el modelo seleccionado
        register_standard_metrics(model)
        register_standard_checkers()
        
        # Create context with model-specific settings
        context = {
            "model": model,
            "shacl_level": shacl_level
        }
        
        # Calculate metrics
        metrics = calculate_metrics(g, shacl_level, model=model)
        
        # Calculate dimension scores
        dimension_scores = calculate_dimension_scores(metrics)
        
        # Calculate total score
        total_score = sum(dimension_scores.values())
        
        # Determine rating
        rating = determine_rating(total_score, model)
        
        # Create the report
        report = {
            "source": f"direct-input-{datetime.now().strftime('%Y%m%d%H%M%S')}",  # Unique identifier for direct input
            "created": datetime.now().strftime("%Y-%m-%d"),
            "model": model,
            "totalScore": total_score,
            "rating": rating.value,
            "dimensions": dimension_scores,
            "metrics": metrics
        }
        
        logger.info(f"Validation completed for direct content using model {model}. Score: {total_score}, Rating: {rating}")
        return report
        
    except Exception as e:
        logger.error(f"Error validating content: {str(e)}")
        raise Exception(f"Error validating content: {str(e)}")

def load_graph_from_content(content: str, content_type: str) -> Graph:
    """
    Load an RDFlib graph from direct content.
    
    Args:
        content: String content in RDF format
        content_type: MIME type of the content
        
    Returns:
        RDFlib Graph
        
    Raises:
        Exception: If the content cannot be parsed
    """
    g = Graph()
    
    try:
        # Create a file-like object from the content
        if content_type == 'application/rdf+xml':
            # For XML, we need to use BytesIO for proper encoding handling
            content_io = BytesIO(content.encode('utf-8'))
            format_name = 'xml'
        elif content_type == 'text/turtle':
            content_io = StringIO(content)
            format_name = 'turtle'
        elif content_type == 'application/ld+json':
            content_io = StringIO(content)
            format_name = 'json-ld'
        elif content_type == 'application/n-triples':
            content_io = StringIO(content)
            format_name = 'nt'
        else:
            raise Exception(f"Unsupported content type: {content_type}")
        
        # Parse the content
        g.parse(content_io, format=format_name)
        
        # Check if the graph is empty
        if not len(g):
            raise Exception("The parsed graph is empty. Please check your input.")
        
        logger.info(f"Successfully parsed content with format {content_type}: {len(g)} triples")
        return g
    
    except Exception as e:
        logger.error(f"Error parsing content: {str(e)}")
        raise Exception(f"Error parsing content: {str(e)}")
    
