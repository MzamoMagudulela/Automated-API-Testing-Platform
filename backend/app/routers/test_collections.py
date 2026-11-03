from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.test_collection import TestCollection
from app.models.execution import CollectionExecution
from app.schemas.test_collection import TestCollectionCreate, TestCollectionUpdate, TestCollectionOut, TestCollectionDetailOut
from app.schemas.execution import CollectionExecutionOut
from app.services.collection_runner import run_test_collection

router = APIRouter(prefix="/collections", tags=["Test Collections"])

@router.get("", response_model=List[TestCollectionOut])
def get_collections(db: Session = Depends(get_db)):
    collections = db.query(TestCollection).order_by(TestCollection.name.asc()).all()
    results = []
    for c in collections:
        c_out = TestCollectionOut(
            id=c.id,
            name=c.name,
            description=c.description,
            created_at=c.created_at,
            updated_at=c.updated_at,
            test_cases_count=len(c.test_cases),
        )
        results.append(c_out)
    return results

@router.post("", response_model=TestCollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(col_in: TestCollectionCreate, db: Session = Depends(get_db)):
    existing = db.query(TestCollection).filter(TestCollection.name == col_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Collection '{col_in.name}' already exists.")

    col = TestCollection(
        name=col_in.name,
        description=col_in.description,
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return TestCollectionOut(
        id=col.id,
        name=col.name,
        description=col.description,
        created_at=col.created_at,
        updated_at=col.updated_at,
        test_cases_count=0,
    )

@router.get("/{id}", response_model=TestCollectionDetailOut)
def get_collection(id: int, db: Session = Depends(get_db)):
    col = db.query(TestCollection).filter(TestCollection.id == id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return col

@router.put("/{id}", response_model=TestCollectionOut)
def update_collection(id: int, col_in: TestCollectionUpdate, db: Session = Depends(get_db)):
    col = db.query(TestCollection).filter(TestCollection.id == id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")

    if col_in.name and col_in.name != col.name:
        existing = db.query(TestCollection).filter(TestCollection.name == col_in.name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Collection '{col_in.name}' already exists.")
        col.name = col_in.name

    if col_in.description is not None:
        col.description = col_in.description

    db.commit()
    db.refresh(col)
    return TestCollectionOut(
        id=col.id,
        name=col.name,
        description=col.description,
        created_at=col.created_at,
        updated_at=col.updated_at,
        test_cases_count=len(col.test_cases),
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(id: int, db: Session = Depends(get_db)):
    col = db.query(TestCollection).filter(TestCollection.id == id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")
    db.delete(col)
    db.commit()
    return None

@router.post("/{id}/run", response_model=CollectionExecutionOut)
async def execute_collection(
    id: int,
    environment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        col_run = await run_test_collection(
            collection_id=id,
            db=db,
            environment_id=environment_id,
        )
        return col_run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Collection run failed: {str(e)}")

@router.get("/{id}/runs", response_model=List[CollectionExecutionOut])
def get_collection_runs(id: int, db: Session = Depends(get_db)):
    runs = (
        db.query(CollectionExecution)
        .filter(CollectionExecution.collection_id == id)
        .order_by(CollectionExecution.executed_at.desc())
        .limit(50)
        .all()
    )
    return runs
