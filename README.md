# HRIS Portal — Role-Based Human Resource Information System

A full-stack, enterprise-grade Human Resource Information System (HRIS) designed to streamline workforce management, attendance tracking, leave requests, payroll administration, compliance document verification, and organizational hierarchy visualization. Built with React, Vite, Node.js, Express, Prisma ORM, PostgreSQL, and Supabase Storage, featuring an interactive role-grounded Company Assistant.

**Live Application:** [https://hris-frontend-production-9465.up.railway.app](https://hris-frontend-production-9465.up.railway.app)  
**GitHub Repository:** [https://github.com/yukthavanshika/hris-portal](https://github.com/yukthavanshika/hris-portal)

---

## 1. Project Overview

The **HRIS Portal** is a production-deployed web application that automates core human resource operations for modern organizations. Designed with strict separation of concerns, defensive security guardrails, and role-based access control (RBAC), the platform provides tailored interfaces for three distinct personas: **Employees**, **HR Administrators**, and **System Administrators**.

From daily clock-ins and self-service leave applications to company-wide payroll ledger processing and hierarchical reporting trees, the portal centralizes operational workflows into a unified, responsive single-page application backed by robust RESTful APIs.

---

## 2. Key Features

- **Multi-Role Portal Access:** Contextual routing and dashboard personalization for Employees, HR, and System Administrators.
- **Attendance & Time Tracking:** Daily check-in/check-out with duplicate prevention, IST timezone alignment, and HR regularization workflows.
- **Leave Management & Accounting:** Multi-category leave balances (Casual, Sick, Earned), balance checking, and atomic transaction-backed approval/rejection.
- **Secure Document Management:** Document upload with MIME-type and size validation, stored in private Supabase buckets with time-limited signed URLs.
- **Payroll Ledger & Payslips:** Itemized payroll calculation, dynamic filtering, real-time summary KPIs, one-click CSV export, and print-ready formal payslips.
- **Organizational Hierarchy:** Interactive tree visualization with zoom and auto-centering, coupled with a searchable staff directory.
- **Role-Grounded Company Assistant:** Context-aware assistant providing personal records for employees and live operational data for HR/Admin.
- **Defensive Safety Guardrails:** Self-deletion prevention, administrative account safeguards, and strict cycle detection for manager assignments.

---

## 3. User Roles

| Role | Access Scope | Key Permissions |
| :--- | :--- | :--- |
| **`EMPLOYEE`** | Personal Portal (`/dashboard`, etc.) | Clock in/out, view personal attendance, submit leave requests, view own leave balances, view personal payroll slips, upload compliance documents, browse organization directory, chat with Company Assistant regarding personal records and policies. |
| **`HR`** | Personal + HR Portal (`/hr/*`) | Full employee management (CRUD), role assignment, manager assignment, attendance monitoring and regularization, leave approval/rejection with automatic balance deduction, document verification, company-wide payroll processing, CSV exports, and operational Assistant queries. Cannot delete Administrator accounts. |
| **`ADMIN`** | Complete System Access | Full administrative authority across all HR modules, staff directory oversight, organizational restructuring, and company-wide operational query execution subject to self-deletion guardrails. |

---

## 4. System Modules

### A. Employee Dashboard
- **Dynamic Identity:** Displays personalized greeting, employee code, designation, department, and computed avatar initials.
- **Service Shortcuts:** Direct navigation cards for Attendance, Leave Management, Payroll, Documents, Organization, and Assistant.
- **Workforce Status:** Live indicators confirming portal access tier and active employment status.

### B. HR Operations Dashboard
- **Metric Cards:** High-level counts for Total Employees, Pending Leaves, Pending Documents, Today's Attendance breakdown, and Net Payroll disbursement.
- **Action Required Alerts:** Prominent notices highlighting items requiring immediate reviewer attention.
- **Staff Directory Snapshot:** Quick-view table of recently onboarded team members.

### C. Employee Directory & Lifecycle Management
- **Full CRUD Support:** Add new employees, update profile and employment details, or permanently remove records.
- **Reporting Hierarchy Management:** Dropdown manager assignment equipped with a 25-level cycle-detection algorithm preventing circular reporting chains.
- **Comprehensive Profile Modal:** In-app inspection modal displaying personal details, leave balance quotas, last 10 attendance records, recent leave history, payroll statements, and submitted verification documents.
- **Deletion Guardrails:** Prohibits self-deletion and prevents HR accounts from deleting System Administrators.

### D. Attendance Tracking & Regularization
- **Employee View:** Real-time clock-in and clock-out with checks preventing duplicate same-day records.
- **HR Management:** Centralized attendance ledger with calendar filtering aligned to Indian Standard Time (IST, UTC+05:30).
- **Attendance Regularization:** Authorized status corrections (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `LEAVE`) and timestamp adjustments.

### E. Leave Management & Balance Accounting
- **Categories:** Casual Leave, Sick Leave, Earned Leave, and Other Leave.
- **Overdraft Protection:** Submissions validate requested duration against remaining quotas, factoring in both pending and approved requests.
- **Atomic Processing:** HR approval executes inside an atomic database transaction that updates request status and decrements employee balance simultaneously.

### F. Document Compliance & Verification
- **Supported Documents:** Aadhaar Card, PAN Card, Degree Certificate, Address Proof, and miscellaneous credentials.
- **HR Verification:** Dedicated portal for reviewing submissions, approving valid proofs, or rejecting documents with mandatory documented reasons.
- **Security:** Files are private; viewing generates short-lived (300 seconds) signed URLs accessible only by the owner or authorized HR/Admin.

### G. Payroll Management & Export
- **Separation of Concerns:** Employees access only their private itemized statements; HR/Admin access company-wide records.
- **Filter Controls:** Dynamic filtering by Month, Year, Department, and Employee Search.
- **Financial KPIs:** Real-time totals for Gross Salary, Deductions, Net Salary, and Total Employees Paid.
- **Reporting:** Direct CSV export of filtered records and formal printable payslip view supporting `window.print()`.

### H. Organization Hierarchy
- **Visual Tree View:** Recursive reporting tree rendering parent-child relationships with search highlighting and canvas auto-centering.
- **Directory View:** Department-filtered staff roster displaying direct reports count and designation details.

---

## 5. Technology Stack

### Frontend
- **Framework:** React 19, Vite
- **Language:** JavaScript (ES6+ / JSX)
- **Routing:** React Router 7 (BrowserRouter, Nested Layouts, Protected Routes)
- **HTTP Client:** Axios (Interceptors for Bearer tokens and cookie credentials)
- **Styling:** Custom Modular CSS

### Backend
- **Runtime:** Node.js
- **Web Framework:** Express.js 5
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`
- **File Uploads:** Multer (In-memory buffer processing)
- **Object Storage Client:** `@supabase/supabase-js`

### Database & ORM
- **Database:** PostgreSQL
- **ORM:** Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Cloud Storage:** Supabase Storage (Private bucket)

### Infrastructure & Deployment
- **Hosting Platform:** Railway (Independent Frontend and Backend services)
- **Continuous Deployment:** CLI-managed production releases

---

## 6. Architecture Overview

### High-Level System Flow
```
[ React / Vite Frontend ]
       │
       ▼ (HTTP / HTTPS + JWT Bearer / Cookie)
[ Express.js REST API ]
       │
       ├─► [ Authentication & RBAC Middleware ]
       │
       ├─► [ Prisma ORM Client ] ──► [ PostgreSQL Database ]
       │
       └─► [ Supabase Storage API ] ──► [ Private Document Bucket ]
```

### Document Storage & Access Flow
1. **Upload:** Client sends multipart file data → Express Multer memory buffer → Supabase Storage upload to private path `employee-documents/<employeeId>/<uniqueFilename>`.
2. **Access:** Client requests document view → Express verifies JWT ownership or HR/Admin role → Supabase Storage generates a 300-second private signed URL → Client views or downloads securely.

---

## 7. Security Architecture

- **Stateless Authentication:** Secure JWT tokens transmitted via HTTP headers (`Authorization: Bearer <token>`) and credentials cookies.
- **Role-Based Route Guards:** Frontend routes are shielded by `<ProtectedRoute>` verifying session state and `allowedRoles`.
- **API Endpoint Protection:** Every non-public route enforces `authenticateToken` and explicit `requireHRorAdmin` checks.
- **Peer Privacy Protection:** Strict database scoping ensures employees cannot view or query peers' salary, leave balances, or documents.
- **Administrative Account Safety:** Database transactions prevent self-deletion (`req.user.userId === target.userId`) and disallow HR users from removing Admin accounts.
- **File Validation:** Multer filters restrict file uploads to PDF, JPEG, and PNG formats with a strict 10MB file size ceiling.
- **Environment Isolation:** Zero credentials, tokens, passwords, or connection strings are stored in code or repository commits (`.gitignore` enforces isolation).

---

## 8. Company Assistant

The **Company Assistant** provides natural language inquiry resolution grounded in database data and company policies, adapting behavior based on the caller's role:

### Employee Query Mode
- **Reporting Line:** *"Who is my manager?"*, *"Who do I report to?"*
- **Leave Balances:** *"How many leaves do I have?"*, *"What is my casual leave balance?"*
- **Attendance:** *"Did I check in today?"*, *"What time did I check in?"*
- **Personal Compensation:** *"What was my last month salary?"*, *"Show my payslip summary"*
- **Company Policies:** Detailed guidelines on leave entitlements, working hours, attendance policies, and document submission procedures.
- **Peer Privacy Restrictions:** Attempts to probe other staff members' compensation or records are rejected with privacy notifications.

### HR / Administrator Operational Mode
- **Pending Leave Approvals:** *"Show pending leave requests"* — Returns real-time pending submissions with employee names and date ranges.
- **Today's Attendance Summary:** *"Show today's attendance summary"* — Computes live IST attendance counts (Present, Late, Half-Day, Absent, Leave).
- **Payroll Summaries:** *"Summarize payroll for September 2026"* — Aggregates gross pay, deductions, and net distribution for specified pay periods.
- **Department Headcounts:** *"Show employees by department"* — Summarizes workforce distribution across operational departments.
- **Unassigned Leadership:** *"Show employees without a reporting manager"* — Identifies root executive accounts or unassigned profiles.
- **Compliance Attention:** *"Show recent employee documents requiring attention"* — Lists uploaded credentials pending review.

---

## 9. Testing & Quality Verification

The HRIS Portal has undergone functional and regression verification:
- **Linting & Code Quality:** Frontend passed ESLint checks (`eslint .`).
- **Production Build:** Vite production build compiles with zero errors, producing optimized assets.
- **Backend Syntax:** All Node.js backend route handlers and utilities passed syntax verification (`node -c`).
- **Schema Integrity:** Prisma schema validated via `prisma validate`.
- **Health Checks:** Production API health verified at `/api/health` returning `200 OK`.
- **Unauthenticated Protection:** Protected endpoints reject unauthorized calls with `401 Unauthorized`.
- **SPA Routing:** All 16 primary frontend application routes verified returning `200 OK`.
- **Comprehensive Functional Audit:** Full-scope audit confirmed 0 P0 and 0 P1 defects across all functional modules.

---

## 10. Deployment

The application is deployed on Railway across two isolated micro-services:

| Service | Environment | Endpoint |
| :--- | :--- | :--- |
| **Frontend** | Production (Railway) | [https://hris-frontend-production-9465.up.railway.app](https://hris-frontend-production-9465.up.railway.app) |
| **Backend API** | Production (Railway) | `https://hris-backend-production-34ba.up.railway.app` |

---

## 11. Local Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)
- PostgreSQL database instance (local or hosted)
- Supabase project (for private document storage)

### 1. Clone the Repository
```bash
git clone https://github.com/yukthavanshika/hris-portal.git
cd hris-portal
```

### 2. Backend Configuration
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with your local or development parameters (the repository excludes secrets):
```env
PORT=5001
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?schema=public
JWT_SECRET=<your_secure_jwt_secret_key>
SUPABASE_URL=https://<your_supabase_project_id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
SUPABASE_BUCKET=employee-documents
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Initialize the database schema with Prisma:
```bash
npx prisma generate
npx prisma migrate deploy
```

*(Optional)* Run the seed script to populate realistic organizational structure:
```bash
SEED_EMPLOYEE_PASSWORD=<your_temporary_seed_password> node seed.js
```

Start the backend development server:
```bash
npm start
```
The API server will run on `http://localhost:5001`.

### 3. Frontend Configuration
In a separate terminal, navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Create a `.env` or `.env.local` file in `frontend/` (optional for local dev as it defaults to port 5001):
```env
VITE_API_URL=http://localhost:5001
```

Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 12. Project Structure

```
hris-portal/
├── .gitignore                    # Root exclusions (.env, node_modules, build artifacts)
├── README.md                     # Project documentation
├── backend/
│   ├── .gitignore                # Backend-specific exclusions
│   ├── package.json              # Backend dependencies and scripts
│   ├── server.js                 # Express application initialization and middleware
│   ├── seed.js                   # Database seeder for demo organizational data
│   ├── prisma7.config.ts         # Prisma configuration
│   ├── lib/
│   │   ├── assistantService.js   # Company Assistant intent logic and security filters
│   │   ├── knowledgeBase.js      # Authoritative company policies and FAQs
│   │   ├── prisma.js             # Prisma client singleton
│   │   └── supabase.js           # Supabase client and storage helper
│   ├── middleware/
│   │   └── auth.js               # JWT verification and authentication middleware
│   ├── prisma/
│   │   ├── schema.prisma         # Relational database schema models
│   │   └── migrations/           # Database schema migrations
│   └── routes/
│       ├── auth.js               # Login, session verification (/api/auth/me)
│       ├── assistant.js          # Conversational assistant endpoint (/api/assistant/chat)
│       ├── attendance.js         # Employee clock-in/out and history
│       ├── adminAttendance.js    # HR attendance monitoring and regularization
│       ├── leave.js              # Employee leave application and balances
│       ├── adminLeave.js         # HR leave approvals and balance deduction
│       ├── documents.js          # Employee document upload and signed URLs
│       ├── adminDocuments.js     # HR document verification and rejection
│       ├── payroll.js            # Employee personal payslip access
│       ├── adminPayroll.js       # HR company payroll ledger and financial metrics
│       ├── employees.js          # Employee directory
│       ├── hrEmployees.js        # HR employee data lookup
│       ├── adminEmployees.js     # HR employee CRUD, manager & role assignment
│       └── organization.js       # Organization tree and directory endpoints
└── frontend/
    ├── .gitignore                # Frontend-specific exclusions
    ├── package.json              # Frontend dependencies and scripts
    ├── vite.config.js            # Vite bundler configuration
    ├── eslint.config.js          # ESLint rules
    ├── index.html                # Single-page application root HTML
    ├── public/                   # Static assets (favicons, SVG icons)
    └── src/
        ├── App.jsx               # Application routing, layout wrappers, route guards
        ├── App.css               # Global application design styles
        ├── config.js             # API base URL configuration and Axios interceptors
        ├── main.jsx              # React application entry point
        ├── assets/               # Images and logos
        ├── components/
        │   ├── EmployeeLayout.jsx  # Employee portal sidebar wrapper
        │   ├── EmployeeSidebar.jsx # Navigation sidebar for employees
        │   ├── HRLayout.jsx        # HR portal sidebar wrapper
        │   ├── HRSidebar.jsx       # Navigation sidebar for HR/Admin
        │   └── ProtectedRoute.jsx  # Client-side authentication and role guard
        └── pages/
            ├── Login.jsx           # Portal authentication interface
            ├── Dashboard.jsx       # Employee dashboard
            ├── Attendance.jsx      # Employee attendance tracking
            ├── Leave.jsx           # Employee leave requests and balances
            ├── Payroll.jsx         # Employee payslip viewer
            ├── Documents.jsx       # Employee document management
            ├── Organization.jsx    # Hierarchy tree and directory
            ├── Assistant.jsx       # Role-grounded conversational assistant
            ├── HRDashboard.jsx     # HR overview dashboard
            ├── HREmployees.jsx     # HR employee management and profiles
            ├── HRAttendance.jsx    # HR attendance monitoring and regularization
            ├── HRLeaveApproval.jsx # HR leave approval workflow
            ├── HRDocuments.jsx     # HR compliance document verification
            └── HRPayroll.jsx       # HR company-wide payroll, CSV export, payslips
```

---

## 13. Screenshots

*(Screenshots can be added to demonstrate key views in presentation submissions or portfolios)*

- **Employee Dashboard:** Overview of employee status, personalized greeting, and quick links.
- **HR Dashboard:** Operational overview featuring metric cards, action banners, and module access.
- **Employee Management:** Staff table with search, role selection, reporting manager assignment, and profile modal.
- **Payroll Management:** Company payroll ledger with financial KPI summary, CSV export, and printable payslip modal.
- **Organization Hierarchy:** Visual recursive reporting tree with search and collapsible branches.
- **Company Assistant:** Interactive conversational interface handling employee personal queries and HR operational lookups.

---

## 14. Future Enhancements

*(Potential roadmap additions for future architectural iterations)*

- **Multi-Factor Authentication (MFA):** Adding TOTP-based two-factor authentication for elevated administrative accounts.
- **Automated Email Notifications:** Dispatching transactional email alerts (via SendGrid or AWS SES) when leaves are submitted or documents are verified.
- **Shift Scheduling:** Dynamic roster planning and rotational shift assignments for large operational teams.
- **Performance Appraisals:** End-to-end performance review cycles, goal tracking, and 360-degree feedback modules.
- **Audit Logging Export:** Visual compliance audit logs detailing all administrative state changes and record access.

---

## 15. License

This project is open-source and available under the [MIT License](LICENSE).
