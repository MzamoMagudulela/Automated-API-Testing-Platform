import ipaddress
import socket
import urllib.parse
from typing import Optional, Tuple
from app.core.config import settings

# Sensitive header names to mask in logs and responses
SENSITIVE_HEADER_KEYS = {
    "authorization",
    "x-api-key",
    "api-key",
    "token",
    "x-auth-token",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "secret",
}

# Blocked IP networks
BLOCKED_NETWORKS = [
    # IPv4 loopback
    ipaddress.ip_network("127.0.0.0/8"),
    # IPv4 private networks (RFC 1918)
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    # IPv4 link-local & cloud metadata (AWS/GCP/Azure)
    ipaddress.ip_network("169.254.0.0/16"),
    # IPv4 broadcast / "this" network
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("224.0.0.0/4"),  # Multicast
    ipaddress.ip_network("240.0.0.0/4"),  # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6 loopback
    ipaddress.ip_network("::1/128"),
    # IPv6 unspecified
    ipaddress.ip_network("::/128"),
    # IPv6 unique local (RFC 4193)
    ipaddress.ip_network("fc00::/7"),
    # IPv6 link-local (RFC 4291)
    ipaddress.ip_network("fe80::/10"),
    # IPv6 site-local
    ipaddress.ip_network("fec0::/10"),
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

class SecurityValidationError(Exception):
    """Raised when an outbound URL fails security or SSRF validation."""
    pass


def is_ip_blocked(ip_addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address belongs to any blocked / private range."""
    for network in BLOCKED_NETWORKS:
        if ip_addr in network:
            return True
    return False


def validate_url_security(url: str, allow_private: Optional[bool] = None) -> Tuple[str, str, int]:
    """
    Validates a URL against SSRF attacks:
    - Verifies HTTP/HTTPS scheme
    - Validates hostname syntax
    - Resolves DNS and blocks loopback, private IPs, metadata endpoints
    Returns (normalized_url, hostname, port).
    """
    if allow_private is None:
        allow_private = settings.ALLOW_PRIVATE_IPS

    if not url or not isinstance(url, str):
        raise SecurityValidationError("URL cannot be empty.")

    clean_url = url.strip()
    try:
        parsed = urllib.parse.urlsplit(clean_url)
    except Exception as e:
        raise SecurityValidationError(f"Invalid URL structure: {str(e)}")

    if parsed.scheme.lower() not in ("http", "https"):
        raise SecurityValidationError(f"Forbidden protocol '{parsed.scheme}'. Only http:// and https:// are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise SecurityValidationError("URL must include a valid host.")

    hostname_lower = hostname.lower()

    if not allow_private:
        # Check against blocked hostnames and suffixes
        if hostname_lower in BLOCKED_HOSTNAMES:
            raise SecurityValidationError(f"Host '{hostname}' is not permitted (blocked localhost/internal target).")

        if hostname_lower.endswith(".localhost") or hostname_lower.endswith(".internal") or hostname_lower.endswith(".local"):
            raise SecurityValidationError(f"Internal domain '{hostname}' is not permitted.")

        # Resolve hostname to all associated IPs to prevent DNS rebinding
        try:
            port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
            # Use getaddrinfo to retrieve both IPv4 and IPv6
            addr_info = socket.getaddrinfo(hostname, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
            resolved_ips = {item[4][0] for item in addr_info}
        except socket.gaierror as e:
            raise SecurityValidationError(f"DNS resolution failed for '{hostname}': {str(e)}")
        except Exception as e:
            raise SecurityValidationError(f"Network error resolving host '{hostname}': {str(e)}")

        for ip_str in resolved_ips:
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if is_ip_blocked(ip_obj):
                    raise SecurityValidationError(
                        f"SSRF Protection: Host '{hostname}' resolves to private/prohibited IP ({ip_str})."
                    )
            except ValueError:
                raise SecurityValidationError(f"Invalid resolved IP '{ip_str}' for host '{hostname}'.")

    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    return clean_url, hostname, port


def mask_sensitive_headers(headers: dict) -> dict:
    """Mask sensitive HTTP header values for secure logging and responses."""
    if not headers:
        return {}
    masked = {}
    for k, v in headers.items():
        if k.lower() in SENSITIVE_HEADER_KEYS:
            if isinstance(v, str) and len(v) > 8:
                masked[k] = f"{v[:3]}***{v[-3:]}"
            else:
                masked[k] = "******"
        else:
            masked[k] = v
    return masked


def mask_secret_value(value: str) -> str:
    """Mask sensitive string value."""
    if not value:
        return ""
    if len(value) <= 4:
        return "****"
    return f"{value[:2]}****{value[-2:]}"
