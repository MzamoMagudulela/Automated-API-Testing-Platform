from app.services.variable_resolver import resolve_variables, resolve_dict_variables, resolve_full_url

def test_resolve_variables():
    vars_dict = {"host": "api.github.com", "user": "octocat", "token": "secret123"}
    text = "https://{{host}}/users/{{user}}?token={{token}}"
    result = resolve_variables(text, vars_dict)
    assert result == "https://api.github.com/users/octocat?token=secret123"

def test_resolve_variables_with_spaces():
    vars_dict = {"endpoint": "users"}
    text = "https://example.com/{{ endpoint }}"
    result = resolve_variables(text, vars_dict)
    assert result == "https://example.com/users"

def test_resolve_dict_variables():
    vars_dict = {"auth": "Bearer test1234", "apiVersion": "v2"}
    headers = {
        "Authorization": "{{auth}}",
        "X-Version": "{{apiVersion}}",
        "Accept": "application/json",
    }
    resolved = resolve_dict_variables(headers, vars_dict)
    assert resolved["Authorization"] == "Bearer test1234"
    assert resolved["X-Version"] == "v2"
    assert resolved["Accept"] == "application/json"

def test_resolve_full_url():
    vars_dict = {"service": "billing"}
    base_url = "https://api.corp.net/{{service}}"

    # Relative path
    rel_url = "/invoices/2026"
    full = resolve_full_url(rel_url, base_url, vars_dict)
    assert full == "https://api.corp.net/billing/invoices/2026"

    # Absolute URL override
    abs_url = "https://external.payment.com/webhook"
    full_abs = resolve_full_url(abs_url, base_url, vars_dict)
    assert full_abs == "https://external.payment.com/webhook"
