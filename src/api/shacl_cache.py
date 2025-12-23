"""
SHACL Cache Manager
Handles caching and loading of SHACL files from remote URLs.
"""
import os
import time
import hashlib
import logging
import json
from typing import Dict, List, Optional
from pathlib import Path
import requests
from threading import Lock

logger = logging.getLogger(__name__)

class SHACLCache:
    """
    Cache manager for SHACL files.
    Downloads and caches SHACL files from remote URLs to improve performance.
    """
    
    def __init__(self, cache_dir: str = "/tmp/shacl_cache", cache_ttl: int = 24 * 60 * 60):
        """
        Initialize the SHACL cache.
        
        Args:
            cache_dir: Directory to store cached files
            cache_ttl: Cache time-to-live in seconds (default: 24 hours)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_ttl = cache_ttl
        self.memory_cache: Dict[str, str] = {}
        self.cache_metadata: Dict[str, dict] = {}
        self._lock = Lock()
        
        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Load existing cache metadata
        self._load_cache_metadata()
    
    def _get_cache_key(self, url: str) -> str:
        """Generate a cache key from URL."""
        return hashlib.md5(url.encode()).hexdigest()
    
    def _get_cache_file_path(self, cache_key: str) -> Path:
        """Get the file path for a cached file."""
        return self.cache_dir / f"{cache_key}.ttl"
    
    def _get_metadata_file_path(self) -> Path:
        """Get the path for cache metadata file."""
        return self.cache_dir / "cache_metadata.json"
    
    def _load_cache_metadata(self):
        """Load cache metadata from disk."""
        metadata_file = self._get_metadata_file_path()
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    self.cache_metadata = json.load(f)
                logger.info(f"Loaded cache metadata for {len(self.cache_metadata)} files")
            except Exception as e:
                logger.warning(f"Failed to load cache metadata: {e}")
                self.cache_metadata = {}
    
    def _save_cache_metadata(self):
        """Save cache metadata to disk."""
        try:
            with open(self._get_metadata_file_path(), 'w') as f:
                json.dump(self.cache_metadata, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save cache metadata: {e}")
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached file is still valid."""
        if cache_key not in self.cache_metadata:
            return False
        
        cached_time = self.cache_metadata[cache_key].get('timestamp', 0)
        return (time.time() - cached_time) < self.cache_ttl
    
    def _download_file(self, url: str) -> str:
        """Download SHACL file from URL."""
        logger.info(f"Downloading SHACL file from: {url}")
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; MQA-SHACL-Cache/1.0)',
                'Accept': 'text/turtle, application/rdf+xml, text/plain'
            }
            
            response = requests.get(url, timeout=30, headers=headers)
            response.raise_for_status()
            
            content = response.text
            logger.info(f"Successfully downloaded {len(content)} characters from {url}")
            return content
            
        except requests.RequestException as e:
            logger.error(f"Failed to download SHACL file from {url}: {e}")
            raise
    
    def get_shacl(self, url: str) -> str:
        """
        Get SHACL content from cache or download if not cached.
        
        Args:
            url: URL of the SHACL file
            
        Returns:
            Content of the SHACL file
        """
        with self._lock:
            cache_key = self._get_cache_key(url)
            
            # Check memory cache first
            if cache_key in self.memory_cache and self._is_cache_valid(cache_key):
                logger.debug(f"Using memory cache for {url}")
                return self.memory_cache[cache_key]
            
            # Check disk cache
            cache_file = self._get_cache_file_path(cache_key)
            if cache_file.exists() and self._is_cache_valid(cache_key):
                logger.debug(f"Loading from disk cache: {url}")
                try:
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Store in memory cache
                    self.memory_cache[cache_key] = content
                    return content
                    
                except Exception as e:
                    logger.warning(f"Failed to read cache file {cache_file}: {e}")
            
            # Download and cache
            try:
                content = self._download_file(url)
                
                # Save to disk cache
                try:
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    # Update metadata
                    self.cache_metadata[cache_key] = {
                        'url': url,
                        'timestamp': time.time(),
                        'size': len(content)
                    }
                    self._save_cache_metadata()
                    
                except Exception as e:
                    logger.warning(f"Failed to save to disk cache: {e}")
                
                # Store in memory cache
                self.memory_cache[cache_key] = content
                
                logger.info(f"Cached SHACL file from {url}")
                return content
                
            except Exception as e:
                logger.error(f"Failed to get SHACL content from {url}: {e}")
                raise
    
    def get_multiple_shacl_files(self, urls: List[str]) -> Dict[str, str]:
        """
        Get multiple SHACL files efficiently.
        
        Args:
            urls: List of SHACL file URLs
            
        Returns:
            Dictionary mapping URLs to their content
        """
        result = {}
        for url in urls:
            try:
                result[url] = self.get_shacl(url)
            except Exception as e:
                logger.error(f"Failed to get SHACL file {url}: {e}")
                raise
        
        return result
    
    def clear_cache(self):
        """Clear all cached files."""
        with self._lock:
            # Clear memory cache
            self.memory_cache.clear()
            
            # Clear disk cache
            try:
                for file_path in self.cache_dir.glob("*.ttl"):
                    file_path.unlink()
                
                metadata_file = self._get_metadata_file_path()
                if metadata_file.exists():
                    metadata_file.unlink()
                
                self.cache_metadata.clear()
                logger.info("Cleared all SHACL cache files")
                
            except Exception as e:
                logger.error(f"Failed to clear cache: {e}")
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            total_files = len(self.cache_metadata)
            memory_files = len(self.memory_cache)
            
            # Calculate total disk usage
            total_size = sum(
                metadata.get('size', 0) 
                for metadata in self.cache_metadata.values()
            )
            
            return {
                'total_cached_files': total_files,
                'memory_cached_files': memory_files,
                'total_disk_size_bytes': total_size,
                'cache_directory': str(self.cache_dir),
                'cache_ttl_hours': self.cache_ttl / 3600
            }

# Global cache instance
_shacl_cache = None

def get_shacl_cache() -> SHACLCache:
    """Get the global SHACL cache instance."""
    global _shacl_cache
    if _shacl_cache is None:
        _shacl_cache = SHACLCache()
    return _shacl_cache