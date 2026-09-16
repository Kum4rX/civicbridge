# CivicBridge

A modern, full-stack digital civic engagement and petition platform designed to empower citizens and public officials to collaborate transparently on community concerns, civic petitions, neighborhood initiatives, municipal governance, and civic analytics.

---

## Overview

CivicBridge bridges the communication gap between citizens and municipal administrators:
- **Citizens** can register, raise civic petitions with categorized issues and location coordinates, endorse neighborhood initiatives via signatures, vote in local civic polls, and track governance responses in real time.
- **Civic Officials** can register with government verification, monitor civic petitions across their exact locality, prepare official responses, update resolution statuses, and review monthly engagement analytics.

The application is structured into a clean monorepo containing a high-performance **Node.js/Express REST API backend** and a modern **Angular 18 standalone frontend**.

---

## Features

### Implemented Features (Milestones 1, 2, 3 & 4)

#### Authentication & Authorization (Milestone 1)
- **User Authentication & Profiles:** Secure registration and login for `CITIZEN` and `OFFICIAL` roles, password encryption with `bcryptjs`, signed JWT Bearer authentication, and profile retrieval (`/api/auth/me`).
- **Role-Based Access Control:** Strict role guards separating citizen privileges and verified official governance tools.

#### Petitions & Citizen Discovery (Milestone 2)
- **Petition Creation & Management:** Authenticated citizens and officials can publish petitions with rich descriptions, categories, tags, target signature goals, and location details.
- **Petition Discovery:** Real-time keyword search across titles, descriptions, and tags; filtering by category, city, state, and tag; sorting and pagination.
- **My Petitions Management:** Dedicated dashboard view for users to track their own active and draft petitions.
- **Petition Detail View:** Full petition display with populated creator details, signature counts, status badges, and location metadata.
- **Data Integrity Constraints:** Pre-signature edit and delete capabilities restricted strictly to the petition creator before endorsements are recorded (`signaturesCount === 0`).

#### Polling, Voting & Public Feedback (Milestone 3)
- **Issue-Specific Civic Polls:** Community and official polls with 2–10 validated unique options, expiration dates, and city/state location targeting.
- **Public Voting & Duplicate Prevention:** Authenticated one-person-one-vote enforcement backed by unique compound database indexes (`{ pollId: 1, userId: 1 }`).
- **Live Results & Sentiment Analytics:** Real-time dynamic aggregation of actual database votes with live calculated vote percentages.
- **Poll Status Lifecycle:** Authorized poll creators and officials can officially close voting on active polls.

