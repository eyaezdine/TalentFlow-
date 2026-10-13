# TalentFlow - HR Recruitment Web Application with AI

> **A University Mini-Project by Team 6**  
> An enterprise-grade recruitment management platform (CRUD + Pipeline) augmented with privacy-preserving, fault-tolerant Artificial Intelligence powered by Claude API.

---

## 1. Project Overview & Architecture

TalentFlow streamlines the recruitment lifecycle for HR professionals. It allows recruiters to publish job offers, ingest and manage candidates, track candidate progress across an application pipeline (`New` -> `Screening` -> `Interview` -> `Offer` -> `Rejected`), and leverage Anthropic Claude AI to evaluate applicants while strictly protecting personally identifiable information (PII).

### High-Level Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Front-End (React + Vite)"]
        UI[Tailwind CSS UI]
        Router[React Router]
        ApiClient[Axios Client with Interceptors]
    end

    subgraph Server["Back-End (Node.js + Express)"]
        AuthMid[Auth & RBAC Middleware]
        Controllers[Express Controllers]
        ZodVal[Zod Request Validation]
        PrismaORM[Prisma ORM]
        
        subgraph AIModule["AI Privacy & Execution Engine"]
            Anonymizer[PII Anonymization Layer (R1)]
            Prompts[Versioned System Prompts (R4)]
            ClaudeClient[Claude Client + Timeout/Retry (R3)]
            ZodOutput[Zod JSON Output Validator (R2)]
        end
    end

    subgraph Storage["Data Tier"]
        SQLite[(SQLite Database)]
    end

    subgraph External["External Cloud"]
        ClaudeAPI[Anthropic Claude API]
    end

    UI --> Router --> ApiClient
    ApiClient -->|HTTP/REST + JWT| AuthMid
    AuthMid --> Controllers
    Controllers --> ZodVal
    Controllers --> PrismaORM --> SQLite
    Controllers --> AIModule
    Anonymizer -->|Masked Data Only| Prompts --> ClaudeClient
    ClaudeClient -->|HTTPS (15s AbortController)| ClaudeAPI
    ClaudeAPI -->|Raw JSON| ZodOutput
    ZodOutput --> Controllers
```

---

## 2. Core Functional Modules

### A. CRUD Core Operations
1. **Authentication & RBAC**: Secure JWT auth with bcrypt password hashing. Roles: `ADMIN` and `RECRUITER`.
2. **Job Offers**: Full CRUD with required skills tags, status (`DRAFT`, `OPEN`, `CLOSED`), and description.
3. **Candidates**: Comprehensive applicant profiles (name, email, phone, experience, skills, education, and raw CV text).
4. **Applications & Kanban Pipeline**: Associating candidates with job offers; status progression (`NEW`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`).
5. **Dashboard & Analytics**: Live KPI cards and status distribution chart.
6. **Search, Filter, Pagination**: High-efficiency querying across all data views.

### B. AI Module (3 Features)
1. **Candidate Professional Summary**: Generates a crisp 3-sentence professional summary and extracting core technical keywords.
2. **Candidate <-> Job Matching Score**: Comparative analysis returning a 0-100 score, itemized strengths, skill gaps, and a hiring recommendation.
3. **Tailored Interview Questions**: Context-aware generation of 5 targeted technical and behavioral interview questions tailored to the candidate's gaps and strengths.

---

## 3. Mandatory Architectural Rules Compliance

| Rule ID | Requirement | Implementation Specification |
|:---|:---|:---|
| **R1** | **PII Anonymization** | Anonymizer module (`server/src/ai/anonymize.js`) removes and masks names, emails, phone numbers, and addresses. Raw PII is never transmitted to LLM endpoints. |
| **R2** | **Strict Output Validation** | Force JSON output from Claude, parse, and validate against strict Zod schemas with a 1-time automatic retry before falling back. |
| **R3** | **Fault Tolerance & Resilience** | 15s `AbortController` timeout, 429 quota backoff handling, startup API key check, structured error codes (`AI_TIMEOUT`, `AI_QUOTA_EXCEEDED`, `AI_INVALID_OUTPUT`). |
| **R4** | **Prompt Versioning** | Independent prompt templates stored under `server/src/ai/prompts/` for auditability and defense presentation. |
| **R5** | **Zero Secret Leakage** | All secrets confined to `.env` files; only `.env.example` committed to version control. |

---

## 4. Team Members & Roles

This project follows a strict **Single-Pusher Git Model** where **M1 (Integrator)** handles all commits and merges to ensure pristine commit history and attribution:

