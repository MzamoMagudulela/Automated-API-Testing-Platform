import time
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.test_collection import TestCollection
from app.models.collection_folder import CollectionFolder
from app.models.test_case import TestCase
from app.models.environment import Environment
from app.models.execution import CollectionExecution, TestExecution, ExecutionAssertionResult
from app.schemas.test_collection import (
    TestCollectionCreate,
    TestCollectionUpdate,
    TestCollectionOut,
    TestCollectionDetailOut,
)
from app.schemas.collection_folder import (
    CollectionFolderCreate,
    CollectionFolderUpdate,
    CollectionFolderOut,
    CollectionFolderDetailOut,
)
from app.schemas.execution import CollectionExecutionOut
from app.schemas.assertion import AssertionCreate
from app.services.collection_runner import run_test_collection
from app.services.http_engine import execute_http_request
from app.services.assertion_engine import evaluate_assertions
from app.services.variable_resolver import resolve_dict_variables, resolve_full_url

router = APIRouter(prefix="/collections", tags=["Test Collections"])


# --- Collection Endpoints ---

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
            folders_count=len(c.folders),
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
        folders_count=0,
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
        folders_count=len(col.folders),
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(id: int, db: Session = Depends(get_db)):
    col = db.query(TestCollection).filter(TestCollection.id == id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")
    db.delete(col)
    db.commit()
    return None


# --- Folder Management Endpoints ---

@router.get("/{collection_id}/folders", response_model=List[CollectionFolderOut])
def get_collection_folders(collection_id: int, db: Session = Depends(get_db)):
    col = db.query(TestCollection).filter(TestCollection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")

    folders = (
        db.query(CollectionFolder)
        .filter(CollectionFolder.collection_id == collection_id)
        .order_by(CollectionFolder.order_index.asc(), CollectionFolder.name.asc())
        .all()
    )
    results = []
    for f in folders:
        f_out = CollectionFolderOut(
            id=f.id,
            collection_id=f.collection_id,
            name=f.name,
            description=f.description,
            order_index=f.order_index,
            test_cases_count=len(f.test_cases),
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        results.append(f_out)
    return results


@router.post("/{collection_id}/folders", response_model=CollectionFolderOut, status_code=status.HTTP_201_CREATED)
def create_collection_folder(
    collection_id: int,
    folder_in: CollectionFolderCreate,
    db: Session = Depends(get_db),
):
    col = db.query(TestCollection).filter(TestCollection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")

    existing = (
        db.query(CollectionFolder)
        .filter(
            CollectionFolder.collection_id == collection_id,
            CollectionFolder.name == folder_in.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Folder '{folder_in.name}' already exists in this collection.",
        )

    folder = CollectionFolder(
        collection_id=collection_id,
        name=folder_in.name,
        description=folder_in.description,
        order_index=folder_in.order_index or 0,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    return CollectionFolderOut(
        id=folder.id,
        collection_id=folder.collection_id,
        name=folder.name,
        description=folder.description,
        order_index=folder.order_index,
        test_cases_count=0,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
    )


@router.get("/{collection_id}/folders/{folder_id}", response_model=CollectionFolderDetailOut)
def get_collection_folder(collection_id: int, folder_id: int, db: Session = Depends(get_db)):
    folder = (
        db.query(CollectionFolder)
        .filter(
            CollectionFolder.id == folder_id,
            CollectionFolder.collection_id == collection_id,
        )
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found in this collection.")
    return folder


@router.put("/{collection_id}/folders/{folder_id}", response_model=CollectionFolderOut)
def update_collection_folder(
    collection_id: int,
    folder_id: int,
    folder_in: CollectionFolderUpdate,
    db: Session = Depends(get_db),
):
    folder = (
        db.query(CollectionFolder)
        .filter(
            CollectionFolder.id == folder_id,
            CollectionFolder.collection_id == collection_id,
        )
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found in this collection.")

    if folder_in.name and folder_in.name != folder.name:
        existing = (
            db.query(CollectionFolder)
            .filter(
                CollectionFolder.collection_id == collection_id,
                CollectionFolder.name == folder_in.name,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Folder '{folder_in.name}' already exists in this collection.",
            )
        folder.name = folder_in.name

    if folder_in.description is not None:
        folder.description = folder_in.description
    if folder_in.order_index is not None:
        folder.order_index = folder_in.order_index

    db.commit()
    db.refresh(folder)

    return CollectionFolderOut(
        id=folder.id,
        collection_id=folder.collection_id,
        name=folder.name,
        description=folder.description,
        order_index=folder.order_index,
        test_cases_count=len(folder.test_cases),
        created_at=folder.created_at,
        updated_at=folder.updated_at,
    )


@router.delete("/{collection_id}/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection_folder(collection_id: int, folder_id: int, db: Session = Depends(get_db)):
    folder = (
        db.query(CollectionFolder)
        .filter(
            CollectionFolder.id == folder_id,
            CollectionFolder.collection_id == collection_id,
        )
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found in this collection.")

    db.delete(folder)
    db.commit()
    return None


# --- Run Collection & Folder ---

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


@router.post("/{collection_id}/folders/{folder_id}/run", response_model=CollectionExecutionOut)
async def execute_folder(
    collection_id: int,
    folder_id: int,
    environment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    folder = (
        db.query(CollectionFolder)
        .filter(
            CollectionFolder.id == folder_id,
            CollectionFolder.collection_id == collection_id,
        )
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found in this collection.")

    test_cases = folder.test_cases
    if not test_cases:
        raise HTTPException(status_code=400, detail="Folder contains no requests to execute.")

    # Fetch environment
    env_vars: Dict[str, str] = {}
    base_url = ""
    env = None
    if environment_id:
        env = db.query(Environment).filter(Environment.id == environment_id).first()
    else:
        env = db.query(Environment).filter(Environment.is_active == True).first()

    if env:
        base_url = env.base_url or ""
        for v in env.variables:
            env_vars[v.key] = v.value

    col_run = CollectionExecution(
        collection_id=collection_id,
        environment_id=env.id if env else None,
        collection_name=f"{folder.collection.name} / {folder.name}",
        total_tests=len(test_cases),
        passed_tests=0,
        failed_tests=0,
        duration_ms=0.0,
        status="running",
    )
    db.add(col_run)
    db.commit()
    db.refresh(col_run)

    start_all = time.perf_counter()
    passed_count = 0
    failed_count = 0

    for test_case in test_cases:
        full_url = resolve_full_url(test_case.url, base_url, env_vars)
        resolved_headers = resolve_dict_variables(test_case.headers or {}, env_vars)
        resolved_params = resolve_dict_variables(test_case.query_params or {}, env_vars)
        resolved_body = test_case.body
        if resolved_body and env_vars:
            from app.services.variable_resolver import resolve_variables
            resolved_body = resolve_variables(resolved_body, env_vars)

        exec_res = await execute_http_request(
            url=full_url,
            method=test_case.method,
            headers=resolved_headers,
            query_params=resolved_params,
            body=resolved_body,
            auth_type=test_case.auth_type,
            auth_config=test_case.auth_config,
        )

        active_assertions: List[AssertionCreate] = []
        if test_case.expected_status_code:
            active_assertions.append(
                AssertionCreate(
                    assertion_type="status_code",
                    target="Status Code",
                    operator="equals",
                    expected_value=str(test_case.expected_status_code),
                )
            )
        if test_case.max_response_time_ms:
            active_assertions.append(
                AssertionCreate(
                    assertion_type="response_time",
                    target="Response Time",
                    operator="less_than_or_equal",
                    expected_value=str(test_case.max_response_time_ms),
                )
            )
        for a in test_case.assertions:
            active_assertions.append(
                AssertionCreate(
                    assertion_type=a.assertion_type,
                    target=a.target,
                    operator=a.operator,
                    expected_value=a.expected_value,
                )
            )

        assertion_results = evaluate_assertions(
            assertions=active_assertions,
            status_code=exec_res.status_code,
            response_time_ms=exec_res.response_time_ms,
            response_headers=exec_res.headers,
            response_body=exec_res.body,
        )

        all_assertions_passed = all(ar.passed for ar in assertion_results) if assertion_results else exec_res.is_success
        test_passed = exec_res.error_message is None and all_assertions_passed
        if test_passed:
            passed_count += 1
        else:
            failed_count += 1

        test_exec = TestExecution(
            test_case_id=test_case.id,
            collection_id=collection_id,
            collection_execution_id=col_run.id,
            environment_id=env.id if env else None,
            test_name=test_case.name,
            endpoint_url=exec_res.resolved_url or full_url,
            http_method=test_case.method,
            request_headers=exec_res.resolved_headers,
            request_body=resolved_body,
            status_code=exec_res.status_code,
            status_text=exec_res.status_text,
            response_time_ms=exec_res.response_time_ms,
            response_size_bytes=exec_res.response_size_bytes,
            response_headers=exec_res.headers,
            response_body=exec_res.body,
            error_message=exec_res.error_message,
            is_success=test_passed,
        )
        db.add(test_exec)
        db.commit()
        db.refresh(test_exec)

        for ar in assertion_results:
            ar_model = ExecutionAssertionResult(
                execution_id=test_exec.id,
                assertion_type=ar.assertion_type,
                target=ar.target,
                operator=ar.operator,
                expected_value=ar.expected_value,
                actual_value=ar.actual_value,
                passed=ar.passed,
                message=ar.message,
            )
            db.add(ar_model)
        db.commit()

    total_duration_ms = (time.perf_counter() - start_all) * 1000.0
    col_run.passed_tests = passed_count
    col_run.failed_tests = failed_count
    col_run.duration_ms = round(total_duration_ms, 2)
    col_run.status = "passed" if failed_count == 0 else ("failed" if passed_count == 0 else "partial")

    db.commit()
    db.refresh(col_run)
    return col_run


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
