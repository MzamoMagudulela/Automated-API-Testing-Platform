from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.settings import AppSetting
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Application Settings"])

@router.get("")
def get_app_settings(db: Session = Depends(get_db)):
    db_settings = db.query(AppSetting).all()
    res = {
        "allow_private_ips": settings.ALLOW_PRIVATE_IPS,
        "default_timeout_seconds": settings.DEFAULT_TIMEOUT_SECONDS,
        "max_timeout_seconds": settings.MAX_TIMEOUT_SECONDS,
        "max_response_size_bytes": settings.MAX_RESPONSE_SIZE_BYTES,
        "version": settings.VERSION,
    }
    for s in db_settings:
        if s.key == "allow_private_ips":
            res["allow_private_ips"] = s.value.lower() in ("true", "1")
    return res

@router.post("")
def update_app_settings(payload: Dict[str, Any], db: Session = Depends(get_db)):
    if "allow_private_ips" in payload:
        val_str = str(payload["allow_private_ips"]).lower()
        settings.ALLOW_PRIVATE_IPS = val_str in ("true", "1")
        setting_record = db.query(AppSetting).filter(AppSetting.key == "allow_private_ips").first()
        if not setting_record:
            setting_record = AppSetting(
                key="allow_private_ips",
                value=val_str,
                description="Allow testing local/private IP addresses",
            )
            db.add(setting_record)
        else:
            setting_record.value = val_str
        db.commit()

    return get_app_settings(db)