#### Governance Response & Monthly Engagement Reports (Milestone 4)
- **Official Locality Workspace:** Civic officials access a dedicated workspace (`/governance`) showing exclusively petitions within their assigned jurisdiction (city/state).
- **Official Response System:** Officials can post formal responses (`POST /api/petitions/:id/response`) detailing municipal action plans, department contacts, and progress remarks.
- **Petition Status Workflow:** Officials can transition petition statuses (`UNDER_REVIEW`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`) with automatic history tracking and `AdminLog` audit trails (`PATCH /api/petitions/:id/status`).
- **Locality Authorization & Isolation:** Backend enforces that officials can only respond to or update petitions belonging to their registered city and state (HTTP 403 Forbidden on jurisdiction mismatch).
- **Petition Endorsements (Signatures):** Citizens can endorse active petitions (`POST /api/petitions/:id/sign`) with duplicate-signature prevention and view all signed petitions (`/petitions/signed`).
- **Monthly Civic Engagement Reports:** Dynamic MongoDB aggregation pipelines calculating monthly summaries, category breakdowns, resolution rates, and participation metrics (`GET /api/reports/summary`, `GET /api/reports/petitions`, `GET /api/reports/polls`).
- **Civic Sentiment Trends:** Time-series tracking of citizen voting and petition activity over historical intervals (`GET /api/reports/sentiment`).
- **Downloadable CSV Reports:** Instant streaming export of monthly civic engagement data in standardized CSV format (`GET /api/reports/export`).

---

## Technology Stack

### Frontend
- **Framework:** Angular 18 (Standalone Components, Signals, Reactive Forms, Router)
- **Styling:** Vanilla SCSS with structured CSS custom properties, responsive design tokens, and dark theme support
- **State & HTTP:** Angular `HttpClient`, RxJS reactive streams, and custom HTTP interceptors
- **Data Visualization:** `chart.js` (v4.x) and `ng2-charts` (v6.x)
- **Build Engine:** Angular Application Builder (`@angular-devkit/build-angular:application` with Vite dev server)

### Backend
- **Runtime Environment:** Node.js (v18+)
- **Framework:** Express.js (v4.x)
- **Database:** MongoDB with Mongoose ODM (v8.x)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) with Bearer token authentication
- **Password Security:** `bcryptjs` (salt generation and hashing)
- **Validation:** `express-validator` and defensive payload checks
- **CSV Generation:** `json2csv` stream parser for dynamic data export
- **CORS Support:** `cors` middleware with configurable client origin

---

## Backend Architecture & API

### Architecture & Design
The backend follows a clean, modular layered architecture:
- **`models/`:** Mongoose schemas with compound indexes (`User`, `Petition`, `Poll`, `Vote`, `Signature`, `AdminLog`).
- **`validators/`:** `express-validator` middleware enforcing strict payload validation.
- **`services/`:** Core business logic, locality checks, and MongoDB aggregation pipelines.
- **`controllers/`:** Request/response handling, HTTP status code formatting, and error propagation.
- **`routes/`:** Modular route definitions mounted under `/api`.
- **`middleware/`:** Authentication (`auth.middleware.js`), role authorization (`role.middleware.js`), error handling, and request logging.

### API Endpoints

All endpoints are prefixed with `/api`.

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health & operational status check |
| **Authentication** | | | |
| `POST` | `/api/auth/register` | Public | Register a new user (`CITIZEN` or `OFFICIAL`) |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue signed JWT |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated user profile |
| **Petitions** | | | |
| `GET` | `/api/petitions` | Public | List active petitions with search, filters, and pagination |
| `POST` | `/api/petitions` | Protected | Create a new civic petition |
| `GET` | `/api/petitions/my` | Protected | List petitions created by the authenticated user |
| `GET` | `/api/petitions/signed` | Protected | List petitions signed by the authenticated user |
| `GET` | `/api/petitions/:id` | Public | Get single petition details with populated creator and responses |
| `PUT` | `/api/petitions/:id` | Protected (Creator) | Edit petition (Allowed only if `signaturesCount === 0`) |
| `DELETE` | `/api/petitions/:id` | Protected (Creator) | Delete petition (Allowed only if `signaturesCount === 0`) |
| `POST` | `/api/petitions/:id/sign` | Protected (Citizen) | Sign/endorse petition (Duplicate sign prevention enforced) |
| `POST` | `/api/petitions/:id/response`| Protected (Official) | Add official response (Restricted to official's locality) |
| `PATCH`| `/api/petitions/:id/status` | Protected (Official) | Update petition status with audit trail (Restricted to locality) |
| **Civic Polls** | | | |
| `POST` | `/api/polls` | Protected | Create a new civic poll with 2–10 unique options and location |
| `GET` | `/api/polls` | Public | List active/closed polls with category, city & keyword filters |
| `GET` | `/api/polls/:id` | Public | Get single poll details, populated creator, and voting state |
| `POST` | `/api/polls/:id/vote` | Protected | Cast a vote on a poll (One vote per user strictly enforced) |
| `GET` | `/api/polls/:id/results` | Public | Get live aggregated results with real dynamic percentages |
| `PATCH` | `/api/polls/:id/status` | Protected (Creator/Official) | Update poll status (e.g. close active poll) |
| **Governance** | | | |
| `GET` | `/api/governance/petitions` | Protected (Official) | Get petitions matching the official's registered locality |
| **Reports & Analytics** | | | |
| `GET` | `/api/reports/summary` | Protected | Monthly civic engagement summary metrics |
| `GET` | `/api/reports/petitions` | Protected | Detailed petition analytics & status/category breakdowns |
| `GET` | `/api/reports/polls` | Protected | Comprehensive poll engagement analytics |
| `GET` | `/api/reports/sentiment` | Protected | Time-series sentiment & voting trends |
| `GET` | `/api/reports/export` | Protected | Export monthly civic engagement report as downloadable CSV |

---

## Frontend Architecture

### Main Pages & Workflows
- **Landing Page (`/`):** Public hero banner presenting the platform mission, features, and quick links.
- **Login Page (`/login`):** Authentication form with reactive validation, saving JWT tokens to `localStorage`.
- **Register Page (`/register`):** Multi-step registration wizard with role selection (`CITIZEN` / `OFFICIAL`), location fields, and verification document details.
- **Dashboard (`/dashboard`):** Overview of active civic petitions, summary metrics, and quick actions.
- **Petitions List (`/petitions`):** Real-time search, category and location filters, and pagination.
- **Petition Detail (`/petitions/:id`):** Complete petition overview with creator information, status badge, signing button, official response timeline, and official status controls.
- **Create & Edit Petition (`/petitions/new`, `/petitions/:id/edit`):** Validated reactive form for title, description, category, tags, target signatures, and location.
- **My Petitions (`/petitions/my`):** List of active and draft petitions created by the current user.
- **Signed Petitions (`/petitions/signed`):** List of petitions endorsed and signed by the citizen.
- **Polls Listing & Detail (`/polls`, `/polls/:id`):** Live civic polls with active/closed status, real-time voting, and dynamic percentage charts.
- **Poll Creation (`/polls/new`):** Dynamic form for creating community polls with multiple options and duration.
- **Governance Workspace (`/governance`):** Dedicated official portal filtering petitions in the official's locality, reviewing community demands, submitting official responses, and updating progress statuses.
- **Reports & Analytics Dashboard (`/reports`):** Comprehensive civic reporting suite featuring month/year filters, KPI metric cards, category donut charts, status distribution bars, sentiment time-series, and one-click CSV report export.
- **User Profile (`/profile`):** User identity, role badge, and location details.
- **System Pages (`/not-found`, `/forbidden`):** Graceful 404 and 403 error fallback views.

---

## Current Implementation Status

| Milestone & Area | Status | Details |
| :--- | :---: | :--- |
| **Backend Milestone 1** | **Completed** | Full auth lifecycle: registration, login, JWT issuance, password hashing, profile retrieval (`/api/auth/me`). |
| **Backend Milestone 2** | **Completed** | Petition creation, search, category/city/tag filtering, pagination, sorting, detail view, creator-only edit/delete restrictions. |
| **Backend Milestone 3** | **Completed** | Issue-specific polls, 2–10 option validation, public voting, single-vote compound index guarantee, real-time dynamic vote aggregation & sentiment percentages, poll closing permissions. |
| **Backend Milestone 4** | **Completed** | Locality-filtered governance petitions, official responses, status lifecycle with audit trails, petition signatures, monthly engagement reports, and CSV data export. |
| **Frontend Milestone 1** | **Completed** | Landing page, Login page, Register wizard, Profile view, Auth guard, Role guard, Bearer token interceptor. |
| **Frontend Milestone 2** | **Completed** | Petition list with real-time search & filters, petition detail view, create petition form, edit petition form, my-petitions view. |
| **Frontend Milestone 3** | **Completed** | Poll listing, search and filters, dynamic poll creation, voting interface with duplicate prevention, live results rendering. |
| **Frontend Milestone 4** | **Completed** | Governance workspace for officials, official response drawer, status update controls, petition signature flow, signed petitions list, monthly reports dashboard, and CSV file download. |

---

## Testing & Verification

### Automated Test Suites

```bash
# 1. Backend Unit & Integration Tests (Jest)
npm --prefix backend test
# Output: 5 test suites passed (auth, petition, poll, governance, report), 98 tests passed (100% success)

# 2. Backend Live Integration Verification Suite
node backend/tests/verify_all.js
# Output: 22 verification phases passed across M1, M2, M3, and M4 against live server (100% success)

# 3. Frontend Production Build Verification
npm --prefix frontend run build
# Output: Application bundle generated cleanly in ~5.08s with 0 errors
```

---

## Setup Instructions

Follow these step-by-step instructions to set up and run CivicBridge locally:

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** Local instance running on port 27017, or a MongoDB Atlas URI

### 2. Clone the Repository
```bash
git clone https://github.com/Kum4rX/CivicBridge.git
cd CivicBridge
```

### 3. Backend Setup
```bash
# Install backend dependencies
npm --prefix backend install

# Create environment configuration
cp backend/.env.example backend/.env
```

Verify the contents of `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/civix
JWT_SECRET=civix_super_secret_jwt_key_development_2026
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:4200
```

### 4. Frontend Setup
```bash
# Install frontend dependencies
npm --prefix frontend install
```

### 5. Start the Application
Open two terminal windows:

**Terminal 1 — Backend:**
```bash
npm --prefix backend run dev
```
*Backend runs on `http://localhost:5000` (Health check: `http://localhost:5000/api/health`)*

**Terminal 2 — Frontend:**
```bash
npm --prefix frontend start
```
*Frontend application opens on `http://localhost:4200`*
