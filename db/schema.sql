-- EDXSO ProspectLens — Production Database Schema (PostgreSQL + pgvector)
-- Designed for strict provenance, cross-post deduplication, and PII minimization.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Discovery Runs (Audit & Input Tracking)
CREATE TABLE discovery_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_code VARCHAR(32) UNIQUE NOT NULL,
    input_mode VARCHAR(16) NOT NULL CHECK (input_mode IN ('keyword', 'post_url')),
    search_query TEXT,
    supplied_post_url TEXT,
    data_source VARCHAR(32) NOT NULL CHECK (
        data_source IN ('curated_test_dataset', 'user_supplied_data', 'compliant_api_provider')
    ),
    ai_engine_mode VARCHAR(64) NOT NULL,
    embedding_model VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days') -- Data retention policy
);

-- 2. Discovered LinkedIn Posts
CREATE TABLE discovered_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
    post_url TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_headline TEXT,
    author_profile_url TEXT,
    published_date DATE,
    content_snippet TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    data_source VARCHAR(32) NOT NULL,
    UNIQUE (run_id, post_url)
);

-- 3. Deduplicated Prospect Profiles (Normalized by LinkedIn URL)
CREATE TABLE prospect_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_profile_url_norm TEXT UNIQUE NOT NULL, -- lowercased, stripped trailing slash & query
    linkedin_profile_url TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    headline TEXT,
    current_role VARCHAR(255),
    organisation VARCHAR(255),
    location VARCHAR(255),
    industry VARCHAR(255),
    skills TEXT[] DEFAULT '{}',
    school_ecosystem_indicators TEXT[] DEFAULT '{}',
    target_persona VARCHAR(128) NOT NULL,
    profile_embedding VECTOR(768), -- Supports text-embedding-004 / text-embedding-3-small
    is_test_fixture BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Post Engagements (Links Original Commenters <-> Discovered Posts)
CREATE TABLE post_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES discovered_posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES prospect_profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_date DATE,
    relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
    score_breakdown JSONB NOT NULL,
    ai_explanation TEXT NOT NULL,
    UNIQUE (run_id, post_id, profile_id)
);

-- 5. AI-Discovered Lookalike Matches (Strictly separated from post_engagements)
CREATE TABLE lookalike_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
    candidate_profile_id UUID NOT NULL REFERENCES prospect_profiles(id) ON DELETE CASCADE,
    seed_profile_id UUID NOT NULL REFERENCES prospect_profiles(id) ON DELETE CASCADE,
    similarity_score SMALLINT NOT NULL CHECK (similarity_score BETWEEN 0 AND 100),
    semantic_cosine NUMERIC(5, 4) NOT NULL,
    relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
    shared_attributes JSONB NOT NULL,
    rationale TEXT NOT NULL,
    CONSTRAINT chk_distinct_seed_candidate CHECK (candidate_profile_id <> seed_profile_id),
    UNIQUE (run_id, candidate_profile_id, seed_profile_id)
);

-- Indexes for fast vector similarity and outreach filtering
CREATE INDEX idx_profiles_embedding ON prospect_profiles USING ivfflat (profile_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_engagements_run_score ON post_engagements (run_id, relevance_score DESC);
CREATE INDEX idx_lookalikes_run_score ON lookalike_matches (run_id, relevance_score DESC);

