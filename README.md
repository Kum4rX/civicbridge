# CivicBridge

A modern, full-stack digital civic engagement and petition platform designed to empower citizens and public officials to collaborate transparently on community concerns, civic petitions, neighborhood initiatives, and municipal governance.

---

## Overview

CivicBridge bridges the communication gap between citizens and municipal administrators:
- **Citizens** can register, raise civic petitions with categorized issues and location coordinates, track community initiatives, and manage their petitions.
- **Civic Officials** can register with government verification, monitor civic petitions across departments, and prepare official responses.

The application is structured into a clean monorepo containing a high-performance **Node.js/Express REST API backend** and a modern **Angular 18 standalone frontend**.

---

## Features

### Implemented Features (Milestone 1 & Milestone 2)
- **User Authentication & Profiles:** Secure registration and login for `CITIZEN` and `OFFICIAL` roles, password encryption with bcrypt, JWT Bearer authentication, and profile retrieval (`/api/auth/me`).
- **Role-Based Access Control:** Distinct capabilities and route guards for citizens and verified civic officials.
- **Petition Creation:** Authenticated citizens and officials can publish petitions with rich descriptions, categories, tags, target signature goals, and location details.
- **Petition Discovery:** Real-time keyword search across titles, descriptions, and tags; filtering by category, city, state, and tag; sorting and pagination.
- **My Petitions Management:** Dedicated dashboard view for users to track their own active and draft petitions.
- **Petition Detail View:** Full petition display with populated creator details, signature counts, status badges, and location metadata.
- **Data Integrity Constraints:** Pre-signature edit and delete capabilities restricted strictly to the petition creator before endorsements are recorded (`signaturesCount === 0`).
- **Responsive Navigation:** Application shell with header, sidebar navigation, mobile menu, and global toast notifications.

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
- **CORS Support:** `cors` middleware with configurable client origin
- **Testing Framework:** Jest, Supertest, and `mongodb-memory-server`

---

## Project Structure

```
CivicBridge/
├── backend/                           # Node.js / Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                  # MongoDB database connection
│   │   ├── controllers/
│   │   │   ├── auth.controller.js     # User authentication controllers
│   │   │   └── petition.controller.js # Petition CRUD & search controllers
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT Bearer token authentication
│   │   │   ├── role.middleware.js     # Role authorization (CITIZEN / OFFICIAL)
│   │   │   ├── validate.middleware.js # Express-validator result handler
│   │   │   └── error.middleware.js    # Global error & 404 handler
│   │   ├── models/
│   │   │   ├── user.model.js          # User schema with bcrypt password hashing
│   │   │   └── petition.model.js      # Petition schema with location & indexes
│   │   ├── routes/
│   │   │   ├── auth.routes.js         # /api/auth endpoint routes
│   │   │   ├── petition.routes.js     # /api/petitions endpoint routes
│   │   └── services/
│   │       ├── auth.service.js        # Auth business logic & JWT generation
│   │       └── petition.service.js    # Petition business logic, filter & sort
│   │   ├── utils/
│   │   │   └── response.js            # Standardized API response formatters
│   │   ├── validators/
│   │   │   ├── auth.validator.js      # Input validators for authentication
│   │   │   └── petition.validator.js  # Input validators for petitions
│   │   ├── app.js                     # Express app setup, CORS, and middleware
│   │   └── server.js                  # HTTP server bootstrap & port listener
│   ├── tests/
│   │   ├── auth.test.js               # Jest integration tests for auth
│   │   ├── petition.test.js           # Jest integration tests for petitions
│   │   └── verify_all.js              # Comprehensive live HTTP verification suite
│   ├── .env.example                   # Backend environment configuration template
│   └── package.json                   # Backend dependencies and scripts
│
├── frontend/                          # Angular 18 Single-Page Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                  # Singletons, models, services, interceptors, guards
│   │   │   ├── features/              # Feature pages (landing, auth, petitions, dashboard)
│   │   │   ├── layout/                # Shell component (navigation, header, sidebar)
│   │   │   ├── shared/                # UI components (badges, cards, dialogs, pagination)
│   │   │   ├── app.component.ts       # Root Angular component
│   │   │   ├── app.config.ts          # Application providers and interceptor setup
│   │   │   └── app.routes.ts          # Client-side route declarations
│   │   ├── assets/                    # Static image assets
│   │   ├── environments/              # Environment configs (API base URL)
│   │   ├── index.html                 # HTML host document with favicon links
│   │   ├── main.ts                    # Angular bootstrap entry point
│   │   └── styles.scss                # Global SCSS theme tokens and typography
│   ├── angular.json                   # Angular workspace configuration
│   ├── package.json                   # Frontend dependencies and scripts
│   └── tsconfig.json                  # TypeScript configuration
│
├── .gitignore                         # Root Git ignore rules
└── README.md                          # Single project documentation (this file)
```

