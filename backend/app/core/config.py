import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "API TestLab"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./api_testlab.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    
    # Security & SSRF
    ALLOW_PRIVATE_IPS: bool = False  # Set to True only for internal testing if explicitly allowed
    MAX_RESPONSE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    DEFAULT_TIMEOUT_SECONDS: float = 30.0
    MAX_TIMEOUT_SECONDS: float = 120.0
    
    # Rate Limiting
    MAX_REQUESTS_PER_MINUTE: int = 120

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
