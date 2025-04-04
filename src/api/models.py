"""
Pydantic models for metadata quality reports.

This module defines the data models used for validating and structuring
metadata quality reports according to the Data Quality Vocabulary (DQV) standard.
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional
from enum import Enum
import re


class Rating(str, Enum):
    """Possible quality ratings according to MQA."""
    EXCELLENT = "Excellent"
    GOOD = "Good"
    SUFFICIENT = "Sufficient"
    BAD = "Bad"


class DimensionType(str, Enum):
    """Metadata quality dimensions according to FAIR+C principles."""
    FINDABILITY = "findability"
    ACCESSIBILITY = "accessibility"
    INTEROPERABILITY = "interoperability"
    REUSABILITY = "reusability"
    CONTEXTUALITY = "contextuality"


class MetricItem(BaseModel):
    """Individual metric measured during the evaluation."""
    id: str
    dimension: DimensionType
    count: int
    population: int
    percentage: float = Field(..., ge=0.0, le=1.0)
    points: float
    weight: int
    # Añadir etiquetas multilingües
    label_en: Optional[str] = None
    label_es: Optional[str] = None
    
    def get_label(self, lang: str = "en") -> str:
        """Get the localized label for this metric."""
        if lang == "es" and self.label_es:
            return self.label_es
        elif self.label_en:
            return self.label_en
        else:
            return self.id.replace("_", " ").capitalize()


class DimensionScores(BaseModel):
    """Scores for each dimension."""
    findability: int = Field(..., ge=0, le=100)
    accessibility: int = Field(..., ge=0, le=100)
    interoperability: int = Field(..., ge=0, le=110)
    reusability: int = Field(..., ge=0, le=75)
    contextuality: int = Field(..., ge=0, le=20)


class QualityReport(BaseModel):
    """Complete metadata quality report."""
    source: str = Field(..., description="URL of the evaluated catalog")
    created: str = Field(..., description="Evaluation date in YYYY-MM-DD format")
    totalScore: int = Field(..., ge=0, le=405)
    rating: Rating
    dimensions: DimensionScores
    metrics: Optional[List[MetricItem]] = Field(default=None)

    @validator('created')
    def validate_date_format(cls, v):
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v

    class Config:
        """Pydantic model configuration."""
        schema_extra = {
            "example": {
                "source": "https://example.com/catalog.rdf",
                "created": "2025-03-22",
                "totalScore": 280,
                "rating": "Good",
                "dimensions": {
                    "findability": 90,
                    "accessibility": 80,
                    "interoperability": 70,
                    "reusability": 30,
                    "contextuality": 10
                },
                "metrics": [
                    {
                        "id": "dcat_keyword",
                        "dimension": "findability",
                        "count": 46,
                        "population": 46,
                        "percentage": 1.0,
                        "points": 30.0,
                        "weight": 30
                    }
                ]
            }
        }