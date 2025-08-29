"""
Módulo para actualizar archivos SHACL desde repositorios remotos.
"""
import os
import time
import logging
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .config import SHACL_DIR, SHACL_REMOTE_URLS, SHACL_UPDATE_CONFIG, SSL_VERIFY

logger = logging.getLogger(__name__)

class ShaclUpdater:
    """Clase para gestionar la actualización de archivos SHACL desde URLs remotas."""
    
    def __init__(self, update_config: Dict = None):
        """
        Inicializa el actualizador de archivos SHACL.
        
        Args:
            update_config: Configuración opcional para anular la configuración por defecto
        """
        self.config = update_config or SHACL_UPDATE_CONFIG
        self.last_check_file = os.path.join(SHACL_DIR, ".last_update_check")
        self._ensure_directories_exist()
        
    def _ensure_directories_exist(self) -> None:
        """Asegura que todas las carpetas necesarias para los archivos SHACL existan."""
        for local_path in SHACL_REMOTE_URLS.keys():
            directory = os.path.dirname(local_path)
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def should_check_for_updates(self) -> bool:
        """
        Determina si se debe comprobar si hay actualizaciones disponibles
        basado en el intervalo configurado.
        
        Returns:
            True si se debe comprobar, False en caso contrario
        """
        if self.config.get("force_update", False):
            return True
            
        try:
            if not os.path.exists(self.last_check_file):
                return True
                
            with open(self.last_check_file, 'r') as f:
                last_check = datetime.fromisoformat(f.read().strip())
                
            interval = timedelta(days=self.config.get("update_interval_days", 7))
            return datetime.now() > (last_check + interval)
        except Exception as e:
            logger.warning(f"Error checking last update timestamp: {e}")
            return True
    
    def _update_last_check_timestamp(self) -> None:
        """Actualiza el timestamp de la última verificación."""
        try:
            with open(self.last_check_file, 'w') as f:
                f.write(datetime.now().isoformat())
        except Exception as e:
            logger.error(f"Error updating last check timestamp: {e}")
    
    def download_file(self, url: str, local_path: str) -> bool:
        """
        Descarga un archivo desde una URL remota.
        
        Args:
            url: URL del archivo a descargar
            local_path: Ruta local donde guardar el archivo
            
        Returns:
            True si la descarga fue exitosa, False en caso contrario
        """
        try:
            logger.info(f"Downloading SHACL file from {url}")
            response = requests.get(
                url, 
                timeout=self.config.get("timeout", 30),
                verify=SSL_VERIFY
            )
            
            if response.status_code == 200:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Successfully downloaded {url} to {local_path}")
                return True
            else:
                logger.warning(f"Failed to download {url}: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error downloading {url}: {e}")
            return False
    
    def update_shacl_files(self, force: bool = False) -> Tuple[int, int]:
        """
        Actualiza todos los archivos SHACL configurados.
        
        Args:
            force: Si se debe forzar la actualización, ignorando la configuración
            
        Returns:
            Tupla con (nº de archivos actualizados, nº total de archivos)
        """
        if not force and not self.should_check_for_updates():
            logger.info("Skipping SHACL update check based on update interval")
            return (0, len(SHACL_REMOTE_URLS))
            
        updated_count = 0
        total_files = len(SHACL_REMOTE_URLS)
        
        for local_path, url in SHACL_REMOTE_URLS.items():
            # Si el archivo no existe o se fuerza la actualización, descargarlo
            if force or not os.path.exists(local_path):
                if self.download_file(url, local_path):
                    updated_count += 1
        
        # Actualizar timestamp de última verificación
        self._update_last_check_timestamp()
        
        logger.info(f"SHACL update completed: {updated_count}/{total_files} files updated")
        return (updated_count, total_files)


# Instancia del actualizador para uso global
updater = ShaclUpdater()

def update_shacl_files(force: bool = False) -> Tuple[int, int]:
    """
    Función de conveniencia para actualizar archivos SHACL.
    
    Args:
        force: Si se debe forzar la actualización
        
    Returns:
        Tupla con (nº de archivos actualizados, nº total de archivos)
    """
    return updater.update_shacl_files(force)