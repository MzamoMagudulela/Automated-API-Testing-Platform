import re
from typing import Dict, Any, Tuple

VAR_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}")

def resolve_variables(text: str, variables: Dict[str, str]) -> str:
    """
    Substitutes occurrences of {{variable_name}} in text with values from variables dictionary.
    """
    if not text or not variables:
        return text

    def replace_match(match):
        var_name = match.group(1).strip()
        return str(variables.get(var_name, match.group(0)))

    return VAR_PATTERN.sub(replace_match, text)


def resolve_dict_variables(data: Dict[str, Any], variables: Dict[str, str]) -> Dict[str, Any]:
    """
    Recursively resolves {{var}} expressions in dictionary keys and string values.
    """
    if not data or not variables:
        return data

    resolved = {}
    for k, v in data.items():
        resolved_key = resolve_variables(str(k), variables)
        if isinstance(v, str):
            resolved[resolved_key] = resolve_variables(v, variables)
        elif isinstance(v, dict):
            resolved[resolved_key] = resolve_dict_variables(v, variables)
        else:
            resolved[resolved_key] = v
    return resolved


def resolve_full_url(url: str, base_url: str, variables: Dict[str, str]) -> str:
    """
    Combines base_url and url, and resolves all variables.
    """
    # 1. Resolve variables in both base_url and url
    res_base = resolve_variables(base_url.strip(), variables) if base_url else ""
    res_url = resolve_variables(url.strip(), variables) if url else ""

    if not res_url:
        return res_base

    # If res_url is already a full URL (starts with http:// or https://)
    if res_url.startswith("http://") or res_url.startswith("https://"):
        return res_url

    # Otherwise prepend base_url if available
    if res_base:
        res_base_clean = res_base.rstrip("/")
        res_url_clean = res_url.lstrip("/")
        return f"{res_base_clean}/{res_url_clean}"

    return res_url
