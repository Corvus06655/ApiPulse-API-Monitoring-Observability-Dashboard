import ipaddress
import socket
import time
from urllib.parse import urljoin, urlsplit

import requests


MAX_REDIRECTS = 5
REQUEST_TIMEOUT_SECONDS = 10


def _validate_public_http_url(url: str) -> None:
    """Reject local/private destinations to reduce SSRF risk in a public service."""
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only valid HTTP or HTTPS URLs are allowed")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing embedded credentials are not allowed")

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".localhost"):
        raise ValueError("Localhost URLs cannot be monitored")

    try:
        addresses = [ipaddress.ip_address(hostname)]
    except ValueError:
        try:
            resolved = socket.getaddrinfo(hostname, parsed.port, type=socket.SOCK_STREAM)
        except socket.gaierror as error:
            raise ValueError(f"Could not resolve hostname: {hostname}") from error
        addresses = [ipaddress.ip_address(item[4][0]) for item in resolved]

    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError("URLs resolving to private or non-public IP addresses cannot be monitored")


def check_api(url: str) -> dict:
    start_time = time.perf_counter()
    current_url = url
    response = None

    try:
        for redirect_count in range(MAX_REDIRECTS + 1):
            _validate_public_http_url(current_url)
            response = requests.get(
                current_url,
                timeout=REQUEST_TIMEOUT_SECONDS,
                allow_redirects=False,
                stream=True,
            )

            if response.status_code not in {301, 302, 303, 307, 308}:
                response_time = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "url": url,
                    "status_code": response.status_code,
                    "response_time_ms": response_time,
                    "is_healthy": 200 <= response.status_code < 400,
                    "error": None,
                }

            location = response.headers.get("Location")
            if not location:
                response_time = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "url": url,
                    "status_code": response.status_code,
                    "response_time_ms": response_time,
                    "is_healthy": False,
                    "error": "Redirect response did not include a Location header",
                }

            if redirect_count == MAX_REDIRECTS:
                raise ValueError("Too many redirects while checking API")

            current_url = urljoin(current_url, location)
            response.close()
            response = None

    except (requests.RequestException, ValueError, OSError) as error:
        response_time = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "url": url,
            "status_code": None,
            "response_time_ms": response_time,
            "is_healthy": False,
            "error": str(error),
        }
    finally:
        if response is not None:
            response.close()

    response_time = round((time.perf_counter() - start_time) * 1000, 2)
    return {
        "url": url,
        "status_code": None,
        "response_time_ms": response_time,
        "is_healthy": False,
        "error": "API check failed for an unknown reason",
    }
