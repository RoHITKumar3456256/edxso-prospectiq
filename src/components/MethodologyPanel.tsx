"use client";

import React from "react";
import { Cpu, Database, Lock, Scale } from "lucide-react";
import { DiscoveryResponse } from "@/types/discovery";

export function MethodologyPanel({ result }: { result: DiscoveryResponse }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Cpu className="h-4 w-4 text-indigo-600" />
          AI Semantic Similarity & Ranking Methodology
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Active Engine: <span className="font-semibold text-slate-900">{result.aiEngine.mode}</span>{" "}
          (<code className="rounded bg-slate-100 px-1 py-0.5">{result.aiEngine.embeddingModel}</code>)
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
          <p className="font-semibold text-slate-900">Scoring Formula</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed">
            {result.aiEngine.scoringFormula}
          </p>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc pl-4">
          <li>
            <strong>Semantic Vectorization:</strong> Encodes profile headline, role, skills, school-ecosystem signals, and comment context into normalized vectors (OpenAI/Gemini embeddings when configured, or domain-ontology weighted TF-IDF fallback).
          </li>
          <li>
            <strong>Lookalike Seed Matching:</strong> Top-scoring commenters act as seeds. Candidates are scored via pairwise cosine similarity (55%) + structured role/skill/network overlap (45%).
          </li>
          <li>
            <strong>Strict Separation:</strong> Original commenters are deduplicated by normalized LinkedIn URL and excluded from the lookalike pool so no commenter is mislabelled.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Scale className="h-4 w-4 text-emerald-600" />
          Data Compliance & Path to Production
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          LinkedIn does not provide a public API for unrestricted phrase-based post search or comment retrieval. This application strictly avoids unauthorised scraping, CAPTCHA bypassing, or credential spoofing.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600 list-disc pl-4">
          <li>
            <strong>Demo / Evaluation Mode:</strong> Uses a clearly labelled Curated Test Dataset (<code className="rounded bg-slate-100 px-1">curated_test_dataset</code>) with <code className="rounded bg-slate-100 px-1">demo-</code> URLs.
          </li>
          <li>
            <strong>BYO-Data / Supplied URL Mode:</strong> Users can supply any LinkedIn post URL and import exported comment records (JSON) for immediate compliant AI analysis.
          </li>
          <li>
            <strong>Production Path:</strong> Integrate LinkedIn Marketing/Community Management APIs (with OAuth partner approval) or licensed B2B data providers (e.g., Proxycurl, Coresignal, Tavily).
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Lock className="h-4 w-4 text-amber-600" />
          Privacy, Data Minimization & Retention
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Data Minimization</span>
            Stores and exports only outreach-relevant professional fields (name, LinkedIn URL, role, org, location, public comment context).
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Zero Persistent PII Storage</span>
            Pipeline runs statelessly in memory; exported CSV/JSON files are generated client-side or via explicit CLI output.
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <span className="font-semibold text-slate-900 block mb-1">Outreach Consent</span>
            Prospects discovered should be contacted via legitimate B2B LinkedIn InMail or opt-in channels in accordance with applicable data protection laws.
          </div>
        </div>
      </div>
    </div>
  );
}

