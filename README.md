<div align="center">

# 🌉 ProofBridge
### *From Reported Problems to Verified Outcomes.*

An evidence-first civic and campus facility operations platform that eliminates the "closed ticket" illusion through photographic proof, strict role separation, and verification workflows.

[![Live Demo](https://img.shields.io/badge/Live_Demo-proofbridg.vercel.app-FF8A32?style=for-the-badge&logo=vercel&logoColor=white)](https://proofbridg.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

[**Explore Live Application ↗**](https://proofbridg.vercel.app/) • [**Report an Issue**](https://proofbridg.vercel.app/) • [**Architecture Docs**](./docs/architecture.md)

</div>

---

## 📸 Visual Showcase

### 1. Landing Page & Public Community Watch
Clean editorial aesthetic designed with micro-interactions, live status pulsing, and real-time civic impact metrics.

![ProofBridge Landing Page](./docs/screenshots/landing-hero.png)

---

### 2. Operations Dashboard & Evidence Review Drawer
Field technicians upload before-and-after photographic evidence; administrators review comparisons side-by-side before marking an issue verified.

![ProofBridge Dashboard and Evidence Review](./docs/screenshots/dashboard-evidence.png)

---

## 🎯 The Core Philosophy: The "Closed Ticket" Illusion

In traditional issue tracking systems, issues are routinely marked **"Resolved"** the moment a contractor claims completion—leaving citizens frustrated when streetlights remain unlit, leaks persist, or repairs fail quality standards.

**ProofBridge re-engineers this pipeline with an evidence-first philosophy:**

```
[ Citizen Report ] ➔ [ Staff Assigned ] ➔ [ Work in Progress ]
                                                │
                                                ▼
                                    [ Awaiting Verification ]  ◄── (Repair Claimed + Photo Proof)
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             [ Resolution Disputed ]                           [ Verified Resolved ]
           (Re-opened for technician)                       (Official Sign-Off by Admin)
```

> **Claimed Repair ≠ Verified Outcome.** An issue cannot reach `Verified Resolved` without verifiable photographic evidence and human administrator review.

---

## ✨ Key Features

- **🛡️ Strict 3-Tier Role Separation**:
  - **Citizen / Reporter:** Public sign-up to submit geo-tagged issues with photos, track progress, and dispute inadequate repairs.
  - **Maintenance Staff:** Field operations portal to claim assignments, log progress notes, and upload timestamped completion evidence.
  - **Higher Authority / Administrator:** Restricted console with 2-step OTP authentication to provision staff accounts, review evidence, and verify resolutions.

- **📸 Side-by-Side Evidence Verification**:
  - Direct comparative inspection of the original complaint photo against technician completion proof.
  - Transparent audit trail logging every state transition, actor ID, and reviewer notes.

- **🔐 Serverless Security & Zero Secret Leakage**:
  - Dedicated **Vercel Serverless Function** (`/api/authority`) handles Higher Authority credential checks and OTP verification.
  - Secrets and Master Backup PINs are strictly isolated on the server and never bundled into client JavaScript.
  - Rate limiting (max 10 attempts/min) and cryptographic timing-safe comparisons to prevent side-channel attacks.

- **⚡ 60fps Micro-Interactions & Motion Design**:
  - Staggered entrances, subtle card elevation on hover (`.card-hover`), interactive micro-press buttons (`.btn-interact`), and live radar pulses on active issues (`.live-pulse-dot`).
  - Full accessibility compliance respecting `prefers-reduced-motion`.

- **🌐 Hybrid Persistence Engine**:
  - **Cloud Mode:** Full integration with Supabase PostgreSQL, Storage, and Row-Level Security (RLS).
  - **Zero-Setup Offline Fallback:** Self-healing local database fallback ensuring immediate usability in local development or offline campus intranets.

- **📊 Civic Analytics & Building Heatmaps**:
  - Automated calculation of average resolution turnaround times, disputed rework rates, category distribution, and recurring issue detection.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript), Vite 6 |
| **Styling & Design System** | Tailwind CSS 3.4, PostCSS, Lucide Icons |
| **Serverless Backend** | Node.js Serverless Functions on Vercel (`/api/authority`) |
| **Database & Auth** | Supabase (PostgreSQL, Storage Buckets, GoTrue Auth, RLS Policies) |
| **Security** | Crypto Timing-Safe Equality, Session Encryption, Rate Limiting |
| **Hosting & CDN** | Vercel Global Edge Network with SPA Rewrites & Immutable Caching |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/biswajitbiswal-in/proofBridge.git
cd proofBridge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template to `.env`:
```bash
cp .env.example .env
```

Fill in your configuration:
```env
# Client-side configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_AUTHORITY_FULL_NAME=Biswajit Biswal
VITE_AUTHORITY_EMAIL=biswajitbiswal.in@gmail.com

# Server-side authority secrets (for local node testing)
AUTHORITY_PASSWORD=YourMasterPassword
AUTHORITY_BACKUP_PIN=792026
```

### 4. Run Test Suite
```bash
npm test
```
*Verifies all state machine transitions, role separation rules, and OTP flows.*

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your browser.

---

## ☁️ Deployment Guide (Vercel)

ProofBridge includes pre-configured [`vercel.json`](./vercel.json) rules for SPA routing and edge serverless API endpoints.

1. **Push your code to GitHub:**
   ```bash
   git push origin main
   ```
2. **Import repository on Vercel:**
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Configure Environment Variables in Vercel:**

   **Public Variables:**
   - `VITE_SUPABASE_URL` = `https://mgiajyzldziptxorubob.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_tDU9kYhLXQEt9RnK1XJSYQ_yNPWqU19`
   - `VITE_AUTHORITY_FULL_NAME` = `Biswajit Biswal`
   - `VITE_AUTHORITY_EMAIL` = `biswajitbiswal.in@gmail.com`

   **Server-Only Secrets (Do not prefix with `VITE_`):**
   - `AUTHORITY_PASSWORD` = *(Your master password)*
   - `AUTHORITY_BACKUP_PIN` = `792026`
   - `AUTHORITY_EMAIL` = `biswajitbiswal.in@gmail.com`
   - `AUTHORITY_FULL_NAME` = `Biswajit Biswal`

4. **Deploy:** Vercel automatically compiles the production bundle and deploys the live site to `https://proofbridg.vercel.app/`.

---

## 📁 Repository Structure

```text
proofBridge/
├── api/
│   └── authority.ts               # Vercel Serverless Function (Master Auth & OTP)
├── docs/
│   ├── architecture.md            # System architecture & RLS specification
│   ├── prd.md                     # Product requirements document
│   └── screenshots/               # Visual presentation screenshots
│       ├── landing-hero.png
│       └── dashboard-evidence.png
├── src/
│   ├── components/
│   │   ├── IssueDetailDrawer.tsx  # Evidence verification modal drawer
│   │   ├── ProofBridgeLogo.tsx    # Responsive vector brand mark
│   │   └── SecondaryViews.tsx     # Admin, Analytics, Timeline & Reviews views
│   ├── lib/
│   │   └── supabase.ts            # Supabase client & connection detection
│   ├── services/
│   │   └── proofBridgeService.ts  # State machine, operations & offline persistence
│   ├── types/
│   │   ├── domain.ts              # Domain entities, roles, and status enums
│   │   ├── stateMachine.test.ts   # State transition unit tests
│   │   └── authAndRoleSeparation.test.ts # Role boundary & auth unit tests
│   ├── App.tsx                    # Core application layout & routing
│   └── index.css                  # Design system tokens & Tailwind keyframes
├── supabase/
│   └── schema.sql                 # PostgreSQL DDL, trigger functions & RLS policies
├── vercel.json                    # Vercel deployment & SPA rewrite routing
├── tailwind.config.js             # Editorial theme & color palette
└── package.json
```

---

## 📄 License & Credits

Created by **Biswajit Biswal** ([@biswajitbiswal-in](https://github.com/biswajitbiswal-in))

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
