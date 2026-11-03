import base64
import json
import time
from typing import Any, Dict, Optional, Tuple
import httpx
from app.core.config import settings
from app.core.security import validate_url_security, SecurityValidationError, mask_sensitive_headers
from app.schemas.request import ExecuteResponse

STATUS_TEXT_MAP = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
}

def format_body(content_bytes: bytes, content_type: str) -> str:
    """Decodes and pretty-formats JSON response bodies if possible."""
    try:
        text = content_bytes.decode("utf-8", errors="replace")
    except Exception:
        text = str(content_bytes)

    if "application/json" in content_type.lower() or text.strip().startswith(("{", "[")):
        try:
            parsed = json.loads(text)
            return json.dumps(parsed, indent=2)
        except Exception:
            return text
    return text


def prepare_auth(
    auth_type: Optional[str],
    auth_config: Optional[Dict[str, Any]],
    headers: Dict[str, str],
    query_params: Dict[str, str],
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """Applies authentication parameters to headers or query parameters."""
    out_headers = dict(headers or {})
    out_params = dict(query_params or {})

    if not auth_type or auth_type.lower() == "none" or not auth_config:
        return out_headers, out_params

    auth_type_clean = auth_type.lower().strip()

    if auth_type_clean == "bearer":
        token = auth_config.get("token", "")
        if token:
            out_headers["Authorization"] = f"Bearer {token}"

    elif auth_type_clean == "api_key":
        key_name = auth_config.get("key", "X-API-Key")
        key_value = auth_config.get("value", "")
        add_to = auth_config.get("addTo", "header").lower()
        if key_name and key_value:
            if add_to == "query":
                out_params[key_name] = key_value
            else:
                out_headers[key_name] = key_value

    elif auth_type_clean == "basic":
        username = auth_config.get("username", "")
        password = auth_config.get("password", "")
        credentials = f"{username}:{password}"
        encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")
        out_headers["Authorization"] = f"Basic {encoded}"

    return out_headers, out_params


async def execute_http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    query_params: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    auth_type: Optional[str] = "none",
    auth_config: Optional[Dict[str, Any]] = None,
    timeout: Optional[float] = 30.0,
    allow_private_ips: Optional[bool] = None,
) -> ExecuteResponse:
    """
    Executes an outbound HTTP request with SSRF validation, timing, and error handling.
    """
    method = (method or "GET").upper().strip()
    timeout_val = min(max(float(timeout or settings.DEFAULT_TIMEOUT_SECONDS), 0.5), settings.MAX_TIMEOUT_SECONDS)

    # Prepare Auth
    req_headers, req_params = prepare_auth(auth_type, auth_config, headers or {}, query_params or {})

    # SSRF Validation
    try:
        clean_url, hostname, port = validate_url_security(url, allow_private=allow_private_ips)
    except SecurityValidationError as e:
        return ExecuteResponse(
            status_code=None,
            status_text="Security Blocked",
            response_time_ms=0.0,
            response_size_bytes=0,
            headers={},
            body=None,
            error_message=f"SSRF Security Violation: {str(e)}",
            is_success=False,
            resolved_url=url,
            resolved_headers=req_headers,
        )

    # Prepare Body
    content = None
    if body and method in ("POST", "PUT", "PATCH", "DELETE"):
        content = body.encode("utf-8")
        if "content-type" not in [k.lower() for k in req_headers.keys()]:
            if body.strip().startswith(("{", "[")):
                req_headers["Content-Type"] = "application/json"
            else:
                req_headers["Content-Type"] = "text/plain"

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            verify=False, # Allow testing targets with self-signed certs
            follow_redirects=True,
            timeout=httpx.Timeout(timeout_val, connect=10.0),
        ) as client:
            resp = await client.request(
                method=method,
                url=clean_url,
                headers=req_headers,
                params=req_params,
                content=content,
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            # Check response size limit
            body_bytes = resp.content
            if len(body_bytes) > settings.MAX_RESPONSE_SIZE_BYTES:
                return ExecuteResponse(
                    status_code=resp.status_code,
                    status_text=STATUS_TEXT_MAP.get(resp.status_code, resp.reason_phrase or "Unknown"),
                    response_time_ms=round(elapsed_ms, 2),
                    response_size_bytes=len(body_bytes),
                    headers=dict(resp.headers),
                    body="Response exceeded maximum permitted size of 10MB.",
                    error_message="Response exceeded maximum payload limit.",
                    is_success=False,
                    resolved_url=clean_url,
                    resolved_headers=req_headers,
                )

            content_type = resp.headers.get("content-type", "")
            formatted = format_body(body_bytes, content_type)
            status_text = STATUS_TEXT_MAP.get(resp.status_code, resp.reason_phrase or "Unknown")

            return ExecuteResponse(
                status_code=resp.status_code,
                status_text=status_text,
                response_time_ms=round(elapsed_ms, 2),
                response_size_bytes=len(body_bytes),
                headers=dict(resp.headers),
                body=formatted,
                error_message=None,
                is_success=200 <= resp.status_code < 400,
                resolved_url=str(resp.url),
                resolved_headers=req_headers,
            )

    except httpx.TimeoutException as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ExecuteResponse(
            status_code=None,
            status_text="Timeout",
            response_time_ms=round(elapsed_ms, 2),
            response_size_bytes=0,
            headers={},
            body=None,
            error_message=f"Request timed out after {timeout_val:.1f} seconds: {str(e)}",
            is_success=False,
            resolved_url=clean_url,
            resolved_headers=req_headers,
        )
    except httpx.ConnectError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ExecuteResponse(
            status_code=None,
            status_text="Connection Error",
            response_time_ms=round(elapsed_ms, 2),
            response_size_bytes=0,
            headers={},
            body=None,
            error_message=f"Could not connect to host '{hostname}': {str(e)}",
            is_success=False,
            resolved_url=clean_url,
            resolved_headers=req_headers,
        )
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ExecuteResponse(
            status_code=None,
            status_text="Error",
            response_time_ms=round(elapsed_ms, 2),
            response_size_bytes=0,
            headers={},
            body=None,
            error_message=f"Request execution failed: {str(e)}",
            is_success=False,
            resolved_url=clean_url,
            resolved_headers=req_headers,
        )