---

## Backend

### Architecture & Design
The backend is organized in a layered modular architecture:
- **Routes Layer (`src/routes/`):** Defines API paths, mounts validation middleware, and dispatches to controllers.
- **Controllers Layer (`src/controllers/`):** Handles HTTP request parsing, status codes, and delegates business logic to services.
- **Services Layer (`src/services/`):** Encapsulates core business rules, filtering logic, and database operations.
- **Models Layer (`src/models/`):** Mongoose schemas defining validation constraints, indexing, and pre-save hooks.
- **Middleware Layer (`src/middleware/`):** Authentication token extraction, role verification, and centralized error handling.

### Authentication & JWT
- Authentication is token-based using `jsonwebtoken`.
- Passwords are encrypted with `bcryptjs` using salt rounds before persistence.
- Safe serialization removes password hashes and formats identifiers for frontend consumption.
- Protected routes require the HTTP header: `Authorization: Bearer <token>`.

### Roles & Authorization
- **`CITIZEN`:** Can register, create petitions, manage own petitions, and browse public petitions.
- **`OFFICIAL`:** Can register with government verification document metadata, access the governance desk, and create official petitions.

### Petition APIs & Restrictions
- **Search & Filtering:** Case-insensitive regex search across `title`, `description`, and `tags`, with category, city, and state filters.
- **Signature Integrity Rule:** Petitions with zero signatures (`signaturesCount === 0`) can be updated or deleted by their creator. Once a petition receives endorsements (`signaturesCount > 0`), updates and deletions are locked (`400 Bad Request`). Non-creators attempting modifications receive `403 Forbidden`.

### Validation & Centralized Error Handling
- Payload validation via `express-validator` and defensive controller checks.
- Centralized error middleware captures unhandled exceptions, Mongoose CastErrors, and duplicate key constraints (code 11000), returning structured JSON responses.

### How to Install and Run Backend
```bash
# From CivicBridge/ directory:
npm --prefix backend install

# Start backend in development mode (with nodemon)
npm --prefix backend run dev

# Or start in production mode
npm --prefix backend start
```
The backend starts on `http://localhost:5000`.

### How to Test Backend
```bash
# Run Jest test suite (in-memory MongoDB)
npm --prefix backend test

# Run live integration verification against running server
node backend/tests/verify_all.js
```

---

## Frontend

### Architecture & Design
The frontend is built with Angular 18 using modern standalone components and signals:
- **Core Module (`src/app/core/`):** Singleton services, data models, route guards (`AuthGuard`, `RoleGuard`), and `AuthInterceptor`.
- **Layout Module (`src/app/layout/`):** Application shell component containing the navigation header, sidebar, and mobile menu.
- **Shared Module (`src/app/shared/`):** Reusable components including `toast-host`, `loader`, `badge`, `empty-state`, `error-state`, `confirm-dialog`, `pagination`, and `petition-card`.
- **Features Module (`src/app/features/`):** Routed page components for landing, authentication, dashboard, petitions, profile, and system error pages.

