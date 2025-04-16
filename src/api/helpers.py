import logging
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def check_url_status(url: str, timeout: int = 5, verify: bool = True, allow_insecure: bool = False) -> bool:
    """
    Check if a URL is accessible.
    
    Args:
        url: The URL to check
        timeout: Connection timeout in seconds
        verify: Whether to verify SSL certificates
        allow_insecure: If True, retry with verify=False on SSL error
    
    Returns:
        True if accessible with 2xx status code, False otherwise
    """
    import requests
    from requests.exceptions import SSLError

    # Normalize URL if needed
    if not url.startswith(('http://', 'https://')):
        url = f"http://{url}"

    try:
        # First try HEAD request which is faster
        try:
            response = requests.head(
                url, 
                timeout=timeout, 
                allow_redirects=True, 
                verify=verify
            )
            if 200 <= response.status_code < 300:
                return True
        except SSLError as e:
            if allow_insecure:
                # If SSL validation fails and we allow insecure, retry without verification
                logger.warning(f"SSL verification failed for {url}, retrying without verification")
                response = requests.head(
                    url, 
                    timeout=timeout, 
                    allow_redirects=True, 
                    verify=False
                )
                if 200 <= response.status_code < 300:
                    return True
            else:
                raise e
        except Exception:
            # If HEAD fails, try GET
            pass
                
        # If HEAD didn't work or status code wasn't 2xx, try GET
        try:
            response = requests.get(
                url, 
                timeout=timeout, 
                allow_redirects=True, 
                verify=verify
            )
            return 200 <= response.status_code < 300
        except SSLError as e:
            if allow_insecure:
                # If SSL validation fails and we allow insecure, retry without verification
                logger.warning(f"SSL verification failed for {url}, retrying without verification")
                response = requests.get(
                    url, 
                    timeout=timeout, 
                    allow_redirects=True, 
                    verify=False
                )
                return 200 <= response.status_code < 300
            else:
                raise e
            
    except Exception as e:
        logger.error(f"Error checking URL {url}: {str(e)}")
        return False