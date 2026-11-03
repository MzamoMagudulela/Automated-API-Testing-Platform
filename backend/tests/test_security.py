import pytest
from app.core.security import validate_url_security, SecurityValidationError, mask_sensitive_headers, mask_secret_value

def test_block_invalid_schemes():
    with pytest.raises(SecurityValidationError) as exc:
        validate_url_security("file:///etc/passwd", allow_private=False)
    assert "Forbidden protocol" in str(exc.value)

    with pytest.raises(SecurityValidationError) as exc:
        validate_url_security("ftp://example.com/test", allow_private=False)
    assert "Forbidden protocol" in str(exc.value)

def test_block_localhost_and_loopback():
    with pytest.raises(SecurityValidationError) as exc:
        validate_url_security("http://localhost:8080/test", allow_private=False)
    assert "blocked localhost/internal target" in str(exc.value) or "SSRF Protection" in str(exc.value)

    with pytest.raises(SecurityValidationError) as exc:
        validate_url_security("http://127.0.0.1:9000", allow_private=False)
    assert "blocked localhost/internal target" in str(exc.value) or "SSRF Protection" in str(exc.value)

def test_block_cloud_metadata():
    with pytest.raises(SecurityValidationError) as exc:
        validate_url_security("http://169.254.169.254/latest/meta-data/", allow_private=False)
    assert "SSRF Protection" in str(exc.value) or "resolves to private" in str(exc.value)

def test_mask_sensitive_headers():
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer my_super_secret_token_12345",
        "X-API-Key": "ak_secret_key_abcdef",
        "Accept": "*/*",
    }
    masked = mask_sensitive_headers(headers)
    assert masked["Content-Type"] == "application/json"
    assert masked["Accept"] == "*/*"
    assert "super_secret" not in masked["Authorization"]
    assert "***" in masked["Authorization"]
    assert "***" in masked["X-API-Key"]

def test_mask_secret_value():
    assert mask_secret_value("short") == "sh****rt"
    assert mask_secret_value("ab") == "****"
    assert mask_secret_value("my_production_database_password") == "my****rd"
