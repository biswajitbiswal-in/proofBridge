# ProofBridge — Evidence-First Issue Reporting & Resolution

**Tagline:** From reported problems to verified outcomes.

ProofBridge tracks campus, hostel, and facility maintenance issues from the initial report to evidence-reviewed resolution—explicitly separating **`Awaiting Verification` (Repair Claimed)** from **`Verified Resolved`**.

## Quick Start (Supabase + Vite + React + TypeScript)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase credentials:**
   Copy `.env.example` to `.env` and add your Supabase project URL and anonymous key:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Run database schema & RLS migration:**
   Open the **Supabase SQL Editor** and execute [`supabase/schema.sql`](./supabase/schema.sql).

4. **Run the app & state-machine self-check:**
   ```bash
   npm test
   npm run dev
   ```
