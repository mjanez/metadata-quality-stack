"""
Repository module initialization.

This package contains different repository implementations 
for storing and retrieving quality reports.
"""

from .tinydb_repo import TinyDBRepository

__all__ = ['TinyDBRepository']