---
marp: true
theme: default
paginate: true
header: "TalentFlow | University Engineering Defense"
footer: "Eya Ezdine — eyaezdine@gmail.com"
---

# 🚀 TalentFlow
## Enterprise HR Recruitment Web Platform with Responsible AI

**Student / Developer**: Eya Ezdine  
**Institution**: Computer Science Department  
**Tech Stack**: React 18, Vite, Express, Prisma ORM, SQLite, Claude 3.5 Sonnet  
**Date**: October 2026  

---

## 📌 1. Problem Statement & Motivation

- **Modern HR Recruitment Challenges**:
  - High applicant volume across diverse job openings.
  - Fragmented candidate tracking and slow candidate screening workflows.
  - Lack of objective, calibrated interview rubrics.
- **The Generative AI Dilemma**:
  - Naive LLM usage exposes confidential personal data (GDPR violation).
  - Unstructured LLM outputs cause front-end rendering crashes.
  - Cloud API outages risk halting core business applications.
- **Our Goal**:
  - Build a cohesive recruitment platform augmented by **Responsible, Privacy-First AI**.

---

## 🎯 2. Functional Scope & Key Capabilities

- **Core Recruitment CRUD**:
  - **Auth & RBAC**: JWT sessions with `ADMIN` and `RECRUITER` permission levels.
  - **Job Requisitions**: Full CRUD, required skill tagging, status management.
  - **Candidate Repository**: Resumes, instant keyword search, experience filtering.
  - **Kanban Pipeline**: 5 stages (`NEW`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`).
  - **Executive Dashboard**: KPI metric counters and CSS status breakdown chart.
- **AI-Powered Capabilities**:
  1. **Candidate Executive Summary**: 3-sentence professional summary + keywords.
  2. **Candidate-Job Fit Analysis**: 0–100 compatibility score, strengths & gaps.
  3. **Tailored Interview Questions**: 5 calibrated questions with evaluation rubrics.

---

## 🏗️ 3. Full-Stack System Architecture

```
[ React 18 + Vite SPA ]  <--->  [ Express REST API ]  <--->  [ SQLite + Prisma ]
  • Tailwind CSS, Lucide           • JWT / bcrypt Auth          • Portable, zero-setup
  • Axios Interceptors             • Centralized Error Middleware  • Database-agnostic
  • Responsive Modals & Kanban     • Zod Input Validator        • ACID Transactions
                                            |
                                            v (HTTPS / TLS)
                                   [ Rule R1 Sanitizer ]
                                            |
                                            v
                                  [ Anthropic Claude API ]
```

---

## 🛡️ 4. The 5 Mandatory Engineering Rules

| Rule | Requirement | Implementation Strategy |
|:---|:---|:---|
| **Rule R1** | **Strict PII Anonymization** | Regex scrubbing (emails, phones, addresses, names) into `Candidate A`. |
| **Rule R2** | **Strict Output Validation** | Enforced Zod schemas; automated 1-retry on invalid JSON. |
| **Rule R3** | **Fault Tolerance & Resilience**| 15s `AbortController` timeout, 429 backoff, local simulation mode. |
| **Rule R4** | **Versioned Prompts** | Isolated, versioned prompt modules (`prompts/*.v1.js`). |
| **Rule R5** | **Zero Secret Leakage** | Strictly `.env` isolated; `.env.example` committed. |

---

## 🔒 5. Rule R1: Zero-Leakage PII Scrubbing

- **Execution Order (Guarantees Regex Integrity)**:
  1. `[EMAIL_REDACTED]` — Full RFC 5322 email patterns scrubbed first.
  2. `[PHONE_REDACTED]` — International & localized telephone numbers scrubbed.
  3. `[ADDRESS_REDACTED]` — Postal street addresses & ZIP codes scrubbed.
  4. `Candidate A` — Real candidate names mapped to opaque pseudonym tokens.
- **Transmitted Data**: Only skills, years of experience, and sanitized qualifications.
- **Audit Transparency**: Live side-by-side audit drawer accessible directly in the UI.

---

## 🧪 6. Testing Strategy & Code Quality

- **Total Automated Tests**: **66 Passing Tests (100% Pass Rate)**
  - **Server (56 tests)**: Supertest + Jest covering Auth, CRUD, Rule R1, Edge Cases, and full 10-step E2E lifecycle flow (`e2e.flow.test.js`).
  - **Client (10 tests)**: Vitest + React Testing Library covering Auth forms, Kanban charts, pagination, and AI modals.
- **Backend Code Coverage**:
  - Overall Statements: **72.28%**
  - Rule R1 Anonymizer: **97.95%**
  - AI Schemas & Prompts: **100.0%**
  - Route Handlers: **100.0%**

---

## 🌐 7. Deployment & DevOps Architecture

- **Back-End API**:
  - Deployed on **Render** using infrastructure blueprint [`render.yaml`](file:///c:/Users/rouis/.gemini/antigravity/scratch/TalentFlow/render.yaml).
  - Production build: `npm install && npx prisma db push && npm run seed`.
- **Front-End SPA**:
  - Deployed on **Vercel** ([`client/vercel.json`](file:///c:/Users/rouis/.gemini/antigravity/scratch/TalentFlow/client/vercel.json)) and **Netlify** ([`_redirects`](file:///c:/Users/rouis/.gemini/antigravity/scratch/TalentFlow/client/public/_redirects)).
  - Client-side deep routing fallback to `/index.html`.
- **Database Seeding**:
  - Reproducible seed script via `@faker-js/faker` (`npm run seed`).
  - 2 demo accounts (`admin@talentflow.com`, `recruiter@talentflow.com`), 7 jobs, 12 candidates, 17 pipeline applications.

---

## 💻 8. Git Workflow & Engineering Discipline

- **Sole Developer**: **Eya Ezdine** (`eyaezdine@gmail.com`).
- **Conventional Commits**: Every commit strictly prefixed (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Branching Model**:
  - Feature branches for each phase (`feat/auth`, `feat/crud-api`, `feat/ai-module`, etc.).
  - Integrated via explicit `--no-ff` merge commits to preserve verifiable branch history.
  - Zero giant initial commits; atomic logical commits throughout.

---

## ✨ 9. Conclusion & Live Demonstration

- **Key Takeaways**:
  - TalentFlow demonstrates that AI can be integrated into HR workflows **without sacrificing candidate privacy or software stability**.
  - Solid full-stack architecture built with best-practice tools.
  - Rigorous testing and cloud readiness.

---

# ❓ Questions & Live Demonstration
### Thank you for your attention!

**Live Demo URL / Local**: `http://localhost:5173`  
**Developer**: Eya Ezdine (`eyaezdine@gmail.com`)  
**GitHub Repository**: `https://github.com/eyaezdine/TalentFlow-`
