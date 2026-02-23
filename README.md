# Serene Say - Internal Tracker
Internal order, inventory and shipment tracker for Serene Say Beauty Products.

## Table of Contents
- [Project Overview](#project-overview)
  - [What This App Does](#what-this-app-does)
  - [Tech Stack](#tech-stack)
  - [User Roles](#user-roles)
- [Local Development](#local-development)
  - [Prerequisites](#prerequisites)
  - [Clone and Install](#clone-and-install)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Run Development Server](#run-development-server)
  - [Default Dev Credentials](#default-dev-credentials)
- [Production Deployment (Hostinger)](#production-deployment-hostinger)
  - [Overview](#overview)
  - [Step 1 - Build the App Locally](#step-1---build-the-app-locally)
  - [Step 2 - Prepare Files for Upload](#step-2---prepare-files-for-upload)
  - [Step 3 - Upload to Hostinger](#step-3---upload-to-hostinger)
  - [Step 4 - Configure Node.js App in Hostinger](#step-4---configure-nodejs-app-in-hostinger)
  - [Step 5 - Configure Production Environment Variables](#step-5---configure-production-environment-variables)
  - [Step 6 - Configure Upload Storage on Hostinger](#step-6---configure-upload-storage-on-hostinger)
  - [Step 7 - Start and Verify](#step-7---start-and-verify)
  - [Step 8 - Post-Deploy Checklist](#step-8---post-deploy-checklist)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

## Project Overview

### What This App Does
Serene Say is a private internal tool for managing cosmetics orders sourced from the USA and sold in Bangladesh. It centralizes buyer management, order lifecycle tracking, BD and USA inventory, shipment batch operations, pricing calculations, and monthly reporting in a single authenticated dashboard.

### Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Frontend + API routes |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| Prisma 6 | Database ORM |
| Supabase | PostgreSQL database |
| iron-session | Cookie-based authentication |
| SheetJS (xlsx) | Excel export |
| Fuse.js | Fuzzy search |
| Recharts | Charts in reports |
| Node.js | Runtime on Hostinger |

### User Roles
- Admin: full access including Reports and Settings.
- Moderator: all access except Reports page.

## Local Development

### Prerequisites
- Node.js 18+ installed.
- npm or yarn.
- Git.
- A Supabase account and project.

### Clone and Install
```bash
git clone [repo-url]
cd serene-say
npm install
```

### Environment Variables
Create a `.env.local` file in the project root.

```env
# Database (Supabase PostgreSQL pooler URL)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Authentication credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
MODERATOR_USERNAME=moderator
MODERATOR_PASSWORD=your_secure_password_here
AUTH_SECRET=minimum_32_character_secret_key_here!!

# Image uploads
UPLOAD_DIR=./public/uploads/inventory
UPLOAD_URL_PREFIX=/uploads/inventory
```

> [!WARNING]
> Never commit `.env.local` to git. Make sure `.env.local` is listed in `.gitignore`.

### Database Setup
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### Run Development Server
```bash
npm run dev
```

Open: `http://localhost:3000`

### Default Dev Credentials
- Admin: `admin / serene2026`
- Moderator: `moderator / serene123`

> [!WARNING]
> Change these credentials before production deployment.

## Production Deployment (Hostinger)

### Overview
This app runs as a Node.js process on Hostinger shared hosting using Hostinger's Node.js manager. The recommended deployment flow is to build locally in standalone mode, upload the built output, and run it with `node server.js`.

### Step 1 - Build the App Locally
```bash
# Check for TypeScript errors first
npx tsc --noEmit

# Run linter
npm run lint

# Build for production
npm run build
```

After build, the standalone output is generated in `.next/standalone/`.

`next.config.js` must include:
```js
output: 'standalone'
```

### Step 2 - Prepare Files for Upload
Files to upload to Hostinger:
- `.next/standalone/*` (this contains `server.js` and traced runtime files).
- `.next/static/*` -> copy into `DEPLOY_ROOT/.next/static/`.
- `public/*` -> copy into `DEPLOY_ROOT/public/`.
- `prisma/schema.prisma` (recommended for runtime compatibility and maintenance scripts).
- `package.json` and `package-lock.json` (optional but recommended for traceability).

Recommended deployment structure on server:
```text
[app-root]/
  server.js
  .next/
    static/
  public/
  prisma/
    schema.prisma
  node_modules/   (from standalone trace)
```

### Step 3 - Upload to Hostinger
Use Hostinger File Manager or SFTP:
- Create an app folder, for example: `~/apps/serene-say`.
- Upload standalone files into that folder.
- Ensure `server.js` is directly inside the selected app root.

### Step 4 - Configure Node.js App in Hostinger
In Hostinger hPanel -> Node.js:
- Node.js version: `18+` (prefer latest LTS available in panel).
- Application root: your upload folder, e.g. `apps/serene-say`.
- Application startup file: `server.js`.
- Application mode: `production`.

Then click **Create/Update** and **Restart**.

### Step 5 - Configure Production Environment Variables
In Hostinger Node.js environment variables, set:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

ADMIN_USERNAME=admin
ADMIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
MODERATOR_USERNAME=moderator
MODERATOR_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
AUTH_SECRET=REPLACE_WITH_32_PLUS_CHAR_RANDOM_SECRET

# Hostinger production upload path (example)
UPLOAD_DIR=/home/u123456789/domains/thebaymart.com/public_html/uploads/inventory
UPLOAD_URL_PREFIX=https://thebaymart.com/uploads/inventory
```

If your app is mounted under a domain path, keep `UPLOAD_URL_PREFIX` aligned with the publicly accessible URL for uploaded files.

### Step 6 - Configure Upload Storage on Hostinger
Create upload directory (via File Manager or SSH):
```bash
mkdir -p /home/u123456789/domains/thebaymart.com/public_html/uploads/inventory
```

Ensure it is writable by your Node.js app user.

### Step 7 - Start and Verify
After restart:
- Open `https://thebaymart.com`.
- Login with Admin or Moderator credentials.
- Verify:
  - Buyer list and order pages load.
  - Inventory pages load.
  - Image upload works and generated URLs are accessible.
  - New Order flow opens from `+ New Order`.

### Step 8 - Post-Deploy Checklist
- Confirm Reports page is Admin-only.
- Confirm Moderator cannot access Reports.
- Confirm authentication cookie persists across page navigation.
- Confirm order status updates, tag updates, and delete actions work.
- Confirm shipment and inventory operations persist in Supabase.
- Confirm exports (`xlsx`) work from browser.

## Useful Commands
```bash
# Development
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Prisma
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Troubleshooting
- `Cannot find module ...` after deploy:
  - Re-check that all files from `.next/standalone` were uploaded and `server.js` is in app root.
- Static assets not loading:
  - Confirm `.next/static` was copied to `DEPLOY_ROOT/.next/static`.
- Uploaded images return 404:
  - Verify `UPLOAD_DIR` path exists and `UPLOAD_URL_PREFIX` points to the same public directory.
- Login loop to `/login`:
  - Verify `AUTH_SECRET` is set and stable (not changed between restarts unexpectedly).
- Database connection errors:
  - Verify `DATABASE_URL` and Supabase pooler host/port.

## Security Notes
- Keep `.env.local` and production env values private.
- Use strong passwords for Admin and Moderator accounts.
- Rotate `AUTH_SECRET` and credentials periodically.
- Restrict access to Hostinger panel and deployment credentials.
- Back up Supabase database regularly before major changes.
