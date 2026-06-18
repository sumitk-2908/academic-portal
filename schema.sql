-- ========================================================================
-- ACADEMIC PORTAL — PostgreSQL Database Schema v1.0
-- Stack: FastAPI + SQLAlchemy + PostgreSQL 16
-- ========================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Trigram fuzzy search


-- ========================================================================
-- TABLE DEFINITIONS
-- ========================================================================

-- 1. DEGREES  (B.Tech CSE, B.Tech ME, etc.)
CREATE TABLE degrees (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,                 -- Full name
    code        VARCHAR(20)  NOT NULL UNIQUE,          -- e.g., "BTCSE"
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- 2. SEMESTERS
CREATE TABLE semesters (
    id              SERIAL PRIMARY KEY,
    degree_id       INTEGER     NOT NULL REFERENCES degrees(id) ON DELETE CASCADE,
    number          SMALLINT    NOT NULL CHECK (number BETWEEN 1 AND 8),
    academic_year   VARCHAR(9),                        -- e.g., "2024-2025"
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (degree_id, number)
);


-- 3. SUBJECTS  (PPS, Mechanics, BEE, etc.)
CREATE TABLE subjects (
    id          SERIAL PRIMARY KEY,
    semester_id INTEGER     NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,                 -- Full name
    code        VARCHAR(20)  NOT NULL UNIQUE,          -- e.g., "CS101"
    short_name  VARCHAR(50),                           -- e.g., "PPS"
    credits     SMALLINT     CHECK (credits > 0),
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- 4. MODULES  (Units/Chapters within a subject)
CREATE TABLE modules (
    id          SERIAL PRIMARY KEY,
    subject_id  INTEGER     NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    number      SMALLINT    NOT NULL,                  -- 1, 2, 3 …
    title       VARCHAR(200) NOT NULL,                 -- e.g., "Introduction to C"
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (subject_id, number)
);


-- 5. MATERIAL TYPES  (lookup / enum table)
CREATE TABLE material_types (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,        -- e.g., "Previous Year Questions"
    slug          VARCHAR(50)  NOT NULL UNIQUE,        -- e.g., "pyq"
    icon          VARCHAR(50),                         -- Lucide icon identifier
    display_order SMALLINT     NOT NULL DEFAULT 0
);

-- Seed material types immediately (these rarely change)
INSERT INTO material_types (name, slug, icon, display_order) VALUES
    ('Previous Year Questions', 'pyq',       'FileQuestion',  1),
    ('Tutorial Sheet',          'tutorial',  'BookOpen',      2),
    ('Syllabus',                'syllabus',  'ListOrdered',   3),
    ('Lecture Notes',           'notes',     'NotebookPen',   4),
    ('Lab Manual',              'lab',       'FlaskConical',  5),
    ('Reference Book',          'reference', 'Library',       6);


-- 6. USERS  (students, moderators, admins)
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    name             VARCHAR(200) NOT NULL,
    password_hash    VARCHAR(255),                     -- NULL for OAuth/SSO users
    role             VARCHAR(20)  NOT NULL DEFAULT 'student'
                         CHECK (role IN ('student', 'moderator', 'admin')),
    degree_id        INTEGER REFERENCES degrees(id) ON DELETE SET NULL,
    current_semester SMALLINT,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 7. DOCUMENTS  (core entity — the actual PDF records)
CREATE TABLE documents (
    id                SERIAL PRIMARY KEY,
    subject_id        INTEGER      NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    module_id         INTEGER      REFERENCES modules(id) ON DELETE SET NULL,
    material_type_id  INTEGER      NOT NULL REFERENCES material_types(id),

    -- File metadata
    title             VARCHAR(300) NOT NULL,
    description       TEXT,
    file_url          VARCHAR(1000) NOT NULL,           -- Public or signed CDN URL
    file_key          VARCHAR(500),                     -- S3/Supabase object key
    file_name         VARCHAR(255) NOT NULL,
    file_size_bytes   INTEGER,
    mime_type         VARCHAR(100) NOT NULL DEFAULT 'application/pdf',

    -- PYQ-specific metadata
    exam_year         SMALLINT,                         -- e.g., 2024
    exam_type         VARCHAR(50),                      -- 'Mid-Term' | 'End-Term' | 'Sessional'

    -- Workflow
    upload_status     VARCHAR(20)  NOT NULL DEFAULT 'approved'
                          CHECK (upload_status IN ('pending', 'approved', 'rejected')),
    rejection_reason  TEXT,
    is_verified       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Analytics
    view_count        INTEGER      NOT NULL DEFAULT 0,
    download_count    INTEGER      NOT NULL DEFAULT 0,

    -- Audit
    uploaded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Full-text search vector (auto-maintained by trigger below)
    search_vector     TSVECTOR,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 8. UPLOAD REQUESTS  (crowdsource submissions — always start as 'pending')
CREATE TABLE upload_requests (
    id                SERIAL PRIMARY KEY,
    subject_id        INTEGER      NOT NULL REFERENCES subjects(id),
    module_id         INTEGER      REFERENCES modules(id),
    material_type_id  INTEGER      NOT NULL REFERENCES material_types(id),

    title             VARCHAR(300) NOT NULL,
    description       TEXT,

    -- Temporary storage (moved to permanent on approval)
    temp_file_url     VARCHAR(1000),
    temp_file_key     VARCHAR(500),
    file_name         VARCHAR(255) NOT NULL,

    -- Submitter info (anonymous allowed)
    submitter_name    VARCHAR(200),
    submitter_email   VARCHAR(255) NOT NULL,

    -- Workflow
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason  TEXT,
    reviewed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    document_id       INTEGER REFERENCES documents(id) ON DELETE SET NULL, -- set on approval

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ
);


-- ========================================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================================

-- Semesters
CREATE INDEX idx_semesters_degree_id ON semesters(degree_id);

-- Subjects
CREATE INDEX idx_subjects_semester_id ON subjects(semester_id);
CREATE INDEX idx_subjects_name_trgm   ON subjects USING GIN (name gin_trgm_ops);
CREATE INDEX idx_subjects_code_trgm   ON subjects USING GIN (code gin_trgm_ops);

-- Modules
CREATE INDEX idx_modules_subject_id ON modules(subject_id);

-- Documents — most query-critical
CREATE INDEX idx_docs_subject_id        ON documents(subject_id);
CREATE INDEX idx_docs_module_id         ON documents(module_id);
CREATE INDEX idx_docs_material_type     ON documents(material_type_id);
CREATE INDEX idx_docs_subject_type      ON documents(subject_id, material_type_id);   -- cascade filter
CREATE INDEX idx_docs_module_type       ON documents(module_id, material_type_id);
CREATE INDEX idx_docs_status            ON documents(upload_status);
CREATE INDEX idx_docs_search_vector     ON documents USING GIN (search_vector);        -- full-text
CREATE INDEX idx_docs_title_trgm        ON documents USING GIN (title gin_trgm_ops);   -- fuzzy title

-- Upload requests
CREATE INDEX idx_upload_requests_status ON upload_requests(status);
CREATE INDEX idx_upload_requests_email  ON upload_requests(submitter_email);


-- ========================================================================
-- TRIGGERS
-- ========================================================================

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_degrees_updated_at
    BEFORE UPDATE ON degrees
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- Maintain search_vector on INSERT/UPDATE for full-text document search
CREATE OR REPLACE FUNCTION fn_update_document_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')),       'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_search_vector
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION fn_update_document_search_vector();


-- ========================================================================
-- SEED DATA  (MVP — Semester 1 & 2)
-- ========================================================================

INSERT INTO degrees (name, code) VALUES
    ('Bachelor of Technology — Computer Science & Engineering', 'BTCSE'),
    ('Bachelor of Technology — Electronics & Communication',    'BTECE'),
    ('Bachelor of Technology — Mechanical Engineering',         'BTME');

-- Semesters for BTCSE (id = 1)
INSERT INTO semesters (degree_id, number, academic_year) VALUES
    (1, 1, '2024-2025'),
    (1, 2, '2024-2025');

-- Semester 1 subjects
INSERT INTO subjects (semester_id, name, code, short_name, credits) VALUES
    (1, 'Programming for Problem Solving',  'CS101', 'PPS',    4),
    (1, 'Mathematics I',                    'MA101', 'MATH-I', 4),
    (1, 'Engineering Physics',              'PH101', 'PHY',    3),
    (1, 'Engineering Drawing',              'ME101', 'ED',     2);

-- Semester 2 subjects
INSERT INTO subjects (semester_id, name, code, short_name, credits) VALUES
    (2, 'Basic Electrical Engineering',    'EE101', 'BEE',     4),
    (2, 'Mathematics II',                  'MA102', 'MATH-II', 4),
    (2, 'Engineering Mechanics',           'ME102', 'EM',      4),
    (2, 'Data Structures',                 'CS102', 'DS',      4);

-- Modules for PPS (subject id = 1)
INSERT INTO modules (subject_id, number, title) VALUES
    (1, 1, 'Introduction to C & Problem Solving Fundamentals'),
    (1, 2, 'Control Flow: Conditions and Loops'),
    (1, 3, 'Functions, Recursion & Storage Classes'),
    (1, 4, 'Arrays and Strings'),
    (1, 5, 'Pointers and Dynamic Memory Management'),
    (1, 6, 'Structures, Unions & File I/O');

-- Modules for Engineering Mechanics (subject id = 7)
INSERT INTO modules (subject_id, number, title) VALUES
    (7, 1, 'Statics: Force Systems and Equilibrium'),
    (7, 2, 'Friction and its Applications'),
    (7, 3, 'Centroid and Moment of Inertia'),
    (7, 4, 'Dynamics: Kinematics of a Particle'),
    (7, 5, 'Kinetics: Newton''s Second Law & Work-Energy');

-- Default admin user (change password immediately in production)
INSERT INTO users (email, name, role) VALUES
    ('admin@portal.edu', 'Portal Administrator', 'admin');
