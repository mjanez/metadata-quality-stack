"""
Configuration module for the metadata quality assessment tool.
This module contains all constants and configuration parameters used throughout the application.
"""
import os
from typing import Dict, List, Set, Any
from .models import DimensionType, Rating

# Environment settings
# SSL verification configuration
SSL_VERIFY = os.environ.get('SSL_VERIFY', 'True').lower() in ['true', '1', 'yes']
ALLOW_INSECURE_URLS = os.environ.get('ALLOW_INSECURE_URLS', 'True').lower() in ['true', '1', 'yes']

# Base path for local resources
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(os.path.dirname(BASE_DIR), "docs")
SHACL_DIR = os.path.join(DOCS_DIR, "shacl")
VOCAB_DIR = os.path.join(DOCS_DIR, "vocabularies")

# Maximum scores per dimension according to MQA methodology
MAX_SCORES = {
    DimensionType.FINDABILITY: 100,
    DimensionType.ACCESSIBILITY: 100,
    DimensionType.INTEROPERABILITY: 110,
    DimensionType.REUSABILITY: 75,
    DimensionType.CONTEXTUALITY: 20,
}

# Umbrales de puntuación por perfil
RATING_THRESHOLDS_BY_PROFILE = {
    "dcat_ap": {
        "excellent": 351,  # Manteniendo los umbrales originales para DCAT-AP
        "good": 221,
        "sufficient": 121
    },
    "dcat_ap_es": {
        "excellent": 351,  # Manteniendo los umbrales originales para DCAT-AP-ES
        "good": 221,
        "sufficient": 121
    },
    "nti_risp": {
        "excellent": 264,
        "good": 166,
        "sufficient": 91
    }
}

# Mantenemos RATING_THRESHOLDS para compatibilidad con código existente
RATING_THRESHOLDS = RATING_THRESHOLDS_BY_PROFILE["dcat_ap_es"]

# SHACL validation levels
class SHACLLevel:
    """SHACL validation levels as defined in DCAT-AP."""
    LEVEL_1 = 1  # Base
    LEVEL_2 = 2  # Base + vocabularies
    LEVEL_3 = 3  # Base + vocabularies + recommended properties

# SHACL shapes for validation - local files
DCAT_AP_VERSION = "2.1.1"  # Default version to use (DCAT-AP-ES is based on DCAT-AP 2.1.1)
DCAT_AP_ES_VERSION = "1.0.0"  # Default version to use
NTI_RISP_VERSION = "1.0.0"  # Default version to use

# DCAT-AP SHACL files by level - actualizado para incluir todos los archivos
DCAT_AP_SHACL_FILES = {
    SHACLLevel.LEVEL_1: [
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_imports.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_range.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_deprecateduris.ttl")
    ],
    SHACLLevel.LEVEL_2: [
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_imports.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_range.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_deprecateduris.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr-vocabularies.shape.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr_imports.ttl")
    ],
    SHACLLevel.LEVEL_3: [
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_imports.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_range.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_deprecateduris.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr-vocabularies.shape.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr_imports.ttl"),
        os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes_recommended.ttl")
    ]
}

# DCAT-AP-ES SHACL files (all are validated together)
DCAT_AP_ES_SHACL_FILES = [
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_catalog_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_common_shapes.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_dataservice_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_dataset_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_distribution_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_mdr-vocabularies.shape.ttl")
]

# High Value Dataset SHACL files
DCAT_AP_ES_HVD_SHACL_FILES = [
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_common_hvd_shapes.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_dataservice_hvd_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_dataset_hvd_shape.ttl"),
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_distribution_hvd_shape.ttl")
]

NTI_RISP_SHACL_FILES = [
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_catalog_shape.ttl"),
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_common_shapes.ttl"),
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_dataservice_shape.ttl"),
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_dataset_shape.ttl"),
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_distribution_shape.ttl"),
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_mdr-vocabularies.shape.ttl")
]

