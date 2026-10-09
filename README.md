# HRMS (Human Resource Management System)

A modern, enterprise-grade Human Resource Management System (HRMS) built with **Next.js 16 (App Router)**, **React 19**, **Prisma ORM**, **MySQL**, **Tailwind CSS v4**, and **TypeScript**.

The system offers complete employee lifecycle management, attendance tracking, leave workflows, automated payroll calculation, PDF payslip generation, AI-powered resume parsing and candidate matching (Google Gemini / AWS Textract), company calendar, task management, compliance records, and fine-grained Role-Based Access Control (RBAC).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Company Profile Configuration](#3-company-profile-configuration)
  - [4. Database Setup & Migrations](#4-database-setup--migrations)
  - [5. Sync RBAC Permissions](#5-sync-rbac-permissions)
  - [6. Seed Company Configuration](#6-seed-company-configuration)
  - [7. Initialize Super Admin Account](#7-initialize-super-admin-account)
  - [8. Run the Development Server](#8-run-the-development-server)
- [All Available Commands](#all-available-commands)
  - [Application Scripts (`npm run`)](#application-scripts-npm-run)
  - [Prisma Database Commands (`npx prisma`)](#prisma-database-commands-npx-prisma)
- [Environment Variables Reference](#environment-variables-reference)
- [Project Architecture & Structure](#project-architecture--structure)
- [Key Workflows & Modules](#key-workflows--modules)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [AI Resume Parsing & Recruitment Matching](#ai-resume-parsing--recruitment-matching)
  - [Payroll & Payslip PDF Engine](#payroll--payslip-pdf-engine)
  - [Automated Attendance Checkout (Cron)](#automated-attendance-checkout-cron)
- [Production Deployment & Build](#production-deployment--build)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Features

- **Employee Lifecycle Management**: Onboarding, profile tracking, documents verification, credentials dispatch, and employee directories.
- **Attendance & Regularization**: Real-time punch-in/punch-out, status logging, regularization requests, review approvals, and automatic shift logout.
- **Leave Management**: Leave policies, multi-tier requests, manager approvals/rejections, and leave balance calculations.
- **Payroll & Payslip Processing**: Configurable salary structures, earnings, deductions, EPF, ESIC, tax calculations, and instant branded PDF generation.
- **AI-Driven Recruitment & ATS**: Job vacancy postings, applicant pipeline, PDF resume parsing with **Google Gemini AI**, and automated candidate-to-job matching score.
- **Statutory Compliance**: Tracking and managing PAN, GSTIN, EPFO establishment ID, and ESIC code.
- **Task & Daily Activity Reports**: Team task allocation, status boards, deadline tracking, and employee daily work reports.
- **Organization Calendar**: Centralized calendar with company holidays, employee leaves, and team events.
- **Granular RBAC System**: Database-backed permissions synced with a single canonical code registry (`src/rbac/permissions.ts`) with hard-coded Super Admin safety checks.
- **Notification Center**: Real-time notifications and Server-Sent Events (SSE) stream for instant updates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/) |
| **State Management** | [Redux Toolkit](https://redux-toolkit.js.org/) |
| **Database & ORM** | [MySQL 8.0+](https://www.mysql.com/), [Prisma ORM 6.10](https://www.prisma.io/) |
| **Authentication** | Custom Session Tokens & JWT ([jose](https://github.com/panva/jose) / [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **AI / LLM Services** | Google Gemini (`@google/generative-ai`), Groq SDK (`groq-sdk`), AWS Bedrock / Textract |
| **Email Service** | [Nodemailer](https://nodemailer.com/) (SMTP) |
| **File / PDF Engine** | PDF-Lib, PDFParse, PDFJS-dist, jspdf, html2canvas, mammoth, xlsx, Tesseract.js |

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **Node.js**: `v20.x` or higher (LTS recommended)
2. **Package Manager**: `npm` (comes with Node.js) or `pnpm` / `yarn`
3. **Database**: **MySQL 8.0+** running locally (e.g. via MySQL Server, XAMPP, Laragon, or Docker)
4. **Git**: Installed and configured

---

## Quick Start Guide

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already inside)
git clone <repository-url>
cd hrms

# Install dependencies
npm install
```

---

### 2. Environment Configuration

Copy the example environment file `.env.example` to create your local `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Windows (CMD)
copy .env.example .env

# Linux / macOS / Git Bash
cp .env.example .env
```

Open `.env` in your editor and configure the necessary variables. At minimum, verify:
- `DATABASE_URL`: Your MySQL database connection string.
- `JWT_SECRET`: A secure random secret key (e.g., generated with `openssl rand -hex 32`).
- `SUPER_ADMIN_SETUP_TOKEN`: A secret token for the Super Admin setup page/API.
- `CRON_SECRET`: A token for triggering attendance auto-logout jobs.
- `GEMINI_API_KEY`: *(Optional but recommended)* For AI resume parsing and candidate ranking.

---

### 3. Company Profile Configuration

The system uses `config/company.yaml` for corporate details (used on payslips, legal headers, and company info).

Create `config/company.yaml` from the example template:

```bash
# Windows (PowerShell)
Copy-Item config/company.example.yaml config/company.yaml

# Windows (CMD)
copy config\company.example.yaml config\company.yaml

# Linux / macOS / Git Bash
cp config/company.example.yaml config/company.yaml
```

Update `config/company.yaml` with your actual corporate metadata:
```yaml
company:
  name: "Your Company Name"
  address: "Corporate Office Address"
  city: "City"
  state: "State"
  pinCode: "123456"
  phone: "+91-9876543210"
  email: "hr@yourcompany.com"
  website: "https://yourcompany.com"

  cin: "U12345WB2024PTC123456"
  pan: "ABCDE1234F"
  gstin: "19ABCDE1234F1Z5"
  epfoEstablishmentId: "EPFO1234567890"
  esicEmployerCode: "ESIC1234567890"
```

---

### 4. Database Setup & Migrations

Make sure your MySQL database server is running and the database specified in `DATABASE_URL` exists. You can create it in MySQL CLI or your GUI:

```sql
CREATE DATABASE hrms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Next, generate the Prisma Client and push the schema:

```bash
# Generate the Prisma Client
npx prisma generate

# Synchronize the database schema with MySQL
npx prisma db push
```

> **Note:** If you prefer formal Prisma migrations instead of direct push:
> ```bash
> npx prisma migrate dev --name init
> ```

---

### 5. Sync RBAC Permissions

Synchronize all canonical permissions defined in `src/rbac/permissions.ts` into the MySQL database and ensure the `Super Admin` system role exists:

```bash
npm run rbac:sync
```

*(Optional)* Run the RBAC test suite to verify permissions and role resolution:

```bash
npm run rbac:test
```

---

### 6. Seed Company Configuration

Populate or update the company profile table in the database from `config/company.yaml`:

```bash
npm run db:seed-company
```

---

### 7. Initialize Super Admin Account

You have three convenient ways to create your initial Super Admin account:

#### Option A: Using the Seed Script (CLI)
Run the automated seed script to generate a Super Admin user:
```bash
node prisma/seed.mjs
```
The script will output the created Super Admin credentials in the terminal.

#### Option B: Using the Web Setup Interface (Browser)
1. Start the app with `npm run dev`.
2. Navigate to: [http://localhost:3000/setup/super-admin](http://localhost:3000/setup/super-admin)
3. Enter your `SUPER_ADMIN_SETUP_TOKEN` (configured in `.env`), desired email, name, and strong password.
4. Click **Create Super Admin**. Once created, the setup route automatically locks down.

#### Option C: Using the API Endpoint (`curl` / Postman)
```bash
curl -X POST http://localhost:3000/api/setup/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "setupToken": "your_secure_setup_token_here",
    "name": "Super Administrator",
    "email": "admin@yourcompany.com",
    "password": "YourStrongPassword123!"
  }'
```

---

### 8. Run the Development Server

Start the local Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Log in using your Super Admin credentials.

---

## All Available Commands

### Application Scripts (`npm run`)

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js local development server (Turbopack / Webpack). |
| `npm run build` | Builds the production application bundle. |
| `npm run start` | Starts the Next.js production server (requires `npm run build` first). |
| `npm run lint` | Runs ESLint 9 checks across the codebase. |
| `npm run rbac:sync` | Scans `src/rbac/permissions.ts` and synchronizes all system permissions to the database. |
| `npm run rbac:test` | Executes automated RBAC verification matrix and role permission checks. |
| `npm run db:seed-company` | Reads `config/company.yaml` and upserts the company profile in the database. |

### Prisma Database Commands (`npx prisma`)

| Command | Description |
|---|---|
| `npx prisma generate` | Generates the Prisma Client JavaScript/TypeScript artifacts based on `prisma/schema.prisma`. |
| `npx prisma db push` | Pushes the Prisma schema state directly to your MySQL database without generating migrations. |
| `npx prisma migrate dev` | Creates and applies a new migration to the database in development. |
| `npx prisma migrate deploy` | Applies all pending migrations in staging or production environments. |
| `npx prisma studio` | Launches Prisma Studio, an interactive web interface at `http://localhost:5555` to browse and edit database records. |
| `npx prisma format` | Validates and automatically formats `prisma/schema.prisma`. |
| `npx prisma db pull` | Introspects an existing database and updates `prisma/schema.prisma`. |

### Setup & Seeding Helper Scripts

| Command | Description |
|---|---|
| `node prisma/seed.mjs` | Seeds an initial Super Admin user with randomized credentials and assigns the Super Admin role. |
| `node scripts/migrate-rbac-schema.js` | Applies raw SQL schema safeguards for roles and permissions tables if upgrading an older database. |

---

## Environment Variables Reference

Here is the complete reference of all environment variables supported by the system:

| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | MySQL connection URL for Prisma ORM | `mysql://root:password@127.0.0.1:3306/hrms` |
| `JWT_SECRET` | **Yes** | Secret string used to sign and verify user authentication JWT tokens | `openssl rand -hex 32` |
| `SUPER_ADMIN_SETUP_TOKEN` | **Yes** | Secret pass-phrase required to access and execute Super Admin initialization | `any_secure_random_string` |
| `CRON_SECRET` | **Yes** | Secret key required in authorization headers for scheduled automation endpoints | `cron_secret_string` |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Public URL where the application is accessible (used for email links) | `http://localhost:3000` |
| `NEXTAUTH_URL` | Recommended | Base URL used for internal API callbacks | `http://localhost:3000` |
| `NODE_ENV` | Optional | Runtime environment (`development`, `production`, `test`) | `development` |
| `COMPANY_CONFIG_PATH` | Optional | Custom relative path to company profile YAML configuration | `config/company.yaml` |
| `SUPERADMIN_EMAIL` | Optional | Email for Super Admin seed script | `admin@example.com` |
| `SUPERADMIN_PASSWORD` | Optional | Password for Super Admin seed script | `StrongPassword123!` |
| `SUPERADMIN_PREFIX` | Optional | Prefix for auto-generated seed admin emails | `superadmin_` |
| `SUPERADMIN_DOMAIN` | Optional | Domain for auto-generated seed admin emails | `example.com` |
| `SMTP_HOST` | Optional | SMTP mail server hostname for outbound emails (credentials & payslips) | `smtp.hostinger.com` |
| `SMTP_PORT` | Optional | SMTP mail server port | `465` (SSL) or `587` (TLS) |
| `EMAIL_USER` | Optional | SMTP username / sender address | `info@yourcompany.com` |
| `EMAIL_PASS` | Optional | SMTP user password or app-specific password | `your_email_password` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for resume parsing & job matching | `AIzaSy...` |
| `GROQ_API_KEY` | Optional | Groq API key for fast LLM inference | `gsk_...` |
| `OPENAI_API_KEY` | Optional | OpenAI API key (optional alternative LLM provider) | `sk-proj-...` |
| `BOT_MODE` | Optional | Assistant operating mode (`RULE_BASED` or `LLM`) | `RULE_BASED` |
| `AWS_REGION` | Optional | AWS region for AWS services (Textract / Bedrock) | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Optional | AWS Access Key ID for Textract OCR | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS Secret Access Key for Textract OCR | `wJalrXUtn...` |

---

## Project Architecture & Structure

```
hrms/
├── config/
│   ├── company.example.yaml      # Template company configuration file
│   └── company.yaml              # Local company configuration (gitignored)
├── prisma/
│   ├── schema.prisma             # Complete Prisma schema definition
│   ├── seed.mjs                  # Script to seed Super Admin user
│   └── rbac-migration.sql        # Standalone SQL schema migration for RBAC
├── public/
│   └── uploads/                  # Upload directory for profile pictures, docs, and payslips
├── scripts/
│   ├── rbac-sync.js              # Syncs permissions from code to MySQL
│   ├── test-rbac.js              # RBAC verification test suite
│   ├── seed-company.ts           # Upserts company details from YAML to DB
│   └── migrate-rbac-schema.js    # Raw schema update utility
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── (auth)/login/         # Authentication and login screens
│   │   ├── api/                  # Route handlers (REST endpoints, webhooks)
│   │   │   ├── attendance/       # Clock-in/out, regularization, auto-logout
│   │   │   ├── payroll/          # Payroll calculation and processing
│   │   │   ├── payslip/          # PDF generation & email disbursement
│   │   │   ├── recruitment/      # ATS, candidates, interviews
│   │   │   ├── setup/            # Initial Super Admin creation API
│   │   │   └── textract/         # AWS OCR endpoints
│   │   ├── attendance/           # Attendance pages and history
│   │   ├── dashboard/            # Role-aware user dashboard
│   │   ├── employee/             # Employee management and directories
│   │   ├── leave-request/        # Leave submission and review views
│   │   ├── payroll/              # Payroll dashboard & processing
│   │   ├── Recruitment/          # ATS and candidate tracker
│   │   ├── settings/             # System settings and RBAC management
│   │   └── setup/super-admin/    # Browser setup screen for initial Super Admin
│   ├── Components/               # Reusable UI components & layouts
│   ├── contexts/                 # React Context providers (Auth, Theme, etc.)
│   ├── lib/                      # Core helpers & business logic
│   │   ├── prisma.ts             # Prisma client singleton instance
│   │   ├── rbac.ts               # Core RBAC verification functions
│   │   ├── authMiddleware.ts     # JWT verification & route protection
│   │   ├── payslipPdfGenerator.ts# PDF payslip generator
│   │   ├── salaryCalculation.ts  # Compensation, EPF, ESIC, Tax logic
│   │   ├── resumeParser/         # Gemini AI resume parsing logic
│   │   └── jd-analysis/          # Job description parsing & matching
│   ├── rbac/
│   │   └── permissions.ts        # Canonical Single Source of Truth for all permissions
│   ├── store/                    # Redux Toolkit store and slices
│   └── types/                    # Shared TypeScript interfaces & types
├── .env.example                  # Documented environment variables template
├── next.config.ts                # Next.js build and runtime configuration
├── package.json                  # Dependencies and npm run scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Key Workflows & Modules

### Role-Based Access Control (RBAC)

1. **Permissions Registry**: All permissions are centrally registered in `src/rbac/permissions.ts`. Never manually create ad-hoc permission strings.
2. **Syncing**: Run `npm run rbac:sync` whenever new permissions are added to `src/rbac/permissions.ts`.
3. **Super Admin Bypass**: Any user with `role = "superadmin"` or assigned to a role with `type = "SUPER_ADMIN"` automatically possesses all system permissions, bypassing role-permission junction table lookups.
4. **API Route Protection**: API endpoints utilize `authMiddleware` or `checkPermission(user, PERMISSIONS.MODULE.ACTION)` to secure access.

### AI Resume Parsing & Recruitment Matching

1. **Resume Ingestion**: Resumes uploaded in PDF or image format can be analyzed using `pdf-parse`, `tesseract.js`, or AWS Textract.
2. **Gemini Extraction**: Structured extraction pulls candidate skills, experience, education, and contact details via Google Gemini.
3. **Compatibility Scoring**: Automatically computes candidate compatibility against Job Descriptions (JD).

### Payroll & Payslip PDF Engine

1. **Salary Computation**: Engine calculates Basic, HRA, Special Allowance, PF deduction (EPFO rules), ESIC, Professional Tax, and Income Tax.
2. **PDF Payslip Generation**: Dynamic generation of corporate payslips utilizing company details from `config/company.yaml`.
3. **Disbursement**: One-click email disbursement with PDF attachments sent directly via configured SMTP server.

### Automated Attendance Checkout (Cron)

To automatically clock out employees at the end of their shift, configure an external cron job (e.g. crontab, Vercel Cron, or GitHub Actions) to send an authenticated request:

```bash
curl -X POST https://your-domain.com/api/attendance/auto-logout \
  -H "Authorization: Bearer <YOUR_CRON_SECRET>"
```

---

## Production Deployment & Build

To build and run the application for production:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Deploy database migrations
npx prisma migrate deploy

# 3. Synchronize permissions & company metadata
npm run rbac:sync
npm run db:seed-company

# 4. Build Next.js application
npm run build

# 5. Start production server
npm run start
```

Ensure all required production environment variables (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_BASE_URL`, SMTP credentials) are set in your production environment manager.

---

## Troubleshooting & FAQs

### 1. `PrismaClientInitializationError: Can't reach database server`
- Ensure your MySQL server service is active (`services.msc` on Windows or `sudo systemctl status mysql` on Linux).
- Verify host, port (default `3306`), username, and password in `DATABASE_URL`.
- Confirm that the database named in the URL actually exists (`CREATE DATABASE hrms;`).

### 2. `Invalid setup token` on Super Admin Setup Page
- Check `SUPER_ADMIN_SETUP_TOKEN` in your `.env` file.
- Restart the dev server (`npm run dev`) after modifying `.env`.
- Ensure the token provided in the UI or curl request exactly matches the value in `.env`.

### 3. Permissions missing or "Unauthorized" for non-admin roles
- Run `npm run rbac:sync` to ensure any newly added permissions are committed to your database.
- Go to **Settings > Roles & Permissions** in the web interface and ensure the role has the appropriate checkboxes toggled.

### 4. Uploaded files or profile pictures not displaying
- Verify that `public/uploads` directory exists.
- In `next.config.ts`, file requests under `/uploads/:path*` are rewritten to `/api/uploads/:path*` for authenticated file serving. Ensure proper filesystem permissions on `public/uploads`.

### 5. `Error: Missing "company" object in YAML file`
- Ensure `config/company.yaml` exists and is formatted correctly.
- Refer to `config/company.example.yaml` for the required schema and field names.
