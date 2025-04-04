"""
TinyDB repository implementation.

This module implements the repository pattern using TinyDB
for storing and retrieving quality reports.
"""

from tinydb import TinyDB, Query
from ..models import QualityReport
from typing import List, Optional, Dict, Any
from datetime import datetime


class TinyDBRepository:
    """Repository implementation using TinyDB for storage."""
    
    def __init__(self, db_path="mqa_db.json"):
        """
        Initialize the TinyDB connection.
        
        Args:
            db_path: Path to the TinyDB JSON file
        """
        self.db = TinyDB(db_path)
    
    def insert_report(self, report_data: Dict[str, Any]) -> int:
        """
        Validate and insert a new report.
        
        Args:
            report_data: Dictionary with report data
            
        Returns:
            ID of the inserted document
            
        Raises:
            ValidationError: If data doesn't meet the schema requirements
        """
        # Use Pydantic for validation
        validated_report = QualityReport(**report_data)
        
        # Insert into TinyDB (automatically serializes to dict)
        doc_id = self.db.insert(validated_report.dict())
        return doc_id
    
    def get_latest_report(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Get the most recent report for a URL.
        
        Args:
            url: URL of the catalog to query
            
        Returns:
            Most recent report or None if no reports exist
        """
        Report = Query()
        reports = self.db.search(Report.source == url)
        
        if not reports:
            return None
            
        # Sort by date and return the most recent
        return sorted(reports, key=lambda x: x['created'], reverse=True)[0]
    
    def get_history(self, url: str) -> List[Dict[str, Any]]:
        """
        Get the history of reports for a URL.
        
        Args:
            url: URL of the catalog to query
            
        Returns:
            List of historical reports
        """
        Report = Query()
        return self.db.search(Report.source == url)
        
    def get_reports_by_date_range(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Get reports within a date range.
        
        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            List of reports in the range
        """
        Report = Query()
        return self.db.search(
            (Report.created >= start_date) & 
            (Report.created <= end_date)
        )
        
    def get_reports_by_rating(self, rating: str) -> List[Dict[str, Any]]:
        """
        Get reports with a specific rating.
        
        Args:
            rating: Rating to search for
            
        Returns:
            List of reports with that rating
        """
        Report = Query()
        return self.db.search(Report.rating == rating)