# URLs para cada archivo SHACL
SHACL_REMOTE_URLS = {
    # DCAT-AP
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_imports.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_imports.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_range.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_range.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_deprecateduris.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_deprecateduris.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr-vocabularies.shape.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_mdr-vocabularies.shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_mdr_imports.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_mdr_imports.ttl",
    os.path.join(SHACL_DIR, "dcat-ap", DCAT_AP_VERSION, f"dcat-ap_{DCAT_AP_VERSION}_shacl_shapes_recommended.ttl"):
        f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_shapes_recommended.ttl",
        
    # DCAT-AP-ES
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_catalog_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_catalog_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_common_shapes.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_common_shapes.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_dataservice_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_dataservice_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_dataset_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_dataset_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_distribution_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_distribution_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "shacl_mdr-vocabularies.shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/shacl_mdr-vocabularies.shape.ttl",
    
    # DCAT-AP-ES HVD
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_common_hvd_shapes.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/hvd/shacl_common_hvd_shapes.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_dataservice_hvd_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/hvd/shacl_dataservice_hvd_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_dataset_hvd_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/hvd/shacl_dataset_hvd_shape.ttl",
    os.path.join(SHACL_DIR, "dcat-ap-es", DCAT_AP_ES_VERSION, "hvd", "shacl_distribution_hvd_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/{DCAT_AP_ES_VERSION}/hvd/shacl_distribution_hvd_shape.ttl",
    
    # NTI-RISP
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_catalog_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_catalog_shape.ttl",
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_common_shapes.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_common_shapes.ttl",
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_dataservice_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_dataservice_shape.ttl",
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_dataset_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_dataset_shape.ttl",
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_distribution_shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_distribution_shape.ttl",
    os.path.join(SHACL_DIR, "nti-risp", NTI_RISP_VERSION, "shacl_mdr-vocabularies.shape.ttl"):
        f"https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/{NTI_RISP_VERSION}/shacl_mdr-vocabularies.shape.ttl",
}

# Configuración para la actualización de los archivos SHACL
SHACL_UPDATE_CONFIG = {
    "update_interval_days": 7,  # Verificar actualizaciones cada 7 días
    "force_update": False,      # No forzar actualización en cada inicio
    "timeout": 10,              # Timeout para las solicitudes HTTP en segundos
}

# MQA vocabularies
MQA_VOCABS = {
    # machine-readable formats: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-machine-readable-format.rdf
    "machine_readable": os.path.join(VOCAB_DIR, "machine_readable.csv"),
    # non-proprietary formats: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-non-proprietary-format.rdf
    "non_proprietary": os.path.join(VOCAB_DIR, "non_proprietary.csv"),
    # file types: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-filetypes-skos.rdf
    "file_types": os.path.join(VOCAB_DIR, "file_types.csv"),
    # media types: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-media-types.rdf
    "media_types": os.path.join(VOCAB_DIR, "media_types.csv"),
    # licenses: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-licenses.rdf
    "license": os.path.join(VOCAB_DIR, "licenses.csv"),
    # access rights: https://gitlab.com/dataeuropa/vocabularies/-/blob/master/piveau-access-rights.rdf
    "access_rights": os.path.join(VOCAB_DIR, "access_rights.csv"),
}


# Fallback URLs for SHACL shapes if local files are not available
DCAT_AP_SHAPES_URL = f"https://raw.githubusercontent.com/SEMICeu/DCAT-AP/master/releases/{DCAT_AP_VERSION}/dcat-ap_{DCAT_AP_VERSION}_shacl_shapes.ttl"
DCAT_AP_ES_SHAPES_URL = "https://raw.githubusercontent.com/datosgobes/DCAT-AP-ES/main/shacl/1.0.0/shacl_common_shapes.ttl"
NTI_RISP_SHAPES_URL = "https://raw.githubusercontent.com/datosgobes/NTI-RISP/main/shacl/1.0.0/shacl_common_shapes.ttl"

# Default metrics based on MQA methodology
DEFAULT_METRICS = [
    # Findability metrics
    {"id": "dcat_keyword", "dimension": DimensionType.FINDABILITY, "weight": 30},
    {"id": "dcat_theme", "dimension": DimensionType.FINDABILITY, "weight": 30},
    {"id": "dct_spatial", "dimension": DimensionType.FINDABILITY, "weight": 20},
    {"id": "dct_temporal", "dimension": DimensionType.FINDABILITY, "weight": 20},
    
    # Accessibility metrics
    {"id": "dcat_accessURL_status", "dimension": DimensionType.ACCESSIBILITY, "weight": 50},
    {"id": "dcat_downloadURL", "dimension": DimensionType.ACCESSIBILITY, "weight": 20},
    {"id": "dcat_downloadURL_status", "dimension": DimensionType.ACCESSIBILITY, "weight": 30},
    
    # Interoperability metrics
    {"id": "dct_format", "dimension": DimensionType.INTEROPERABILITY, "weight": 20},
    {"id": "dcat_mediaType", "dimension": DimensionType.INTEROPERABILITY, "weight": 10},
    {"id": "dct_format_vocabulary", "dimension": DimensionType.INTEROPERABILITY, "weight": 5},
    {"id": "dct_mediaType_vocabulary", "dimension": DimensionType.INTEROPERABILITY, "weight": 5},
    {"id": "dct_format_nonproprietary", "dimension": DimensionType.INTEROPERABILITY, "weight": 20},
    {"id": "dct_format_machinereadable", "dimension": DimensionType.INTEROPERABILITY, "weight": 20},
    {"id": "dcat_ap_compliance", "dimension": DimensionType.INTEROPERABILITY, "weight": 30},
    {"id": "dcat_ap_es_compliance", "dimension": DimensionType.INTEROPERABILITY, "weight": 30},
    {"id": "nti_risp_compliance", "dimension": DimensionType.INTEROPERABILITY, "weight": 30},
    
    # Reusability metrics
    {"id": "dct_license", "dimension": DimensionType.REUSABILITY, "weight": 20},
    {"id": "dct_license_vocabulary", "dimension": DimensionType.REUSABILITY, "weight": 10},
    {"id": "dct_accessRights", "dimension": DimensionType.REUSABILITY, "weight": 10},
    {"id": "dct_accessRights_vocabulary", "dimension": DimensionType.REUSABILITY, "weight": 5},
    {"id": "dcat_contactPoint", "dimension": DimensionType.REUSABILITY, "weight": 20},
    {"id": "dct_publisher", "dimension": DimensionType.REUSABILITY, "weight": 10},
    
    # Contextuality metrics
    {"id": "dct_rights", "dimension": DimensionType.CONTEXTUALITY, "weight": 5},
    {"id": "dcat_byteSize", "dimension": DimensionType.CONTEXTUALITY, "weight": 5},
    {"id": "dct_issued", "dimension": DimensionType.CONTEXTUALITY, "weight": 5},
    {"id": "dct_modified", "dimension": DimensionType.CONTEXTUALITY, "weight": 5}
]

# Métricas comunes para todos los perfiles (195)
COMMON_METRICS = [
    # Findability: 30 + 30 + 20 + 20 = 100
    {"id": "dcat_keyword", "dimension": "findability", "weight": 30},
    {"id": "dcat_theme", "dimension": "findability", "weight": 30},
    {"id": "dct_spatial", "dimension": "findability", "weight": 20},
    {"id": "dct_temporal", "dimension": "findability", "weight": 20},
    
    # Accessibility: 50
    {"id": "dcat_accessURL_status", "dimension": "accessibility", "weight": 50},
    
    # Interoperability: 20 + 10 = 30
    {"id": "dct_format", "dimension": "interoperability", "weight": 20},
    {"id": "dcat_mediaType", "dimension": "interoperability", "weight": 10},
    
    # Contextuality: 5 + 5 + 5 = 15
    {"id": "dcat_byteSize", "dimension": "contextuality", "weight": 5},
    {"id": "dct_issued", "dimension": "contextuality", "weight": 5},
    {"id": "dct_modified", "dimension": "contextuality", "weight": 5}
]

# DCAT-AP y DCAT-AP-ES metrics (180)
DCAT_COMMON_METRICS = [
    # Accessibility: 20 + 30 = 50
    {"id": "dcat_downloadURL", "dimension": "accessibility", "weight": 20},
    {"id": "dcat_downloadURL_status", "dimension": "accessibility", "weight": 30},
    
    # Interoperability: 5 + 5 + 20 + 20 = 50
    {"id": "dct_format_vocabulary", "dimension": "interoperability", "weight": 5},
    {"id": "dct_mediaType_vocabulary", "dimension": "interoperability", "weight": 5},
    {"id": "dct_format_nonproprietary", "dimension": "interoperability", "weight": 20},
    {"id": "dct_format_machinereadable", "dimension": "interoperability", "weight": 20},  

    # Reusability: 20 + 10 + 10 + 5 + 20 + 10 = 75
    {"id": "dct_license", "dimension": "reusability", "weight": 20},
    {"id": "dct_license_vocabulary", "dimension": "reusability", "weight": 10},
    {"id": "dct_accessRights", "dimension": "reusability", "weight": 10},
    {"id": "dct_accessRights_vocabulary", "dimension": "reusability", "weight": 5},
    {"id": "dcat_contactPoint", "dimension": "reusability", "weight": 20},
    {"id": "dct_publisher", "dimension": "reusability", "weight": 10},
    
    # Contextuality: 5
    {"id": "dct_rights", "dimension": "contextuality", "weight": 5}
]

# DCAT-AP-ES specific metrics (405)
DCAT_AP_ES_SPECIFIC_METRICS = [
    {"id": "dcat_ap_es_compliance", "dimension": "interoperability", "weight": 30}
]

# DCAT-AP specific metrics (405)
DCAT_AP_SPECIFIC_METRICS = [
    {"id": "dcat_ap_compliance", "dimension": "interoperability", "weight": 30}
]

# Métricas específicas de NTI-RISP (195 + 75 + 40 = 310)
NTI_RISP_SPECIFIC_METRICS = [
    # Interoperability NTI-RISP: 5 + 20 + 20 + 30 = 75
    {"id": "dct_format_vocabulary_nti_risp", "dimension": "interoperability", "weight": 5},
    {"id": "dct_format_nonproprietary", "dimension": "interoperability", "weight": 20},
    {"id": "dct_format_machinereadable", "dimension": "interoperability", "weight": 20},
    {"id": "nti_risp_compliance", "dimension": "interoperability", "weight": 30},
    
    # Reusability NTI-RISP: 20 + 10 + 10 = 40
    {"id": "dct_license", "dimension": "reusability", "weight": 20},
    {"id": "dct_license_vocabulary", "dimension": "reusability", "weight": 10},
    {"id": "dct_publisher", "dimension": "reusability", "weight": 10}    
]

# Definir las métricas para cada perfil
METRICS_BY_PROFILE = {
    "dcat_ap": COMMON_METRICS + DCAT_COMMON_METRICS + DCAT_AP_SPECIFIC_METRICS,
    "dcat_ap_es": COMMON_METRICS + DCAT_COMMON_METRICS + DCAT_AP_ES_SPECIFIC_METRICS,
    "nti_risp": COMMON_METRICS + NTI_RISP_SPECIFIC_METRICS
}

# Stalish default metrics compatible with DCAT-AP-ES
DEFAULT_METRICS = METRICS_BY_PROFILE["dcat_ap_es"]

MAX_SCORES = {
    "dcat_ap": 405,
    "dcat_ap_es": 405,
    "nti_risp": 310
}

DIMENSION_MAX_SCORES = {
    "dcat_ap": {
        "findability": 100,
        "accessibility": 100,
        "interoperability": 110,
        "reusability": 75,
        "contextuality": 20
    },
    "dcat_ap_es": {
        "findability": 100,
        "accessibility": 100,
        "interoperability": 110,
        "reusability": 75,
        "contextuality": 20
    },
    "nti_risp": {
        "findability": 100,
        "accessibility": 50,
        "interoperability": 105,
        "reusability": 40,
        "contextuality": 15
    }
}

METRIC_LABELS = {
    # Findability metrics
    "dcat_keyword": {
        "en": "Keywords",
        "es": "Palabras clave"
    },
    "dcat_theme": {
        "en": "Themes/Categories",
        "es": "Temas/Categorías"
    },
    "dct_spatial": {
        "en": "Spatial Coverage",
        "es": "Cobertura espacial"
    },
    "dct_temporal": {
        "en": "Temporal Coverage",
        "es": "Cobertura temporal"
    },
    
    # Accessibility metrics
    "dcat_accessURL_status": {
        "en": "Access URL Availability",
        "es": "Disponibilidad de URL de acceso"
    },
    "dcat_downloadURL": {
        "en": "Download URL",
        "es": "URL de descarga"
    },
    "dcat_downloadURL_status": {
        "en": "Download URL Availability",
        "es": "Disponibilidad de URL de descarga"
    },
    
    # Interoperability metrics
    "dct_format": {
        "en": "Format",
        "es": "Formato"
    },
    "dcat_mediaType": {
        "en": "Media Type",
        "es": "Tipo de medio"
    },
    "dct_format_vocabulary": {
        "en": "Format Vocabulary",
        "es": "Vocabulario de formato"
    },
    "dct_format_nonproprietary": {
        "en": "Non-proprietary Format",
        "es": "Formato no propietario"
    },
    "dct_format_machinereadable": {
        "en": "Machine-readable Format",
        "es": "Formato legible por máquina"
    },
    "dcat_ap_compliance": {
        "en": "DCAT-AP Compliance",
        "es": "Conformidad con DCAT-AP"
    },
    "dcat_ap_es_compliance": {
        "en": "DCAT-AP-ES Compliance",
        "es": "Conformidad con DCAT-AP-ES"
    },
    "nti_risp_compliance": {
        "en": "NTI-RISP Compliance",
        "es": "Conformidad con NTI-RISP (2013)"
    },
    
    # Reusability metrics
    "dct_license": {
        "en": "License",
        "es": "Licencia"
    },
    "dct_license_vocabulary": {
        "en": "License Vocabulary",
        "es": "Vocabulario de licencia"
    },
    "dct_accessRights": {
        "en": "Access Rights",
        "es": "Derechos de acceso"
    },
    "dct_accessRights_vocabulary": {
        "en": "Access Rights Vocabulary",
        "es": "Vocabulario de derechos de acceso"
    },
    "dcat_contactPoint": {
        "en": "Contact Point",
        "es": "Punto de contacto"
    },
    "dct_publisher": {
        "en": "Publisher",
        "es": "Editor"
    },
    
    # Contextuality metrics
    "dct_rights": {
        "en": "Rights",
        "es": "Derechos"
    },
    "dcat_byteSize": {
        "en": "Byte Size",
        "es": "Tamaño en bytes"
    },
    "dct_issued": {
        "en": "Issued Date",
        "es": "Fecha de emisión"
    },
    "dct_modified": {
        "en": "Modified Date",
        "es": "Fecha de modificación"
    },
    
    # NTI-RISP specific metrics
    "dct_format_vocabulary_nti_risp": {
        "en": "Format Vocabulary (NTI-RISP)",
        "es": "Vocabulario de formato (NTI-RISP)"
    }
}