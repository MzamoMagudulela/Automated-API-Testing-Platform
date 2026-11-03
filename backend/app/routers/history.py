from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.execution import TestExecution
from app.schemas.execution import ExecutionOut, ExecutionDetailOut

router = APIRouter(prefix="/history", tags=["Execution History"])

@router.get("", response_model=List[ExecutionOut])
def get_execution_history(
    method: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"), # pass, fail, all
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(TestExecution)

    if method:
        query = query.filter(TestExecution.http_method == method.upper())
    if status_filter:
        if status_filter.lower() == "pass":
            query = query.filter(TestExecution.is_success == True)
        elif status_filter.lower() == "fail":
            query = query.filter(TestExecution.is_success == False)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (TestExecution.test_name.ilike(search_fmt)) |
            (TestExecution.endpoint_url.ilike(search_fmt))
        )

    executions = query.order_by(TestExecution.executed_at.desc()).offset(offset).limit(limit).all()
    return executions

@router.get("/{id}", response_model=ExecutionDetailOut)
def get_execution_detail(id: int, db: Session = Depends(get_db)):
    exec_record = db.query(TestExecution).filter(TestExecution.id == id).first()
    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution record not found.")
    return exec_record

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_execution(id: int, db: Session = Depends(get_db)):
    exec_record = db.query(TestExecution).filter(TestExecution.id == id).first()
    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution record not found.")
    db.delete(exec_record)
    db.commit()
    return None

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_history(db: Session = Depends(get_db)):
    db.query(TestExecution).delete()
    db.commit()
    return None
