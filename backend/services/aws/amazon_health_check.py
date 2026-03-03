import urllib.request
import urllib.error
import ssl
from typing import Optional

def check_portal_health(url: str) -> Optional[str]:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ctx.options |= ssl.OP_LEGACY_SERVER_CONNECT
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 SewaSahayak/1.0'})
    
    try:
        urllib.request.urlopen(req, context=ctx, timeout=10)
        return None
    except urllib.error.HTTPError as e:
        return f"Portal offline (HTTP {e.code})"
    except Exception as e:
        return f"Health check failed: {str(e)}"
