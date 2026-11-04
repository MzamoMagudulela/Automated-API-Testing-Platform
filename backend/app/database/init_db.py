from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.environment import Environment, EnvironmentVariable
from app.models.test_collection import TestCollection
from app.models.collection_folder import CollectionFolder
from app.models.test_case import TestCase
from app.models.assertion import TestCaseAssertion
from app.models.execution import TestExecution, ExecutionAssertionResult, CollectionExecution
from app.models.settings import AppSetting

def init_database():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            res = conn.execute(text("PRAGMA table_info(test_cases)"))
            cols = [row[1] for row in res.fetchall()]
            if cols and "folder_id" not in cols:
                conn.execute(text("ALTER TABLE test_cases ADD COLUMN folder_id INTEGER REFERENCES collection_folders(id) ON DELETE SET NULL"))
                conn.commit()
        except Exception:
            pass
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Environment).first() is not None:
            return

        print("Seeding initial API TestLab database...")

        # 1. Seed Environments
        env_dev = Environment(
            name="Development (Mock API)",
            base_url="http://localhost:8000/api/v1/mock",
            description="Local mock testing endpoints for rapid offline testing and validation.",
            is_active=True,
        )
        db.add(env_dev)
        db.commit()
        db.refresh(env_dev)

        db.add_all([
            EnvironmentVariable(environment_id=env_dev.id, key="token", value="dev-token-auth-xyz8899", is_secret=True),
            EnvironmentVariable(environment_id=env_dev.id, key="apiKey", value="ak_live_77339900aa11", is_secret=True),
            EnvironmentVariable(environment_id=env_dev.id, key="userId", value="1", is_secret=False),
        ])

        env_prod = Environment(
            name="Public JSONPlaceholder",
            base_url="https://jsonplaceholder.typicode.com",
            description="Public REST API testbed for realistic external testing.",
            is_active=False,
        )
        db.add(env_prod)
        db.commit()
        db.refresh(env_prod)

        db.add_all([
            EnvironmentVariable(environment_id=env_prod.id, key="postId", value="1", is_secret=False),
            EnvironmentVariable(environment_id=env_prod.id, key="userId", value="1", is_secret=False),
        ])
        db.commit()

        # 2. Seed Test Collections
        col_users = TestCollection(
            name="User Management Service",
            description="End-to-end tests for user creation, retrieval, and authentication.",
        )
        col_external = TestCollection(
            name="External REST Integration",
            description="Integration tests against public external HTTP endpoints.",
        )
        db.add_all([col_users, col_external])
        db.commit()
        db.refresh(col_users)
        db.refresh(col_external)

        # 3. Seed Test Cases
        tc1 = TestCase(
            collection_id=col_users.id,
            name="Get Active Users List",
            description="Fetches users and validates response schema and count.",
            method="GET",
            url="{{baseUrl}}/users",
            expected_status_code=200,
            max_response_time_ms=1000,
            order_index=1,
        )
        tc2 = TestCase(
            collection_id=col_users.id,
            name="Create New Engineer User",
            description="Submits JSON payload to create a new user.",
            method="POST",
            url="{{baseUrl}}/users",
            headers={"Content-Type": "application/json"},
            body='{\n  "name": "Sarah Connor",\n  "email": "sarah@cyberdyne.org",\n  "role": "lead_architect",\n  "active": true\n}',
            expected_status_code=201,
            max_response_time_ms=1000,
            order_index=2,
        )
        tc3 = TestCase(
            collection_id=col_users.id,
            name="Verify Bearer Authentication",
            description="Tests secured endpoint using environment variable token.",
            method="GET",
            url="{{baseUrl}}/protected",
            auth_type="bearer",
            auth_config={"token": "{{token}}"},
            expected_status_code=200,
            max_response_time_ms=800,
            order_index=3,
        )
        tc4 = TestCase(
            collection_id=col_external.id,
            name="Fetch Public Post by ID",
            description="Fetches post #1 from JSONPlaceholder.",
            method="GET",
            url="https://jsonplaceholder.typicode.com/posts/{{postId}}",
            expected_status_code=200,
            max_response_time_ms=2000,
            order_index=1,
        )

        db.add_all([tc1, tc2, tc3, tc4])
        db.commit()
        db.refresh(tc1)
        db.refresh(tc2)
        db.refresh(tc3)
        db.refresh(tc4)

        # Assertions for TC1
        db.add_all([
            TestCaseAssertion(test_case_id=tc1.id, assertion_type="status_code", target="status_code", operator="equals", expected_value="200"),
            TestCaseAssertion(test_case_id=tc1.id, assertion_type="jsonpath", target="$.status", operator="equals", expected_value="success"),
            TestCaseAssertion(test_case_id=tc1.id, assertion_type="response_time", target="latency", operator="less_than_or_equal", expected_value="1000"),
        ])

        # Assertions for TC2
        db.add_all([
            TestCaseAssertion(test_case_id=tc2.id, assertion_type="status_code", target="status_code", operator="equals", expected_value="201"),
            TestCaseAssertion(test_case_id=tc2.id, assertion_type="jsonpath", target="$.data.name", operator="equals", expected_value="Sarah Connor"),
        ])

        # Assertions for TC3
        db.add_all([
            TestCaseAssertion(test_case_id=tc3.id, assertion_type="status_code", target="status_code", operator="equals", expected_value="200"),
            TestCaseAssertion(test_case_id=tc3.id, assertion_type="jsonpath", target="$.auth_type", operator="equals", expected_value="Bearer"),
        ])

        # Assertions for TC4
        db.add_all([
            TestCaseAssertion(test_case_id=tc4.id, assertion_type="status_code", target="status_code", operator="equals", expected_value="200"),
            TestCaseAssertion(test_case_id=tc4.id, assertion_type="jsonpath", target="$.id", operator="equals", expected_value="1"),
        ])
        db.commit()

        # 4. Seed Seed Executions over the last 5 days for Dashboard Charts
        now = datetime.now(timezone.utc)
        sample_execs = [
            # Day -4
            {"name": "Get Active Users List", "url": "http://localhost:8000/api/v1/mock/users", "method": "GET", "status": 200, "ms": 42.5, "ok": True, "delta": timedelta(days=4, hours=2)},
            {"name": "Fetch Public Post by ID", "url": "https://jsonplaceholder.typicode.com/posts/1", "method": "GET", "status": 200, "ms": 185.0, "ok": True, "delta": timedelta(days=4, hours=1)},
            # Day -3
            {"name": "Create New Engineer User", "url": "http://localhost:8000/api/v1/mock/users", "method": "POST", "status": 201, "ms": 55.2, "ok": True, "delta": timedelta(days=3, hours=5)},
            {"name": "Verify Bearer Authentication", "url": "http://localhost:8000/api/v1/mock/protected", "method": "GET", "status": 401, "ms": 32.1, "ok": False, "delta": timedelta(days=3, hours=3), "err": "Unauthorized: invalid credentials"},
            # Day -2
            {"name": "Get Active Users List", "url": "http://localhost:8000/api/v1/mock/users", "method": "GET", "status": 200, "ms": 38.0, "ok": True, "delta": timedelta(days=2, hours=4)},
            {"name": "Verify Bearer Authentication", "url": "http://localhost:8000/api/v1/mock/protected", "method": "GET", "status": 200, "ms": 35.8, "ok": True, "delta": timedelta(days=2, hours=2)},
            # Day -1
            {"name": "Update User Profile", "url": "http://localhost:8000/api/v1/mock/users/1", "method": "PUT", "status": 200, "ms": 61.4, "ok": True, "delta": timedelta(days=1, hours=3)},
            {"name": "Delete User Record", "url": "http://localhost:8000/api/v1/mock/users/2", "method": "DELETE", "status": 200, "ms": 48.7, "ok": True, "delta": timedelta(days=1, hours=1)},
            # Today
            {"name": "Get Active Users List", "url": "http://localhost:8000/api/v1/mock/users", "method": "GET", "status": 200, "ms": 39.1, "ok": True, "delta": timedelta(minutes=45)},
            {"name": "Fetch Public Post by ID", "url": "https://jsonplaceholder.typicode.com/posts/1", "method": "GET", "status": 200, "ms": 162.3, "ok": True, "delta": timedelta(minutes=15)},
        ]

        for s in sample_execs:
            exec_time = now - s["delta"]
            ex_rec = TestExecution(
                test_case_id=tc1.id if s["method"] == "GET" and "users" in s["url"] else None,
                collection_id=col_users.id if "mock" in s["url"] else col_external.id,
                environment_id=env_dev.id if "mock" in s["url"] else env_prod.id,
                test_name=s["name"],
                endpoint_url=s["url"],
                http_method=s["method"],
                status_code=s["status"],
                status_text="OK" if s["status"] == 200 else ("Created" if s["status"] == 201 else "Unauthorized"),
                response_time_ms=s["ms"],
                response_size_bytes=480,
                response_headers={"content-type": "application/json"},
                response_body='{"status": "success"}',
                error_message=s.get("err"),
                is_success=s["ok"],
                executed_at=exec_time,
            )
            db.add(ex_rec)
            db.commit()
            db.refresh(ex_rec)

            # Add an assertion record
            db.add(ExecutionAssertionResult(
                execution_id=ex_rec.id,
                assertion_type="status_code",
                target="status_code",
                operator="equals",
                expected_value="200" if s["status"] == 200 else str(s["status"]),
                actual_value=str(s["status"]),
                passed=s["ok"],
                message="Status code matched expectation" if s["ok"] else "Status code mismatch",
            ))
            db.commit()

        # Settings
        db.add(AppSetting(
            key="allow_private_ips",
            value="true",  # Default true for local developer testing of mock endpoints
            description="Allow testing local addresses like localhost/127.0.0.1",
        ))
        db.commit()

        print("Database initialized and seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
