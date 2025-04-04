"""
Test configuration and fixtures for the API module.
"""
import os
import pytest
from fastapi.testclient import TestClient
from tempfile import NamedTemporaryFile

from src.api.main import app
from src.api.repositories.tinydb_repo import TinyDBRepository

# Sample data for tests
SAMPLE_REPORT = {
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

@pytest.fixture
def test_db():
    """Create a temporary database file for testing."""
    with NamedTemporaryFile(delete=False) as temp_file:
        temp_db_path = temp_file.name
    
    yield temp_db_path
    
    # Cleanup after tests
    if os.path.exists(temp_db_path):
        os.unlink(temp_db_path)

@pytest.fixture
def repo(test_db):
    """Create a repository instance with the test database."""
    return TinyDBRepository(test_db)

@pytest.fixture
def client():
    """Create a FastAPI test client."""
    return TestClient(app)