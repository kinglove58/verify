CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS staff (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','data_entry','approver','auditor')),
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_staff_idx ON sessions(staff_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE,
 title text NOT NULL,
 description text NOT NULL DEFAULT '',
 validity_months integer CHECK (validity_months IS NULL OR validity_months BETWEEN 1 AND 240),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 legal_name text NOT NULL,
 email text NOT NULL,
 phone text,
 created_by uuid NOT NULL REFERENCES staff(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidates_email_idx ON candidates(lower(email));

CREATE TABLE IF NOT EXISTS enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidate_id uuid NOT NULL REFERENCES candidates(id),
 program_id uuid NOT NULL REFERENCES programs(id),
 cohort text NOT NULL,
 score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
 outcome text NOT NULL CHECK (outcome IN ('passed','failed')),
 state text NOT NULL DEFAULT 'submitted' CHECK (state IN ('submitted','approved','rejected')),
 submitted_by uuid NOT NULL REFERENCES staff(id),
 decided_by uuid REFERENCES staff(id),
 decided_at timestamptz,
 decided_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(candidate_id,program_id,cohort)
);
CREATE INDEX IF NOT EXISTS enrollments_state_idx ON enrollments(state,created_at DESC);

CREATE TABLE IF NOT EXISTS certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrollment_id uuid NOT NULL UNIQUE REFERENCES enrollments(id),
 public_id text NOT NULL UNIQUE,
 holder_name text NOT NULL,
 course_title text NOT NULL,
 issuer_name text NOT NULL,
 is_demo boolean NOT NULL DEFAULT true,
 issued_at date NOT NULL DEFAULT CURRENT_DATE,
 expires_at date,
 state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','suspended','revoked')),
 last_reason text,
 created_by uuid NOT NULL REFERENCES staff(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificates_status_idx ON certificates(state, issued_at DESC);

CREATE TABLE IF NOT EXISTS certificate_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 certificate_id uuid NOT NULL REFERENCES certificates(id),
 action text NOT NULL,
 reason text,
 actor_id uuid REFERENCES staff(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificate_events_cert_idx ON certificate_events(certificate_id,created_at DESC);

CREATE TABLE IF NOT EXISTS api_clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 label text NOT NULL,
 token_hash text NOT NULL UNIQUE,
 created_by uuid NOT NULL REFERENCES staff(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS claim_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 certificate_id uuid NOT NULL REFERENCES certificates(id),
 client_id uuid NOT NULL REFERENCES api_clients(id),
 subject_ref text NOT NULL,
 code_hash text NOT NULL,
 expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS claims_client_idx ON claim_challenges(client_id,created_at DESC);

CREATE TABLE IF NOT EXISTS certificate_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 certificate_id uuid NOT NULL REFERENCES certificates(id),
 client_id uuid NOT NULL REFERENCES api_clients(id),
 subject_ref text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(certificate_id,client_id),
 UNIQUE(client_id,subject_ref,certificate_id)
);

CREATE TABLE IF NOT EXISTS request_limits (
 scope text NOT NULL,
 fingerprint text NOT NULL,
 bucket bigint NOT NULL,
 hits integer NOT NULL DEFAULT 0,
 PRIMARY KEY(scope,fingerprint,bucket)
);

CREATE TABLE IF NOT EXISTS audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES staff(id),
 action text NOT NULL,
 entity_type text NOT NULL,
 entity_id text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_recent_idx ON audit_events(created_at DESC);

-- Supabase safety boundary: this application accesses PostgreSQL from its server
-- through a privileged connection, not from supabase-js in the browser.
-- Default-deny Row Level Security prevents anon/authenticated Data API access,
-- including on older Supabase projects that automatically grant table privileges.
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
