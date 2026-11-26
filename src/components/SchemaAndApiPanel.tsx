"use client";

import React from "react";
import { Code2, Database, Server } from "lucide-react";

const SCHEMA_SQL_SNIPPET = `CREATE TABLE discovery_runs (
  id UUID PRIMARY KEY,
  input_mode VARCHAR(16) CHECK (input_mode IN ('keyword','post_url')),
  data_source VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE TABLE prospect_profiles (
  id UUID PRIMARY KEY,
  linkedin_profile_url_norm TEXT UNIQUE NOT NULL, -- Deduplication key
  full_name VARCHAR(255) NOT NULL,
  target_persona VARCHAR(128) NOT NULL,
  profile_embedding VECTOR(768) -- pgvector cosine index
);

CREATE TABLE post_engagements (
  run_id UUID REFERENCES discovery_runs(id),
  post_id UUID REFERENCES discovered_posts(id),
  profile_id UUID REFERENCES prospect_profiles(id),
  relevance_score SMALLINT,
  UNIQUE (run_id, post_id, profile_id)
);

CREATE TABLE lookalike_matches (
  run_id UUID REFERENCES discovery_runs(id),
  candidate_profile_id UUID REFERENCES prospect_profiles(id),
  seed_profile_id UUID REFERENCES prospect_profiles(id),
  similarity_score SMALLINT,
  semantic_cosine NUMERIC(5,4)
);`;

export function SchemaAndApiPanel({ darkMode }: { darkMode: boolean }) {
  const cardCls = darkMode
    ? "border-slate-800 bg-slate-900 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";
  const codeCls = darkMode
    ? "bg-slate-950 text-indigo-300 border-slate-800"
    : "bg-slate-900 text-indigo-200 border-slate-800";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`rounded-xl border p-5 shadow-sm ${cardCls}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Server className="h-4 w-4 text-indigo-500" />
          REST API Endpoints
        </div>
        <div className="mt-3 space-y-3 text-xs">
          <div className="rounded-lg border border-slate-200/20 p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono font-bold text-emerald-500">
                POST
              </span>
              <code className="font-mono font-semibold">/api/discover</code>
            </div>
            <p className="mt-1.5 opacity-75">
              Runs the 6-stage pipeline for <code>mode: &quot;keyword&quot;</code> or{" "}
              <code>mode: &quot;post_url&quot;</code> (with optional{" "}
              <code>userSuppliedComments</code>).
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/20 p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/15 px-2 py-0.5 font-mono font-bold text-blue-500">
                GET
              </span>
              <code className="font-mono font-semibold">/api/discover?query=K12+B2B+Sales</code>
            </div>
            <p className="mt-1.5 opacity-75">
              Convenience GET endpoint returning JSON results for keyword or postUrl.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/20 p-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/15 px-2 py-0.5 font-mono font-bold text-blue-500">
                GET
              </span>
              <code className="font-mono font-semibold">/api/health</code>
            </div>
            <p className="mt-1.5 opacity-75">
              Returns service health, active AI embedding model, and timestamp.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/20 p-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-purple-500" />
              <code className="font-mono font-semibold">
                npm run cli -- --query &quot;K12 B2B Sales&quot; --format csv
              </code>
            </div>
            <p className="mt-1.5 opacity-75">
              CLI parity supporting keyword, post URL, CSV, and JSON export.
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-5 shadow-sm ${cardCls}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-emerald-500" />
          PostgreSQL + pgvector Schema (<code>db/schema.sql</code>)
        </div>
        <pre
          className={`mt-3 overflow-x-auto rounded-xl border p-3.5 font-mono text-[11px] leading-relaxed ${codeCls}`}
        >
          {SCHEMA_SQL_SNIPPET}
        </pre>
      </div>
    </div>
  );
}