### Main Pages
- **Landing Page (`/`):** Public hero banner presenting the platform mission, features, and quick links.
- **Login Page (`/login`):** Authentication form with reactive validation, saving JWT tokens to `localStorage`.
- **Register Page (`/register`):** Multi-step registration wizard with role selection (`CITIZEN` / `OFFICIAL`), location fields, and verification document details.
- **Dashboard (`/dashboard`):** Overview of active civic petitions, summary metrics, and quick actions.
- **Petitions List (`/petitions`):** Real-time search, category and location filters, and pagination.
- **Petition Detail (`/petitions/:id`):** Complete petition overview with creator information, status badge, and edit/delete actions for creators.
- **Create & Edit Petition (`/petitions/new`, `/petitions/:id/edit`):** Validated reactive form for title, description, category, tags, target signatures, and location.
- **My Petitions (`/petitions/my`):** List of active and draft petitions created by the current user.
- **User Profile (`/profile`):** User identity, role badge, and location details.
- **System Pages (`/not-found`, `/forbidden`):** Graceful 404 and 403 error fallback views.

### Authentication & Interceptor Flow
- `AuthInterceptor` automatically intercepts outgoing HTTP requests to the API and attaches `Authorization: Bearer <token>`.
- If the server responds with `401 Unauthorized`, the interceptor clears session state and redirects to `/login`.
- If the server responds with `403 Forbidden`, the interceptor routes the user to `/forbidden`.

### Error & Unsupported Feature Handling
- Milestone 3 & Milestone 4 features (Polls, Sentiment Analysis, Governance Reports) display clean informational placeholder views without generating fake data or breaking navigation.

### How to Install, Run, and Build Frontend
```bash
# Install dependencies
npm --prefix frontend install

# Start development server
npm --prefix frontend start

# Build production bundle
npm --prefix frontend run build
```
The application serves on `http://localhost:4200` and builds to `frontend/dist/civix-web`.

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health & operational status check |
| `POST` | `/api/auth/register` | Public | Register a new user (`CITIZEN` or `OFFICIAL`) |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue signed JWT |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated user profile |
| `GET` | `/api/petitions` | Public | List active petitions with search, filters, and pagination |
| `POST` | `/api/petitions` | Protected | Create a new civic petition |
| `GET` | `/api/petitions/my` | Protected | List petitions created by the authenticated user |
| `GET` | `/api/petitions/:id` | Public | Get single petition details with populated creator |
| `PUT` | `/api/petitions/:id` | Protected (Creator) | Edit petition (Allowed only if `signaturesCount === 0`) |
| `DELETE` | `/api/petitions/:id` | Protected (Creator) | Delete petition (Allowed only if `signaturesCount === 0`) |

---

## Current Implementation Status

| Milestone & Area | Status | Details |
| :--- | :---: | :--- |
| **Backend Milestone 1** | **Completed** | Full auth lifecycle: registration, login, JWT issuance, password hashing, profile retrieval (`/api/auth/me`). |
| **Backend Milestone 2** | **Completed** | Petition creation, search, category/city/tag filtering, pagination, sorting, detail view, creator-only edit/delete restrictions. |
| **Frontend Milestone 1** | **Completed** | Landing page, Login page, Register wizard, Profile view, Auth guard, Role guard, Bearer token interceptor. |
| **Frontend Milestone 2** | **Completed** | Petition list with real-time search & filters, petition detail view, create petition form, edit petition form, my-petitions view. |
| **Backend Milestone 3** | *Upcoming* | Civic polling endpoints (`/api/polls`) and citizen petition signing (`POST /api/petitions/:id/sign`). |
| **Backend Milestone 4** | *Upcoming* | Official petition responses (`POST /api/petitions/:id/response`), status transitions (`PATCH /api/petitions/:id/status`), and reports (`/api/reports/*`). |
| **Frontend M3/M4 UI** | *Placeholder* | Clean UI shell and informational empty state messaging; no mock data is generated. |

---

## Testing

### Automated Test Commands

```bash
# 1. Backend Unit & Integration Tests (Jest)
npm --prefix backend test
# Output: 2 test suites passed, 48 tests passed (100% success)

# 2. Backend Live Integration Verification Suite
node backend/tests/verify_all.js
# Output: 9 verification phases passed against live server (100% success)

# 3. Frontend Production Build Verification
npm --prefix frontend run build
# Output: Application bundle generated in ~4.3s with 0 errors
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
