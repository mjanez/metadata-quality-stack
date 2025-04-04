"""
Tests for the TinyDB repository implementation.
This module contains tests for the TinyDB repository functionality.
"""
import pytest
import os
import tempfile
from datetime import datetime
from src.api.repositories.tinydb_repo import TinyDBRepository
from src.api.models import QualityReport, Rating

# Sample test data
SAMPLE_REPORT_DATA = {
    "source": "https://example.com/catalog.ttl",
    "created": datetime.now().strftime("%Y-%m-%d"),
    "totalScore": 280,
    "rating": "Good",
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
            "dimension": "findability",
            "count": 46,
            "population": 46,
            "percentage": 1.0,
            "points": 30.0,
            "weight": 30
        }
    ]
}

@pytest.fixture
def temp_db_path():
    """Create a temporary database file for testing."""
    fd, path = tempfile.mkstemp()
    os.close(fd)
    yield path
    os.unlink(path)  # Delete the file after tests

@pytest.fixture
def repo(temp_db_path):
    """Create a TinyDB repository with a temporary database."""
    return TinyDBRepository(db_path=temp_db_path)

def test_insert_report(repo):
    """Test inserting a report into the repository."""
    # Insert the sample report
    doc_id = repo.insert_report(SAMPLE_REPORT_DATA)
    
    # Verify the report was inserted
    assert doc_id is not None
    assert isinstance(doc_id, int)
    assert doc_id > 0

def test_get_latest_report(repo):
    """Test retrieving the latest report for a URL."""
    # Insert multiple reports for the same URL with different dates
    older_report = SAMPLE_REPORT_DATA.copy()
    older_report["created"] = "2025-01-01"
    newer_report = SAMPLE_REPORT_DATA.copy()
    newer_report["created"] = "2025-02-01"
    
    repo.insert_report(older_report)
    repo.insert_report(newer_report)
    
    # Get the latest report
    latest = repo.get_latest_report("https://example.com/catalog.ttl")
    
    # Verify we got the newer report
    assert latest is not None
    assert latest["created"] == "2025-02-01"

def test_get_latest_report_not_found(repo):
    """Test retrieving a report for a URL that doesn't exist."""
    # Get a report for a URL that doesn't exist in the database
    report = repo.get_latest_report("https://nonexistent.com/catalog.ttl")
    
    # Verify we got None
    assert report is None

def test_get_history(repo):
    """Test retrieving the history of reports for a URL."""
    # Insert multiple reports for the same URL
    report1 = SAMPLE_REPORT_DATA.copy()
    report1["created"] = "2025-01-01"
    report2 = SAMPLE_REPORT_DATA.copy()
    report2["created"] = "2025-02-01"
    
    repo.insert_report(report1)
    repo.insert_report(report2)
    
    # Get the history
    history = repo.get_history("https://example.com/catalog.ttl")
    
    # Verify we got both reports
    assert history is not None
    assert len(history) == 2
    
    # Check that the dates are as expected
    dates = [r["created"] for r in history]
    assert "2025-01-01" in dates
    assert "2025-02-01" in dates

def test_get_reports_by_date_range(repo):
    """Test retrieving reports within a date range."""
    # Insert reports with different dates
    report1 = SAMPLE_REPORT_DATA.copy()
    report1["created"] = "2025-01-15"
    report2 = SAMPLE_REPORT_DATA.copy()
    report2["created"] = "2025-02-15"
    report3 = SAMPLE_REPORT_DATA.copy()
    report3["created"] = "2025-03-15"
    
    repo.insert_report(report1)
    repo.insert_report(report2)
    repo.insert_report(report3)
    
    # Get reports in the range
    reports = repo.get_reports_by_date_range("2025-01-01", "2025-02-28")
    
    # Verify we got the expected reports
    assert reports is not None
    assert len(reports) == 2
    
    # Check that the dates are as expected
    dates = [r["created"] for r in reports]
    assert "2025-01-15" in dates
    assert "2025-02-15" in dates
    assert "2025-03-15" not in dates

def test_get_reports_by_rating(repo):
    """Test retrieving reports with a specific rating."""
    # Insert reports with different ratings
    good_report = SAMPLE_REPORT_DATA.copy()
    good_report["rating"] = "Good"
    
    bad_report = SAMPLE_REPORT_DATA.copy()
    bad_report["rating"] = "Bad"
    bad_report["source"] = "https://example2.com/catalog.ttl"  # Different URL
    
    repo.insert_report(good_report)
    repo.insert_report(bad_report)
    
    # Get reports with rating "Good"
    reports = repo.get_reports_by_rating("Good")
    
    # Verify we got the expected reports
    assert reports is not None
    assert len(reports) == 1
    assert reports[0]["rating"] == "Good"
    assert reports[0]["source"] == "https://example.com/catalog.ttl"