-- ==============================================================================
-- ProofBridge — Complete Supabase PostgreSQL Schema, Triggers, RLS & Storage
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SEQUENCE IF NOT EXISTS issue_code_seq START 1001;

-- ==========================================
-- 1. ENUMS & PROFILES
-- ==========================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('reporter', 'maintenance', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_status AS ENUM (
        'submitted',
        'under_review',
        'assigned',
        'in_progress',
        'awaiting_verification',
        'resolution_disputed',
        'more_evidence_required',
        'verified_resolved',
        'canceled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_urgency AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_category AS ENUM (
        'electrical',
        'plumbing',
        'hvac',
        'furniture_civil',
        'sanitation',
        'safety_grounds',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evidence_type AS ENUM (
        'report_attachment',
        'work_completion',
        'subsequent_submission'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'reporter',
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Automatically create a profile when a new Supabase user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'reporter'::public.user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 2. ISSUES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category issue_category NOT NULL,
    location_building TEXT NOT NULL,
    location_room TEXT,
    urgency issue_urgency NOT NULL DEFAULT 'medium',
    status issue_status NOT NULL DEFAULT 'submitted',
    is_demo BOOLEAN NOT NULL DEFAULT false,

    created_by UUID NOT NULL REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.profiles(id),
    reviewed_by UUID REFERENCES public.profiles(id),

    work_notes TEXT,
    review_notes TEXT,
    parent_recurring_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.generate_issue_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'PB-' || nextval('issue_code_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_issue_code ON public.issues;
CREATE TRIGGER trigger_set_issue_code
BEFORE INSERT ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.generate_issue_code();

CREATE OR REPLACE FUNCTION public.set_issue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    IF NEW.status = 'verified_resolved' AND OLD.status IS DISTINCT FROM 'verified_resolved' THEN
        NEW.resolved_at := timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_issue_updated_at ON public.issues;
CREATE TRIGGER trigger_set_issue_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.set_issue_updated_at();

-- ==========================================
-- 3. ISSUE_EVIDENCE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.issue_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    evidence_type evidence_type NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. ISSUE_EVENTS (Append-Only Timeline Ledger)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.issue_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    event_type TEXT NOT NULL,
    from_status issue_status,
    to_status issue_status,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON public.issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON public.issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_category_location ON public.issues(category, location_building);
CREATE INDEX IF NOT EXISTS idx_evidence_issue_id ON public.issue_evidence(issue_id);
CREATE INDEX IF NOT EXISTS idx_events_issue_id_created ON public.issue_events(issue_id, created_at ASC);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Issues policies
DROP POLICY IF EXISTS "Issues viewable by authenticated users" ON public.issues;
CREATE POLICY "Issues viewable by authenticated users"
ON public.issues FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create issues" ON public.issues;
CREATE POLICY "Users can create issues"
ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins have full update access" ON public.issues;
CREATE POLICY "Admins have full update access"
ON public.issues FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Assigned maintenance can update work fields" ON public.issues;
CREATE POLICY "Assigned maintenance can update work fields"
ON public.issues FOR UPDATE TO authenticated
USING (
    public.current_user_role() = 'maintenance'
    AND assigned_to = auth.uid()
)
WITH CHECK (
    status IN ('in_progress', 'awaiting_verification')
);

DROP POLICY IF EXISTS "Admins can delete demo issues" ON public.issues;
CREATE POLICY "Admins can delete demo issues"
ON public.issues FOR DELETE TO authenticated
USING (is_demo = true);

-- Evidence policies
DROP POLICY IF EXISTS "Evidence viewable by authenticated users" ON public.issue_evidence;
CREATE POLICY "Evidence viewable by authenticated users"
ON public.issue_evidence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Evidence upload restricted to reporter, assigned staff, or admin" ON public.issue_evidence;
CREATE POLICY "Evidence upload restricted to reporter, assigned staff, or admin"
ON public.issue_evidence FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = uploaded_by
    AND (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.issues
            WHERE id = issue_id
            AND (created_by = auth.uid() OR assigned_to = auth.uid())
        )
    )
);

-- Events policies (Append-Only: SELECT and INSERT only)
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.issue_events;
CREATE POLICY "Events viewable by authenticated users"
ON public.issue_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Events insertable by authenticated users" ON public.issue_events;
CREATE POLICY "Events insertable by authenticated users"
ON public.issue_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

-- ==========================================
-- 6. STORAGE BUCKET ('evidence-files')
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can read evidence files" ON storage.objects;
CREATE POLICY "Authenticated users can read evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-files');

DROP POLICY IF EXISTS "Authenticated users can upload evidence files" ON storage.objects;
CREATE POLICY "Authenticated users can upload evidence files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'evidence-files'
    AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);
