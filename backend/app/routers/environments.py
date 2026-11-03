from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.environment import Environment, EnvironmentVariable
from app.schemas.environment import EnvironmentCreate, EnvironmentUpdate, EnvironmentOut
from app.core.security import mask_secret_value

router = APIRouter(prefix="/environments", tags=["Environments"])

def mask_env_response(env: Environment) -> EnvironmentOut:
    env_out = EnvironmentOut.model_validate(env)
    for v in env_out.variables:
        if v.is_secret:
            v.value = mask_secret_value(v.value)
    return env_out

@router.get("", response_model=List[EnvironmentOut])
def get_environments(db: Session = Depends(get_db)):
    envs = db.query(Environment).order_by(Environment.id.asc()).all()
    return [mask_env_response(e) for e in envs]

@router.post("", response_model=EnvironmentOut, status_code=status.HTTP_201_CREATED)
def create_environment(env_in: EnvironmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Environment).filter(Environment.name == env_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Environment with name '{env_in.name}' already exists.")

    # If this environment is set active, deactivate others
    if env_in.is_active:
        db.query(Environment).update({Environment.is_active: False})

    env = Environment(
        name=env_in.name,
        base_url=env_in.base_url,
        description=env_in.description,
        is_active=env_in.is_active,
    )
    db.add(env)
    db.commit()
    db.refresh(env)

    if env_in.variables:
        for v in env_in.variables:
            db_var = EnvironmentVariable(
                environment_id=env.id,
                key=v.key.strip(),
                value=v.value,
                is_secret=v.is_secret,
            )
            db.add(db_var)
        db.commit()
        db.refresh(env)

    return mask_env_response(env)

@router.get("/{id}", response_model=EnvironmentOut)
def get_environment(id: int, reveal_secrets: bool = Query(False), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found.")
    
    if reveal_secrets:
        return EnvironmentOut.model_validate(env)
    return mask_env_response(env)

@router.put("/{id}", response_model=EnvironmentOut)
def update_environment(id: int, env_in: EnvironmentUpdate, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found.")

    if env_in.name and env_in.name != env.name:
        existing = db.query(Environment).filter(Environment.name == env_in.name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Environment '{env_in.name}' already exists.")
        env.name = env_in.name

    if env_in.base_url is not None:
        env.base_url = env_in.base_url
    if env_in.description is not None:
        env.description = env_in.description
    if env_in.is_active is not None:
        if env_in.is_active:
            db.query(Environment).filter(Environment.id != id).update({Environment.is_active: False})
        env.is_active = env_in.is_active

    if env_in.variables is not None:
        # Replace variables
        db.query(EnvironmentVariable).filter(EnvironmentVariable.environment_id == id).delete()
        for v in env_in.variables:
            db_var = EnvironmentVariable(
                environment_id=env.id,
                key=v.key.strip(),
                value=v.value,
                is_secret=v.is_secret,
            )
            db.add(db_var)

    db.commit()
    db.refresh(env)
    return mask_env_response(env)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_environment(id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found.")
    db.delete(env)
    db.commit()
    return None

@router.post("/{id}/activate", response_model=EnvironmentOut)
def activate_environment(id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found.")
    
    db.query(Environment).update({Environment.is_active: False})
    env.is_active = True
    db.commit()
    db.refresh(env)
    return mask_env_response(env)
