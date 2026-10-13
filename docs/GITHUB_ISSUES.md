# TalentFlow - GitHub Issues & Project Board Plan

> **Instructions for Eya Ezdine**: Create these issues on the GitHub repository (`https://github.com/eyaezdine/TalentFlow/issues`) and link them to the project board.

---

### Issue #1: [Phase 0] Monorepo Scaffolding & Git Workflow Initialization
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `setup`, `devops`, `chore`
- **Description**:  
  Initialize git repository, create root `.gitignore`, `.env.example`, `package.json` with monorepo scripts, `.prettierrc`, and initial directory structure (`client`, `server`, `docs`).
- **Acceptance Criteria**:
  - [x] Repository initialized with `main` branch.
  - [x] `.gitignore` blocks `.env`, `node_modules`, `dist`, and SQLite databases.
  - [x] Monorepo structure created and documented.

---

### Issue #2: [Phase 0] Server Configuration Specification & Environment Templates
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `setup`
- **Description**:  
  Define all backend environment parameters required for execution (Port, Database URL, JWT secrets, Anthropic Claude API keys, timeout duration) in `server/.env.example`.
- **Acceptance Criteria**:
  - [x] `server/.env.example` created with descriptions for every variable.
  - [x] Zero hardcoded secrets anywhere in the codebase.

---

### Issue #3: [Phase 0] Relational Schema Design & Entity Relationships Spec
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `database`, `documentation`
- **Description**:  
  Define the data models for `User` (with roles), `Job`, `Candidate`, and `Application` (with status pipeline). Prepare entity-relationship documentation for report Section 7.
- **Acceptance Criteria**:
  - [x] Schema covers all attributes required by the assignment.
  - [x] Foreign key relationships specified between Candidate, Job, and Application.

---

### Issue #4: [Phase 0] AI Privacy Protocol & Anonymization Architecture (R1)
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `ai`, `security`, `documentation`
- **Description**:  
  Draft specification for Rule R1: identify PII patterns (names, emails, phone numbers, addresses) to be sanitized before sending data to Anthropic Claude API.
- **Acceptance Criteria**:
  - [x] PII removal strategy defined.
  - [x] Logging mechanism planned to track removed fields without leaking raw data.

---

### Issue #5: [Phase 0] Front-End Design System & Tailwind Palette Specification
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `ui/ux`
- **Description**:  
  Specify color palette (recruitment enterprise theme: Slate, Indigo, Emerald), typography, and component hierarchy for dashboard and authentication pages.
- **Acceptance Criteria**:
  - [x] Tailwind CSS theme tokens selected.
  - [x] Responsive layout breakpoints documented.

---

### Issue #6: [Phase 0] Test Strategy & Screenshot Tracker Initialization
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `testing`, `qa`, `documentation`
- **Description**:  
  Initialize the screenshots directory (`docs/screenshots/`) and prepare the tracking table for the 20 mandatory defense screenshots.
- **Acceptance Criteria**:
  - [x] `docs/screenshots/.gitkeep` established.
  - [x] 20 screenshot specifications mapped to corresponding phases.

---

### Issue #7: [Phase 1] User Authentication System (Bcrypt + JWT + RBAC)
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `auth`, `security`
- **Description**:  
  Implement user registration and login endpoints with bcrypt password hashing (10 salt rounds), JWT generation, and role-based access control middleware (`ADMIN`, `RECRUITER`).

---

### Issue #8: [Phase 1] Prisma ORM Setup & SQLite Database Migration
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `database`
- **Description**:  
  Configure Prisma ORM with SQLite, create `schema.prisma`, write migration, and create shared Prisma client instance.

---

### Issue #9: [Phase 1] Express Server Setup & Global Error Handling
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `architecture`
- **Description**:  
  Initialize Express application with CORS, JSON body parser, request logger, centralized error middleware, and 404 handler.

---

### Issue #10: [Phase 2] Job Offers CRUD API & Pagination
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `crud`
- **Description**:  
  Create RESTful endpoints for Job Offers: `GET /api/jobs` (with pagination, title search, status filter), `GET /api/jobs/:id`, `POST /api/jobs`, `PUT /api/jobs/:id`, `DELETE /api/jobs/:id`.

---

### Issue #11: [Phase 2] Candidates CRUD API & CV Search
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `crud`
- **Description**:  
  Implement Candidate management endpoints: `GET /api/candidates`, `GET /api/candidates/:id`, `POST /api/candidates`, `PUT /api/candidates/:id`, `DELETE /api/candidates/:id`.

---

