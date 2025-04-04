"""
Tests for the API functionality.
This module contains tests for the API endpoints and validation logic.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.api.main import app
from src.api.models import Rating, DimensionType, QualityReport
from datetime import datetime

# Create a test client
client = TestClient(app)

# Sample test data
SAMPLE_REPORT = {
    "source": "https://example.com/catalog.ttl",
    "created": datetime.now().strftime("%Y-%m-%d"),
    "totalScore": 280,
    "rating": Rating.GOOD,
    "dimensions": {
        "findability": 80,
        "accessibility": 70,
        "interoperability": 60,
        "reusability": 50,
        "contextuality": 20
    },
    "metrics": [
        {
            "id": "dcat_keyword",
            "dimension": DimensionType.FINDABILITY,
            "count": 46,
            "population": 46,
            "percentage": 1.0,
            "points": 30.0,
            "weight": 30
        }
    ]
}

def test_read_root():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()
    assert "version" in response.json()
    assert "documentation" in response.json()

@patch("src.api.validators.validate_metadata_quality")
@patch("src.api.main.repo.insert_report")
def test_validate_url(mock_insert_report, mock_validate_metadata_quality):
    """Test the validate endpoint."""
    # Mock the validation function
    mock_validate_metadata_quality.return_value = SAMPLE_REPORT
    mock_insert_report.return_value = 1  # Document ID
    
    # Call the endpoint
    response = client.post("/validate?url=https://example.com/catalog.ttl")
    
    # Check response
    assert response.status_code == 200
    assert response.json()["source"] == "https://example.com/catalog.ttl"
    assert response.json()["totalScore"] == 280
    assert response.json()["rating"] == "Good"
    
    # Verify mocks were called with correct parameters
    mock_validate_metadata_quality.assert_called_once_with("https://example.com/catalog.ttl")
    mock_insert_report.assert_called_once()

@patch("src.api.main.repo.get_latest_report")
def test_get_latest_report(mock_get_latest_report):
    """Test the get_latest_report endpoint."""
    # Mock the repository function
    mock_get_latest_report.return_value = SAMPLE_REPORT
    
    # URL-encode the test URL
    encoded_url = "https%3A%2F%2Fexample.com%2Fcatalog.ttl"
    
    # Call the endpoint
    response = client.get(f"/report/{encoded_url}")
    
    # Check response
    assert response.status_code == 200
    assert response.json()["source"] == "https://example.com/catalog.ttl"
    assert response.json()["totalScore"] == 280
    
    # Verify mock was called with correct parameter
    mock_get_latest_report.assert_called_once_with("https://example.com/catalog.ttl")

@patch("src.api.main.repo.get_latest_report")
def test_get_latest_report_not_found(mock_get_latest_report):
    """Test the get_latest_report endpoint when no report is found."""
    # Mock the repository function to return None (no report found)
    mock_get_latest_report.return_value = None
    
    # URL-encode the test URL
    encoded_url = "https%3A%2F%2Fexample.com%2Fcatalog.ttl"
    
    # Call the endpoint
    response = client.get(f"/report/{encoded_url}")
    
    # Check response
    assert response.status_code == 404
    assert "detail" in response.json()
    assert "No report found" in response.json()["detail"]
    
    # Verify mock was called with correct parameter
    mock_get_latest_report.assert_called_once_with("https://example.com/catalog.ttl")

@patch("src.api.main.repo.get_history")
def test_get_history(mock_get_history):
    """Test the get_history endpoint."""
    # Mock the repository function
    mock_get_history.return_value = [SAMPLE_REPORT]
    
    # URL-encode the test URL
    encoded_url = "https%3A%2F%2Fexample.com%2Fcatalog.ttl"
    
    # Call the endpoint
    response = client.get(f"/history/{encoded_url}")
    
    # Check response
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["source"] == "https://example.com/catalog.ttl"
    
    # Verify mock was called with correct parameter
    mock_get_history.assert_called_once_with("https://example.com/catalog.ttl")

@patch("src.api.main.repo.get_reports_by_date_range")
def test_get_reports_by_date_range(mock_get_reports_by_date_range):
    """Test the get_reports_by_date_range endpoint."""
    # Mock the repository function
    mock_get_reports_by_date_range.return_value = [SAMPLE_REPORT]
    
    # Call the endpoint
    response = client.get("/reports/by-date?start_date=2025-01-01&end_date=2025-12-31")
    
    # Check response
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["source"] == "https://example.com/catalog.ttl"
    
    # Verify mock was called with correct parameters
    mock_get_reports_by_date_range.assert_called_once_with("2025-01-01", "2025-12-31")

@patch("src.api.main.repo.get_reports_by_rating")
def test_get_reports_by_rating(mock_get_reports_by_rating):
    """Test the get_reports_by_rating endpoint."""
    # Mock the repository function
    mock_get_reports_by_rating.return_value = [SAMPLE_REPORT]
    
    # Call the endpoint
    response = client.get("/reports/by-rating/Good")
    
    # Check response
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["source"] == "https://example.com/catalog.ttl"
    
    # Verify mock was called with correct parameter
    mock_get_reports_by_rating.assert_called_once_with("Good")