import asyncio
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/mock", tags=["Mock Test Server"])

SAMPLE_USERS = [
    {"id": 1, "name": "Alice Johnson", "email": "alice@example.com", "role": "admin", "active": True},
    {"id": 2, "name": "Bob Smith", "email": "bob@example.com", "role": "developer", "active": True},
    {"id": 3, "name": "Charlie Brown", "email": "charlie@example.com", "role": "tester", "active": False},
]

class UserPayload(BaseModel):
    name: str
    email: str
    role: Optional[str] = "developer"
    active: Optional[bool] = True

@router.get("/users")
def get_mock_users(active: Optional[bool] = None, limit: int = 10):
    users = SAMPLE_USERS
    if active is not None:
        users = [u for u in users if u["active"] == active]
    return {
        "status": "success",
        "count": len(users[:limit]),
        "data": users[:limit],
    }

@router.get("/users/{id}")
def get_mock_user(id: int):
    for u in SAMPLE_USERS:
        if u["id"] == id:
            return {"status": "success", "data": u}
    raise HTTPException(status_code=404, detail=f"User with ID {id} not found.")

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_mock_user(payload: UserPayload):
    new_user = {
        "id": len(SAMPLE_USERS) + 101,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "active": payload.active,
    }
    return {
        "status": "success",
        "message": "User created successfully",
        "data": new_user,
    }

@router.put("/users/{id}")
def update_mock_user(id: int, payload: UserPayload):
    return {
        "status": "success",
        "message": f"User {id} updated successfully",
        "data": {
            "id": id,
            "name": payload.name,
            "email": payload.email,
            "role": payload.role,
            "active": payload.active,
        },
    }

@router.delete("/users/{id}")
def delete_mock_user(id: int):
    return {
        "status": "success",
        "message": f"User {id} deleted successfully",
    }

@router.api_route("/echo", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def echo_request(request: Request):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="replace") if body_bytes else None
    
    headers_dict = dict(request.headers)
    params_dict = dict(request.query_params)
    
    return {
        "status": "success",
        "method": request.method,
        "url": str(request.url),
        "headers": headers_dict,
        "query_params": params_dict,
        "body": body_str,
    }

@router.get("/delay/{seconds}")
async def delay_response(seconds: float):
    sec = min(max(seconds, 0.0), 10.0)
    await asyncio.sleep(sec)
    return {
        "status": "success",
        "delayed_seconds": sec,
        "message": f"Response completed after {sec} seconds",
    }

@router.get("/status/{code}")
def custom_status_code(code: int):
    if code < 200 or code > 599:
        raise HTTPException(status_code=400, detail="Invalid HTTP status code requested.")
    
    if code >= 400:
        raise HTTPException(status_code=code, detail=f"Simulated error with status code {code}")
        
    return Response(
        content=f'{{"status": "success", "code": {code}}}',
        status_code=code,
        media_type="application/json",
    )

@router.get("/protected")
def protected_endpoint(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        return {
            "status": "success",
            "message": "Authenticated successfully with Bearer Token!",
            "auth_type": "Bearer",
            "token_preview": token[:4] + "***",
        }
    if x_api_key:
        return {
            "status": "success",
            "message": "Authenticated successfully with API Key!",
            "auth_type": "ApiKey",
            "key_preview": x_api_key[:4] + "***",
        }

    raise HTTPException(
        status_code=401,
        detail="Unauthorized. Provide 'Authorization: Bearer <token>' or 'X-API-Key: <key>' header.",
    )
