import json
from typing import Any, Dict, List, Optional
import jsonpath_ng.ext as jp_ext
from app.schemas.assertion import AssertionCreate, AssertionResultOut

def normalize_compare_values(actual: Any, expected_str: Optional[str]) -> tuple[Any, Any]:
    """
    Attempts to coerce expected_str to match the type of actual for fair comparison.
    """
    if expected_str is None:
        return actual, None

    if actual is None:
        if expected_str.lower() in ("null", "none"):
            return None, None
        return None, expected_str

    if isinstance(actual, bool):
        expected_bool = expected_str.lower() in ("true", "1")
        return actual, expected_bool

    if isinstance(actual, (int, float)):
        try:
            expected_num = float(expected_str) if "." in expected_str else int(expected_str)
            return actual, expected_num
        except ValueError:
            pass

    return str(actual), expected_str


def evaluate_operator(actual: Any, operator: str, expected_str: Optional[str]) -> tuple[bool, str, str]:
    """
    Evaluates operator. Returns (passed, actual_repr, message).
    """
    op = (operator or "equals").lower().strip()

    if op == "exists":
        passed = actual is not None
        msg = f"Target exists ({actual})" if passed else "Target does not exist"
        return passed, str(actual) if actual is not None else "None", msg

    if op == "is_null":
        passed = actual is None
        msg = "Target is null" if passed else f"Expected null, but got '{actual}'"
        return passed, str(actual), msg

    if op == "is_not_null":
        passed = actual is not None
        msg = f"Target is not null ({actual})" if passed else "Expected not null, but got null"
        return passed, str(actual), msg

    norm_actual, norm_expected = normalize_compare_values(actual, expected_str)

    if op in ("equals", "eq", "=="):
        passed = norm_actual == norm_expected
        msg = f"Passed: {norm_actual} == {norm_expected}" if passed else f"Failed: Expected '{norm_expected}', got '{norm_actual}'"
        return passed, str(norm_actual), msg

    if op in ("not_equals", "neq", "!="):
        passed = norm_actual != norm_expected
        msg = f"Passed: {norm_actual} != {norm_expected}" if passed else f"Failed: Expected value not to equal '{norm_expected}'"
        return passed, str(norm_actual), msg

    if op in ("contains", "in"):
        if norm_actual is None:
            return False, "None", f"Failed: Target is null, cannot contain '{expected_str}'"
        passed = str(expected_str or "") in str(norm_actual)
        msg = f"Passed: '{norm_actual}' contains '{expected_str}'" if passed else f"Failed: '{norm_actual}' does not contain '{expected_str}'"
        return passed, str(norm_actual), msg

    if op in ("not_contains", "not_in"):
        if norm_actual is None:
            return True, "None", f"Passed: Target is null, does not contain '{expected_str}'"
        passed = str(expected_str or "") not in str(norm_actual)
        msg = f"Passed: '{norm_actual}' does not contain '{expected_str}'" if passed else f"Failed: '{norm_actual}' contains '{expected_str}'"
        return passed, str(norm_actual), msg

    try:
        num_actual = float(norm_actual)
        num_expected = float(norm_expected)

        if op in ("greater_than", "gt", ">"):
            passed = num_actual > num_expected
            msg = f"Passed: {num_actual} > {num_expected}" if passed else f"Failed: Expected > {num_expected}, got {num_actual}"
            return passed, str(norm_actual), msg

        if op in ("greater_than_or_equal", "gte", ">="):
            passed = num_actual >= num_expected
            msg = f"Passed: {num_actual} >= {num_expected}" if passed else f"Failed: Expected >= {num_expected}, got {num_actual}"
            return passed, str(norm_actual), msg

        if op in ("less_than", "lt", "<"):
            passed = num_actual < num_expected
            msg = f"Passed: {num_actual} < {num_expected}" if passed else f"Failed: Expected < {num_expected}, got {num_actual}"
            return passed, str(norm_actual), msg

        if op in ("less_than_or_equal", "lte", "<="):
            passed = num_actual <= num_expected
            msg = f"Passed: {num_actual} <= {num_expected}" if passed else f"Failed: Expected <= {num_expected}, got {num_actual}"
            return passed, str(norm_actual), msg
    except (ValueError, TypeError):
        return False, str(actual), f"Numeric comparison failed for operator '{op}' on values ('{actual}', '{expected_str}')"

    return False, str(actual), f"Unknown assertion operator '{operator}'"


def extract_jsonpath(data: Any, path_expr: str) -> Any:
    """
    Extracts value from json structure using JSONPath.
    Accepts expressions like '$.data.id', 'data.id', 'items[0].name'.
    """
    if not path_expr:
        return data

    clean_path = path_expr.strip()
    if not clean_path.startswith("$"):
        clean_path = f"$.{clean_path}"

    try:
        parser = jp_ext.parse(clean_path)
        matches = parser.find(data)
        if not matches:
            return None
        if len(matches) == 1:
            return matches[0].value
        return [m.value for m in matches]
    except Exception:
        # Fallback to simple dot-lookup
        curr = data
        parts = path_expr.lstrip("$. ").split(".")
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                return None
        return curr


def evaluate_assertions(
    assertions: List[AssertionCreate],
    status_code: Optional[int],
    response_time_ms: float,
    response_headers: Dict[str, str],
    response_body: Optional[str],
) -> List[AssertionResultOut]:
    """
    Evaluates all assertions against the response and returns a list of detailed results.
    """
    results: List[AssertionResultOut] = []

    # Parse response body as JSON once if possible
    parsed_json: Optional[Any] = None
    if response_body:
        try:
            parsed_json = json.loads(response_body)
        except Exception:
            parsed_json = None

    for assertion in assertions:
        atype = (assertion.assertion_type or "").lower().strip()
        target = assertion.target or ""
        op = assertion.operator or "equals"
        expected = assertion.expected_value

        try:
            if atype == "status_code":
                passed, actual_repr, msg = evaluate_operator(status_code, op, expected)
            elif atype == "response_time":
                passed, actual_repr, msg = evaluate_operator(round(response_time_ms, 2), op, expected)
            elif atype == "header":
                # Find matching header case-insensitively
                actual_val = None
                target_lower = target.lower().strip()
                for h_k, h_v in (response_headers or {}).items():
                    if h_k.lower() == target_lower:
                        actual_val = h_v
                        break
                passed, actual_repr, msg = evaluate_operator(actual_val, op, expected)
            elif atype == "body_contains":
                passed, actual_repr, msg = evaluate_operator(response_body or "", op, expected)
            elif atype in ("json_field", "jsonpath"):
                if parsed_json is None:
                    passed = False
                    actual_repr = "None (Invalid JSON)"
                    msg = "Response body is not valid JSON, cannot evaluate JSONPath"
                else:
                    extracted = extract_jsonpath(parsed_json, target)
                    passed, actual_repr, msg = evaluate_operator(extracted, op, expected)
            else:
                passed = False
                actual_repr = "N/A"
                msg = f"Unsupported assertion type '{atype}'"

            results.append(
                AssertionResultOut(
                    assertion_type=assertion.assertion_type,
                    target=target or None,
                    operator=op,
                    expected_value=expected,
                    actual_value=str(actual_repr),
                    passed=passed,
                    message=msg,
                )
            )
        except Exception as e:
            results.append(
                AssertionResultOut(
                    assertion_type=assertion.assertion_type,
                    target=target or None,
                    operator=op,
                    expected_value=expected,
                    actual_value="Error",
                    passed=False,
                    message=f"Evaluation error: {str(e)}",
                )
            )

    return results
