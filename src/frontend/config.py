MARKDOWN_TEXTS = {
    "about_text": {
        "en": """
This tool evaluates metadata quality based on the European Data Portal's 
Metadata Quality Assessment ([MQA](https://data.europa.eu/mqa/methodology?locale=en)) methodology.

The assessment is based on FAIR+C principles:
- **F**indability
- **A**ccessibility
- **I**nteroperability
- **R**eusability
- **C**ontextuality
""",
        "es": """
Esta herramienta evalúa la calidad de los metadatos basándose en la metodología de Evaluación de Calidad de Metadatos ([MQA](https://data.europa.eu/mqa/methodology?locale=es)) del portal oficial de datos europeos | data.europa.eu
.

La evaluación se basa en los principios FAIR+C:
- **D**escubrimiento (*Findability*)
- **A**ccesibilidad (*Accessibility*)
- **I**nteroperabilidad (*Interoperability*)
- **R**eutilización (*Reusability*)
- **C**ontexto (*Contextuality*)

"""
    },
"rating_table": {
            "en": """
    | Rating | Points |
    |--------|--------|
    | Excellent | 351-405 |
    | Good | 221-350 |
    | Sufficient | 121-220 |
    | Bad | 0-120 |
    """,
            "es": """
    | Calificación | Puntos |
    |------------|--------|
    | Excelente | 351-405 |
    | Bueno | 221-350 |
    | Suficiente | 121-220 |
    | Malo | 0-120 |
    """
    },
"learn_more_link": {
        "en": "[Learn more about MQA](https://data.europa.eu/mqa/methodology?locale=en)",
        "es": "[Más información sobre MQA](https://data.europa.eu/mqa/methodology?locale=es)"
    }
}

# Añadir esta estructura para las tablas de calificación por perfil
RATING_TABLES = {
    "dcat_ap": {
        "en": """
| Rating | Points |
|--------|--------|
| Excellent | 351-405 |
| Good | 221-350 |
| Sufficient | 121-220 |
| Bad | 0-120 |
""",
        "es": """
| Calificación | Puntos |
|------------|--------|
| Excelente | 351-405 |
| Bueno | 221-350 |
| Suficiente | 121-220 |
| Malo | 0-120 |
"""
    },
    "dcat_ap_es": {
        "en": """
| Rating | Points |
|--------|--------|
| Excellent | 351-405 |
| Good | 221-350 |
| Sufficient | 121-220 |
| Bad | 0-120 |
""",
        "es": """
| Calificación | Puntos |
|------------|--------|
| Excelente | 351-405 |
| Bueno | 221-350 |
| Suficiente | 121-220 |
| Malo | 0-120 |
"""
    },
    "nti_risp": {
        "en": """
| Rating | Points |
|--------|--------|
| Excellent | 269-310 |
| Good | 169-260 |
| Sufficient | 93-170 |
| Bad | 0-90 |
""",
        "es": """
| Calificación | Puntos |
|------------|--------|
| Excelente | 269-310 |
| Bueno | 169-260 |
| Suficiente | 93-170 |
| Malo | 0-90 |
"""
    }
}

# Función para obtener la tabla de calificación según el perfil y el idioma
def get_rating_table(profile, language):
    return RATING_TABLES.get(profile, RATING_TABLES["dcat_ap_es"]).get(language, "en")

METRIC_LABELS = {
    # Findability metrics
    "dcat_keyword": {
        "en": "Keywords usage",
        "es": "Uso de etiquetas"
    },
    "dcat_theme": {
        "en": "Themes",
        "es": "Temáticas"
    },
    "dct_spatial": {
        "en": "Geo search",
        "es": "Búsqueda geográfica"
    },
    "dct_temporal": {
        "en": "Time based search",
        "es": "Búsqueda temporal" 
    },
    
    # Accessibility metrics
    "dcat_accessURL_status": {
        "en": "Access URL accessibility",
        "es": "Accesibilidad de la URL de acceso"
    },
    "dcat_downloadURL": {
        "en": "Download URL",
        "es": "URL de descarga"
    },
    "dcat_downloadURL_status": {
        "en": "Download URL accessibility",
        "es": "Accesibilidad de la URL de descarga"
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
        "en": "Format/Media type Vocabulary",
        "es": "Vocabulario de formato/tipo de medio"
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
        "en": "DCAT-AP compliance",
        "es": "Conformidad con DCAT-AP"
    },
    "dcat_ap_es_compliance": {
        "en": "DCAT-AP-ES compliance",
        "es": "Conformidad con DCAT-AP-ES"
    },
    "nti_risp_compliance": {
        "en": "NTI-RISP (2013) compliance",
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
        "es": "Publicador"
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
        "en": "Issued date",
        "es": "Fecha de publicación"
    },
    "dct_modified": {
        "en": "Modified date",
        "es": "Fecha de modificación"
    }
}

PROFILES = {
    'dcat_ap_es': 'DCAT-AP-ES',
    'dcat_ap': 'DCAT-AP',
    'nti_risp': 'NTI-RISP',
}

DIMENSION_COLORS = {
    "findability": "rgb(0, 184, 212)",      
    "accessibility": "rgb(0, 114, 166)",     
    "interoperability": "rgb(57, 44, 126)",  
    "reusability": "rgb(211, 79, 40)",       
    "contextuality": "rgb(219, 148, 20)"     
}

FORMAT_MIME_TYPES = {
    "RDF/XML": "application/rdf+xml",
    "Turtle (TTL)": "text/turtle",
    "JSON-LD": "application/ld+json",
    "N-Triples": "application/n-triples"
}

# Añadir esta constante junto con las otras definiciones
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