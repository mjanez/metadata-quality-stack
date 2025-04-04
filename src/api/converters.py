"""
Converter module for data format transformations.
This module provides functions to convert between different data formats,
such as JSON-LD with Data Quality Vocabulary (DQV).
"""
from typing import Dict, List, Any, Optional
import urllib.parse
from datetime import datetime
from .config import (
    METRIC_LABELS,
)

def get_metric_label(metric_id: str, lang: str = "en") -> str:
    """
    Get the localized label for a metric.
    
    Args:
        metric_id: The metric identifier
        lang: Language code ('en', 'es', etc.)
        
    Returns:
        Localized label or the original ID if no translation is found
    """
    if metric_id in METRIC_LABELS and lang in METRIC_LABELS[metric_id]:
        return METRIC_LABELS[metric_id][lang]
    return metric_id.replace("_", " ").capitalize()

def convert_to_jsonld_dqv(report: Dict[str, Any], lang: str = "en") -> Dict[str, Any]:
    """
    Convert a quality report to JSON-LD format using DQV vocabulary.
    
    Args:
        report: Quality report data from the API
        lang: Language for labels
        
    Returns:
        JSON-LD representation of the quality report
    """
    # Create a JSON-LD context with the relevant vocabularies
    context = {
        "@context": {
            "dqv": "http://www.w3.org/ns/dqv#",
            "dcat": "http://www.w3.org/ns/dcat#",
            "dcterms": "http://purl.org/dc/terms/",
            "prov": "http://www.w3.org/ns/prov#",
            "foaf": "http://xmlns.com/foaf/0.1/",
            "xsd": "http://www.w3.org/2001/XMLSchema#",
            "oa": "http://www.w3.org/ns/oa#",
            "skos": "http://www.w3.org/2004/02/skos/core#",
            "schema": "http://schema.org/",
            "fair": "https://w3id.org/fair/principles/terms/"
        }
    }
    
    # Create a unique identifier for the quality measurement
    # Replace problematic URL characters with hyphens
    safe_url = urllib.parse.quote(report['source'], safe='')
    measurement_id = f"urn:mqa:measurement:{safe_url}-{report['created']}"
    
    # Map our dimensions to DQV dimensions
    dimension_map = {
        "findability": "fair:F",
        "accessibility": "fair:A",
        "interoperability": "fair:I",
        "reusability": "fair:R",
        "contextuality": "dqv:contextualQuality"
    }
    
    # Create the base JSON-LD structure
    jsonld = {
        "@context": context["@context"],
        "@id": measurement_id,
        "@type": "dqv:QualityMeasurement",
        "dcterms:created": f"{report['created']}T00:00:00Z",
        "dcterms:title": f"Quality Assessment for {report['source']}",
        "dqv:computedOn": {
            "@id": report['source'],
            "@type": "dcat:Dataset"
        },
        "dqv:value": report['totalScore'],
        "dqv:isMeasurementOf": {
            "@id": "urn:mqa:metric:totalScore",
            "@type": "dqv:Metric",
            "skos:prefLabel": "Total Quality Score"
        },
        "schema:rating": {
            "@type": "schema:Rating",
            "schema:ratingValue": report['rating'],
            "schema:worstRating": "Bad",
            "schema:bestRating": "Excellent"
        },
        "dqv:hasQualityMeasurement": []
    }
    
    # Add dimension measurements
    for dim_key, dim_value in report['dimensions'].items():
        dimension_id = f"{measurement_id}-{dim_key}"
        dimension_measurement = {
            "@id": dimension_id,
            "@type": "dqv:QualityMeasurement",
            "dqv:value": dim_value,
            "dqv:isMeasurementOf": {
                "@id": dimension_map[dim_key],
                "@type": "dqv:Dimension",
                "skos:prefLabel": dim_key.capitalize()
            }
        }
        jsonld["dqv:hasQualityMeasurement"].append(dimension_measurement)
    
    # Add metric measurements with localized labels
    if report.get('metrics'):
        for metric in report['metrics']:
            metric_id = metric['id']
            metric_measurement = {
                "@id": metric_id,
                "@type": "dqv:QualityMeasurement",
                "dqv:value": metric['points'],
                "dqv:isMeasurementOf": {
                    "@id": f"urn:mqa:metric:{metric['id']}",
                    "@type": "dqv:Metric",
                    "skos:prefLabel": get_metric_label(metric_id, lang),
                    "dqv:inDimension": {
                        "@id": dimension_map[metric['dimension']],
                        "@type": "dqv:Dimension"
                    }
                },
                "dqv:computedOn": {
                    "@id": report['source'],
                    "@type": "dcat:Dataset"
                },
                "schema:population": metric['population'],
                "schema:observationCount": metric['count'],
                "schema:percentage": metric['percentage']
            }
            jsonld["dqv:hasQualityMeasurement"].append(metric_measurement)
    
    return jsonld