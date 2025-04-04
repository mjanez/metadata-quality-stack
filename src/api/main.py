"""
FastAPI application for the Metadata Quality API.
This module defines the API endpoints for validating and retrieving metadata quality reports.
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime
from typing import Dict, List, Optional, Any
import urllib.parse
import logging
from pydantic import BaseModel

from .models import QualityReport
from .repositories.tinydb_repo import TinyDBRepository
from .validators import validate_metadata_quality, validate_metadata_from_content
from .converters import convert_to_jsonld_dqv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configure rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize the repository
repo = TinyDBRepository()

# Create FastAPI application
app = FastAPI(
    title="Metadata Quality API",
    description="API for analyzing and reporting metadata quality based on the European Data Portal's MQA methodology",
    version="0.1.0",
)

# Add rate limiter exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define content validation request model
class ContentValidationRequest(BaseModel):
    content: str
    content_type: str

@app.get("/")
def read_root():
    """API root endpoint with basic information."""
    return {
        "name": "Metadata Quality API",
        "version": "0.1.0",
        "description": "API for analyzing metadata quality based on MQA methodology",
        "documentation": "/docs",
    }

@app.post("/validate")
@limiter.limit("5/minute")
async def validate_url(request: Request, url: str, model: str = "dcat_ap_es", format: str = "json"):
    """
    Validate the metadata quality of a provided URL.
    
    Args:
        request: The FastAPI request object
        url: URL to a catalog in RDF or TTL format
        model: Model to validate against ('dcat_ap', 'dcat_ap_es', 'nti_risp')
        format: Output format ("json" or "jsonld")
    
    Returns:
        A quality report in the specified format
    
    Raises:
        HTTPException: On validation errors or rate limiting
    """
    logger.info(f"Validating URL: {url} with model: {model}")
    
    # Validate model parameter
    if model not in ["dcat_ap", "dcat_ap_es", "nti_risp"]:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")
    
    try:
        # Validate the metadata and generate a report
        report_data = validate_metadata_quality(url, model=model)
        
        # Store the report
        doc_id = repo.insert_report(report_data)
        logger.info(f"Report stored with ID: {doc_id}")
        
        # Convert to JSON-LD if requested
        if format.lower() == "jsonld":
            from .converters import convert_to_jsonld_dqv
            return convert_to_jsonld_dqv(report_data)
        
        return report_data
    
    except Exception as e:
        logger.error(f"Error validating URL: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/validate-content")
@limiter.limit("5/minute")
async def validate_content(request: Request, content_request: ContentValidationRequest, model: str = "dcat_ap_es", format: str = "json"):
    """
    Validate the metadata quality of directly provided content.
    
    Args:
        request: The FastAPI request object
        content_request: Content validation request with text and format
        model: Model to validate against ('dcat_ap', 'dcat_ap_es', 'nti_risp')
        format: Output format ("json" or "jsonld")
    
    Returns:
        A quality report in the specified format
    
    Raises:
        HTTPException: On validation errors or rate limiting
    """
    logger.info(f"Validating direct content with format: {content_request.content_type}")

    # Validate model parameter
    if model not in ["dcat_ap", "dcat_ap_es", "nti_risp"]:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")

    try:
        # Validate the metadata content and generate a report
        report_data = validate_metadata_from_content(
            content=content_request.content,
            content_type=content_request.content_type,
            model=model
        )
        
        # Store the report
        doc_id = repo.insert_report(report_data)
        logger.info(f"Report stored with ID: {doc_id}")
        
        # Convert to JSON-LD if requested
        if format.lower() == "jsonld":
            return convert_to_jsonld_dqv(report_data)
        
        return report_data
    
    except Exception as e:
        logger.error(f"Error validating content: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/report/{encoded_url}", response_model=QualityReport)
async def get_latest_report(encoded_url: str):
    """
    Get the latest quality report for a URL.
    
    Args:
        encoded_url: URL-encoded catalog URL
    
    Returns:
        The latest quality report for the URL
    
    Raises:
        HTTPException: If no report is found
    """
    url = urllib.parse.unquote(encoded_url)
    logger.info(f"Getting latest report for URL: {url}")
    
    report = repo.get_latest_report(url)
    
    if not report:
        raise HTTPException(status_code=404, detail="No report found for this URL")
    
    return report

@app.get("/history/{encoded_url}", response_model=List[QualityReport])
async def get_history(encoded_url: str):
    """
    Get the history of quality reports for a URL.
    
    Args:
        encoded_url: URL-encoded catalog URL
    
    Returns:
        List of historical reports for the URL
    
    Raises:
        HTTPException: If no reports are found
    """
    url = urllib.parse.unquote(encoded_url)
    logger.info(f"Getting history for URL: {url}")
    
    reports = repo.get_history(url)
    
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this URL")
    
    return reports

@app.get("/reports/by-date", response_model=List[QualityReport])
async def get_reports_by_date_range(start_date: str, end_date: str):
    """
    Get reports within a date range.
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
    
    Returns:
        List of reports in the date range
    
    Raises:
        HTTPException: If no reports are found or dates are invalid
    """
    logger.info(f"Getting reports from {start_date} to {end_date}")
    
    try:
        reports = repo.get_reports_by_date_range(start_date, end_date)
        
        if not reports:
            raise HTTPException(status_code=404, detail="No reports found in this date range")
        
        return reports
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/reports/by-rating/{rating}", response_model=List[QualityReport])
async def get_reports_by_rating(rating: str):
    """
    Get reports with a specific quality rating.
    
    Args:
        rating: Quality rating (Excellent, Good, Sufficient, Bad)
    
    Returns:
        List of reports with the specified rating
    
    Raises:
        HTTPException: If no reports are found or rating is invalid
    """
    logger.info(f"Getting reports with rating: {rating}")
    
    try:
        reports = repo.get_reports_by_rating(rating)
        
        if not reports:
            raise HTTPException(status_code=404, detail="No reports found with this rating")
        
        return reports
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))