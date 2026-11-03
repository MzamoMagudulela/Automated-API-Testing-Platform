# API TestLab – Automated API Testing Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Pytest](https://img.shields.io/badge/Pytest-8.3+-0A9EDC?logo=pytest&logoColor=white)](https://pytest.org)
[![Vitest](https://img.shields.io/badge/Vitest-Ready-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

**API TestLab** is an automated REST API testing, validation, monitoring, and assertion platform designed for software engineers. It enables developers to construct HTTP requests, configure multi-variable environments, write automated JSONPath and latency assertions, organize tests into executable collections, view performance metrics on a central dashboard, and generate audit reports in CSV and PDF formats.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Security & SSRF Mitigation](#security--ssrf-mitigation)
5. [Getting Started (Local Development)](#getting-started-local-development)
6. [Docker & Containerized Deployment](#docker--containerized-deployment)
7. [Automated Testing Suite](#automated-testing-suite)
8. [API Documentation (OpenAPI / Swagger)](#api-documentation-openapi--swagger)
9. [Built-in Mock API Testbed](#built-in-mock-api-testbed)
10. [Database Design](#database-design)

---

## Key Features

### 1. Interactive Request Builder & Inspector
- Full support for **GET, POST, PUT, DELETE, and PATCH** requests.
- Dynamic key-value editors for custom **HTTP Headers** and **Query Parameters**.
- Syntax-highlighted **JSON Request Body** editor with one-click JSON prettifier.
- Authentication mechanisms: **Bearer Token**, **API Key** (Header or Query), and **HTTP Basic Auth**.
- Live **Response Inspector** with tabs for Formatted JSON Body, Response Headers, Outbound Request Details, and Assertion Validation.

### 2. Automated Assertion Engine
- Automatic validation across:
  - **Status Codes** (`equals`, `not_equals`, `less_than`, `greater_than`).
  - **Maximum Latency Thresholds** (`less_than_or_equal`).
  - **JSONPath Evaluations** (e.g. `$.status == "success"`, `$.data.user.id >= 1`, `exists`, `is_null`, `is_not_null`).
  - **Response Headers** (case-insensitive key lookup, substring containment).
  - **Body Content Matching** (`contains`, `not_contains`).
- Clear **PASS / FAIL** indicators with actual vs. expected diagnostic output.

### 3. Test Cases & Test Collections
- Create, update, tag, sort, and organize reusable test cases.
- Group tests into **Test Collections** (test suites) for sequential batch execution.
- Real-time runner modal showing live step-by-step progress, duration, passed/failed counts, and audit logs.

### 4. Multi-Environment Management
- Seamlessly toggle between **Development**, **Testing**, and **Production**.
- Automatic variable substitution syntax: `{{baseUrl}}`, `{{token}}`, `{{apiKey}}` in URLs, headers, and request bodies.
- Credential masking: sensitive environment variables flagged with `is_secret=True` are masked in frontend responses and logs.

### 5. Central Analytics Dashboard
- Calculated directly from actual database records (no mock or hardcoded statistics):
  - Total tests executed, passed tests, failed tests, overall success percentage.
  - Average latency response time across all executions.
  - 7-day activity trend area chart (Passed vs. Failed executions).
  - Daily latency trend line chart.
  - HTTP method distribution breakdown.
  - Quick-inspect recent executions table.

### 6. Professional Reporting & Export
- Downloadable **CSV** execution log export.
- Downloadable **PDF** executive summary reports generated with ReportLab, complete with summary tables, latency analytics, and failed assertion diagnostics.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, HTTPX, jsonpath-ng, ReportLab |
| **Database** | SQLite (default development), ready for PostgreSQL via SQLAlchemy ORM |
| **Testing** | Pytest & pytest-asyncio (Backend), Vitest & Testing Library (Frontend) |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## Architecture Overview

```
API_Testing_System/
├── backend/
│   ├── app/
│   │   ├── core/           # Security, SSRF validators, App settings
│   │   ├── database/       # SQLAlchemy engine, sessions, DB initialization
│   │   ├── models/         # ORM entities (TestCase, Collection, Environment, Execution)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # HTTP engine (HTTPX), Assertion engine, Variable resolver, ReportLab
│   │   ├── routers/        # REST endpoints (Dashboard, Execute, Test Cases, Collections, etc.)
│   │   └── main.py         # FastAPI application entrypoint
│   ├── tests/              # Pytest test suite (Security, Assertions, Resolvers, API endpoints)
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container image
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout (Sidebar, Navbar), common Badges, Modals
│   │   ├── pages/          # Dashboard, RequestBuilder, TestCases, Collections, Environments, History, Reports, Settings
│   │   ├── services/       # Axios API integration client
│   │   ├── types/          # TypeScript interface definitions
│   │   ├── hooks/          # useTheme dark/light mode hook
│   │   └── test/           # Vitest unit test suite
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite bundler & API proxy configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── Dockerfile          # Multi-stage production build container
├── docker-compose.yml      # Orchestration for frontend and backend
├── .env.example            # Environment variable template
└── README.md               # Project documentation
```

---

## Security & SSRF Mitigation

Outbound HTTP request execution includes enterprise-grade protection against Server-Side Request Forgery:

1. **Protocol Whitelist:** Only `http://` and `https://` schemes are permitted. Schemes like `file://`, `ftp://`, or `gopher://` are strictly rejected.
2. **Private IP & Loopback Filter:** Hostnames are pre-resolved via socket lookups. Requests targeting loopback (`127.0.0.0/8`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or link-local ranges (`169.254.0.0/16`) are blocked by default.
3. **Cloud Metadata Shield:** Blocks attempts to access AWS, Google Cloud, and Azure internal metadata services (`169.254.169.254` and `metadata.google.internal`).
4. **Credential Masking:** Headers such as `Authorization`, `X-API-Key`, and cookies are masked when returned in logs and inspection details.
5. **Payload Ceilings:** Enforces a maximum response size limit of 10MB to prevent denial-of-service memory exhaustion.
6. **Configurable Dev Mode:** For local testing of offline mock endpoints, developers can toggle "Allow Local / Private IP Targets" in the Settings page or via `ALLOW_PRIVATE_IPS=true`.

---

## Getting Started (Local Development)

### Prerequisites
- **Python 3.11+** installed
- **Node.js v18+** & **npm** installed

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database automatically creates and seeds initial collections, environments, test cases, and historical data on initial startup.*

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## Docker & Containerized Deployment

Run the entire full-stack application with a single command:

```bash
docker-compose up --build
```

- **Frontend:** Accessible at `http://localhost:3000`
- **Backend API:** Accessible at `http://localhost:8000`
- **API Docs (Swagger):** Accessible at `http://localhost:8000/docs`

---

## Automated Testing Suite

### 1. Backend Tests (Pytest)
```bash
cd backend
python -m pytest -v
```
**Coverage includes:**
- Security & SSRF protections (blocking loopback, link-local, cloud metadata, invalid schemes).
- Header masking and secret masking.
- Variable resolver and dictionary substitution.
- Assertion engine operators (status code, latency, headers, body, JSONPath).
- REST endpoints for Environments, Collections, Test Cases, and Dashboard metrics.

### 2. Frontend Tests (Vitest)
```bash
cd frontend
npm test
```
**Coverage includes:**
- Badge components (MethodBadge, StatusBadge, ResultBadge).
- Modal interactions, open/close events, and escape key behaviors.

---

## API Documentation (OpenAPI / Swagger)

FastAPI automatically generates interactive OpenAPI documentation:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health Check:** `http://localhost:8000/health`

### Key REST Endpoints:
- `POST /api/v1/execute` - Ad-hoc request execution with timeout and assertion evaluation.
- `GET /api/v1/dashboard/stats` - Live database-calculated dashboard metrics.
- `GET /api/v1/test-cases` - Filterable, searchable test case repository.
- `POST /api/v1/test-cases/{id}/execute` - Run individual test case against active environment.
- `GET /api/v1/collections` - List test suites and grouped test cases.
- `POST /api/v1/collections/{id}/run` - Execute entire collection test suite.
- `GET /api/v1/environments` - Retrieve configured environments and variables.
- `GET /api/v1/history` - Searchable audit history of all executions.
- `GET /api/v1/reports/export/csv` - Download execution report in CSV format.
- `GET /api/v1/reports/export/pdf` - Download executive test documentation in PDF format.

---

## Built-in Mock API Testbed

API TestLab comes with an integrated mock API server for offline testing and immediate demonstration:

- `GET /api/v1/mock/users` - Returns sample user dataset.
- `POST /api/v1/mock/users` - Creates user and returns 201 Created.
- `GET /api/v1/mock/echo` - Echoes query parameters, headers, and request body.
- `GET /api/v1/mock/delay/{seconds}` - Simulates latency for response-time testing.
- `GET /api/v1/mock/status/{code}` - Simulates specific HTTP status codes (e.g. 404, 500).
- `GET /api/v1/mock/protected` - Requires Bearer token or API key authentication.

---

## Database Design

Structured using SQLAlchemy ORM with foreign key cascades and indexes:

- **`environments`** & **`environment_variables`**: Environment configurations with secret value masking flags.
- **`test_collections`**: Grouped test suites.
- **`test_cases`**: Test definitions with HTTP method, headers, params, body, and auth settings.
- **`test_case_assertions`**: Configured assertion rules (status code, latency, JSONPath, header).
- **`test_executions`**: Historical execution audit records with timings, status codes, and bodies.
- **`execution_assertion_results`**: Individual PASS / FAIL assertion results for each execution.
- **`collection_executions`**: Summary execution records for collection test runs.
- **`app_settings`**: Global platform settings and SSRF mode flags.

---

## License

MIT License. Designed and engineered for software engineering demonstration and automated REST API validation.