### Issue #12: [Phase 2] Applications Pipeline Management API
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `crud`
- **Description**:  
  Implement Application linking between Candidate and Job: status transitions (`NEW`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`), listing, and dashboard statistics counter endpoint.

---

### Issue #13: [Phase 2] Zod Request Validation Schemas for CRUD
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `validation`
- **Description**:  
  Write Zod validation schemas for all incoming POST/PUT request bodies and wire them via validation middleware.

---

### Issue #14: [Phase 2] API Route Integration & Supertest Suite
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `testing`
- **Description**:  
  Integrate all modular routes into `/api` and author automated integration tests using Jest and Supertest for auth and CRUD endpoints.

---

### Issue #15: [Phase 3] Front-End React Foundation & Routing Architecture
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `architecture`
- **Description**:  
  Set up Vite React project, configure Tailwind CSS, set up React Router with public and protected route hierarchies.

---

### Issue #16: [Phase 3] Authentication Context & Login/Register Views
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `auth`
- **Description**:  
  Create `AuthContext` to manage JWT tokens in `localStorage`, create responsive Login and Register pages with client-side validation.

---

### Issue #17: [Phase 3] Responsive App Shell (Sidebar, Navbar, User Menu)
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `ui/ux`
- **Description**:  
  Develop application shell components: collapsible Sidebar with active link highlighting, top Navbar with authenticated user details, and Logout handler.

---

### Issue #18: [Phase 3] Axios API Client with Auth Interceptor
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `api`
- **Description**:  
  Configure centralized Axios client with automatic `Authorization: Bearer <token>` injection, 401 redirect interceptor, and unified error handling.

---

### Issue #19: [Phase 4] HR Analytics Dashboard & Status Breakdown Chart
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `dashboard`
- **Description**:  
  Build HR Dashboard with 4 stat cards (Total Jobs, Candidates, Active Applications, Offers) and an interactive chart showing applications per status.

---

### Issue #20: [Phase 4] Job Offers & Candidates Management UI
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `crud`
- **Description**:  
  Build list views with search bar, status dropdown, pagination controls, and modal forms for creating and editing Jobs and Candidates.

---

### Issue #21: [Phase 4] Application Kanban Pipeline UI
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `pipeline`
- **Description**:  
  Implement the recruitment pipeline interface with columns for each status (`New`, `Screening`, `Interview`, `Offer`, `Rejected`), allowing recruiters to update application stages.

---

### Issue #22: [Phase 5] PII Anonymization Layer (R1) & Test Suite
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `ai`, `security`, `privacy`
- **Description**:  
  Build `server/src/ai/anonymize.js` to mask names, emails, phone numbers, and addresses. Log anonymization metrics and write unit tests verifying zero PII leakage.

---

### Issue #23: [Phase 5] Anthropic Claude Client with Resilience & Prompt Templates (R2, R3, R4)
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `ai`, `core`
- **Description**:  
  Implement Anthropic API integration with 15s timeout (`AbortController`), retry logic on malformed JSON, versioned prompt templates in `prompts/`, and Zod output schemas.

---

### Issue #24: [Phase 5] AI Endpoints: Summary, Matching & Interview Questions
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `backend`, `ai`
- **Description**:  
  Expose 3 REST endpoints: `POST /api/ai/summary`, `POST /api/ai/match`, `POST /api/ai/questions`, wiring controllers with anonymization and Claude client.

---

### Issue #25: [Phase 5] AI UI Components with Real-Time Feedback
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `frontend`, `ai`
- **Description**:  
  Develop modal dialogs and trigger buttons for AI Summary, Match Analysis, and Interview Questions with loading spinners, retry buttons, and anonymization inspection drawer.

---

### Issue #26: [Phase 6] Comprehensive Automated Testing Suite
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `testing`, `qa`
- **Description**:  
  Write unit tests for the anonymizer, integration tests for API routes, and React component tests. Generate coverage reports.

---

### Issue #27: [Phase 7] Seed Script with Realistic Fake Data & Cloud Deployment
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `devops`, `deployment`
- **Description**:  
  Build Prisma seed script using `@faker-js/faker` generating realistic HR data. Configure and document deployment on Render/Railway and Vercel.

---

### Issue #28: [Phase 8] Final Technical Report & Defense Presentation Script
- **Assignee**: Eya Ezdine (`eyaezdine@gmail.com`)
- **Labels**: `documentation`
- **Description**:  
  Compile all 16 sections of `docs/report.md`, assemble all 20 screenshots, and prepare the 15-minute live defense demonstration script.