| Member | Role | Core Responsibilities | Target Defense Focus |
|:---|:---|:---|:---|
| **M1** (Eya Ezdine) | Project Lead & Integrator / DevOps | Monorepo setup, CI/CD, deployment, GitHub project board, code integration | Repository architecture, branch strategy, release management |
| **M2** (Yassine Ben Ali) | Back-End Engineer (Auth & Users) | User authentication, bcrypt hashing, JWT issuance/verification, RBAC middleware | Auth lifecycle, token invalidation, role authorization security |
| **M3** (Salma Trabelsi) | Back-End Engineer (Core CRUD) | Prisma schema, CRUD endpoints for Jobs, Candidates, Applications, filtering & pagination | Relational model, query optimization, Prisma migrations, pagination algorithms |
| **M4** (Aziz Hammami) | AI Module Engineer | PII Anonymizer, Claude API client, prompt engineering, Zod AI output validation, resilience | Anonymization regex & token replacement, structured output validation, error fallback |
| **M5** (Nour Dridi) | Front-End Engineer (Core & Layout) | React layout, navigation, auth forms (Login/Register), protected route guards, dashboard & charts | React Router tree, AuthContext state management, JWT persistence, Chart.js/Recharts |
| **M6** (Mariem Gharbi) | Front-End Engineer (CRUD & AI UI) | CRUD interfaces, Kanban status pipeline, AI action cards, unit tests, technical report | Interactive state handling, optimistic UI updates, comprehensive test suites |

---

## 5. Monorepo Structure

```text
TalentFlow/
├── client/                     # React + Vite Front-End
│   ├── public/
│   ├── src/
│   │   ├── api/                # Axios instance & API service methods
│   │   ├── assets/             # Static icons & branding assets
│   │   ├── components/         # Reusable UI components (Navbar, Sidebar, Modal, Card)
│   │   ├── context/            # React context providers (AuthContext)
│   │   ├── pages/              # Views (Dashboard, Jobs, Candidates, Applications, Auth)
│   │   ├── routes/             # Route configurations and ProtectedRoute wrappers
│   │   ├── App.jsx
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express.js Back-End
│   ├── prisma/
│   │   └── schema.prisma       # SQLite schema definition & migrations
│   ├── src/
│   │   ├── ai/
│   │   │   ├── prompts/        # Versioned prompt templates (R4)
│   │   │   ├── anonymize.js    # PII masking & regex sanitization (R1)
│   │   │   ├── claudeClient.js # Anthropic client with timeout & retry (R3)
│   │   │   └── schemas.js      # Zod validation schemas for AI outputs (R2)
│   │   ├── controllers/        # Request handlers (auth, jobs, candidates, apps, ai)
│   │   ├── middleware/         # Auth, RBAC, error handling, validation middleware
│   │   ├── routes/             # REST API route definitions
│   │   ├── utils/              # Helper functions & logger
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Jest & Supertest suites
│   ├── .env.example
│   └── package.json
├── docs/                       # Project Documentation & Artifacts
│   ├── screenshots/            # 20 numbered screenshots required for grading
│   ├── CONTRIBUTIONS.md        # Detailed student-to-file traceability matrix
│   ├── GITHUB_ISSUES.md        # Issue tracking plan for project board
│   └── report.md               # Complete technical report
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── package.json
└── README.md
```

---

## 6. Quick Start Guide

### Prerequisites
- **Node.js**: `v18.x` or later
- **npm**: `v9.x` or later

### Installation & Environment Setup
```bash
# Clone the repository
git clone https://github.com/eyaezdine/TalentFlow.git
cd TalentFlow

# Configure environment variables
cp .env.example .env
cp server/.env.example server/.env

# Update server/.env with your valid Anthropic API key
```

---

## 7. Delivery Calendar & Roadmap

- **Week 1**: Topic Validation & Phase 0 Setup (Repo, Conventions, Issues, Skeleton)
- **Week 2**: Phase 1 (Back-End Foundation & Auth) + Phase 2 (Core CRUD API)
- **Week 3**: **Intermediate Milestone Review** with Teacher (Working Back-End + Auth + Database)
- **Week 4**: Phase 3 (Front-End Foundation & Auth UI) + Phase 4 (CRUD & Dashboard UI)
- **Week 5**: Phase 5 (AI Module Integration, Anonymizer & Fallback UI)
- **Week 6**: Phase 6 (Automated Testing & QA) + Phase 7 (Seed Data, Deployment & Demo Script)
- **Week 7**: Phase 8 (Final Technical Report & 15-Minute Defense Preparation)
