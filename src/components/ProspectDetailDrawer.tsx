"use client";

import React from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  MapPin,
  MessageSquare,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CommenterProfile, LookalikeProfile } from "@/types/discovery";

type DetailTarget =
  | { kind: "commenter"; profile: CommenterProfile }
  | { kind: "lookalike"; profile: LookalikeProfile }
  | null;

export function ProspectDetailDrawer({
  target,
  onClose,
  darkMode,
}: {
  target: DetailTarget;
  onClose: () => void;
  darkMode: boolean;
}) {
  if (!target) return null;
  const { kind, profile } = target;

  const breakdown =
    kind === "commenter"
      ? [
          {
            label: "Semantic Similarity",
            desc: "Vector alignment with EDXSO K-12 outreach profile",
            value: profile.scoreBreakdown.semanticSimilarity,
          },
          {
            label: "School Ecosystem Fit",
            desc: "Multi-school, CBSE/ICSE/IB, and governance signals",
            value: profile.scoreBreakdown.ecosystemFit,
          },
          {
            label: "Decision-Maker Proximity",
            desc: "Direct authority or trusted advisor to school owners",
            value: profile.scoreBreakdown.decisionMakerProximity,
          },
          {
            label: "Engagement Depth",
            desc: "Comment substance and cross-post participation",
            value: profile.scoreBreakdown.engagementDepth,
          },
        ]
      : [
          {
            label: "Semantic Similarity",
            desc: "Vector alignment with EDXSO K-12 outreach profile",
            value: profile.scoreBreakdown.semanticSimilarity,
          },
          {
            label: "School Ecosystem Fit",
            desc: "Multi-school, CBSE/ICSE/IB, and governance signals",
            value: profile.scoreBreakdown.ecosystemFit,
          },
          {
            label: "Decision-Maker Proximity",
            desc: "Direct authority or trusted advisor to school owners",
            value: profile.scoreBreakdown.decisionMakerProximity,
          },
          {
            label: "Seed Profile Affinity",
            desc: "Similarity to top-scoring original commenters",
            value: profile.scoreBreakdown.seedAffinity,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div
        className={`h-full w-full max-w-2xl overflow-y-auto p-6 shadow-2xl transition ${
          darkMode
            ? "bg-slate-900 text-slate-100 border-l border-slate-800"
            : "bg-white text-slate-900 border-l border-slate-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/20 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {kind === "commenter" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
                  <UserCheck className="h-3.5 w-3.5" /> Original Commenter
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-500">
                  <Sparkles className="h-3.5 w-3.5" /> AI-Discovered Lookalike
                </span>
              )}
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-500">
                {profile.targetPersona}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold">{profile.name}</h2>
            <p className="text-sm opacity-80">{profile.headline}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs opacity-70">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {profile.currentRole} · {profile.organisation}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            </div>
            <a
              href={profile.linkedinProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline break-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {profile.linkedinProfileUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-500/10"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score Gauge + Breakdown (HireAI style) */}
        <div
          className={`mt-5 rounded-xl border p-5 ${
            darkMode
              ? "border-slate-800 bg-slate-800/50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center shrink-0">
              <ScoreGauge
                score={profile.relevanceScore}
                label="EDXSO Fit"
                size={96}
              />
              {kind === "lookalike" && (
                <span className="mt-2 text-xs font-semibold text-purple-500">
                  {profile.similarityScore}% Seed Match
                </span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{b.label}</span>
                    <span className="font-bold">{b.value}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-300/40">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-65">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why This Prospect Matches */}
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold">AI Profile Analysis</h3>
          <p
            className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
              darkMode
                ? "border-slate-800 bg-slate-800/40"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            {profile.aiExplanation}
          </p>
        </div>

        {/* School Ecosystem Indicators & Skills */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70">
              School-Ecosystem Indicators
            </h4>
            <ul className="mt-2 space-y-1.5">
              {profile.schoolEcosystemIndicators.map((sig, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{sig}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Skills &amp; Domain Keywords
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.skills.map((sk) => (
                <span
                  key={sk}
                  className={`rounded-md px-2 py-1 text-xs ${
                    darkMode
                      ? "bg-slate-800 text-slate-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Traceability */}
        <div className="mt-6 border-t border-slate-200/20 pt-4">
          {kind === "commenter" ? (
            <div className="space-y-2">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Source Post Engagement Traceability ({profile.commentedPosts.length})
              </h3>
              {profile.commentedPosts.map((cp, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-xs ${
                    darkMode
                      ? "border-slate-800 bg-slate-800/40"
                      : "border-blue-100 bg-blue-50/50"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <a
                      href={cp.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-500 hover:underline truncate"
                    >
                      {cp.postUrl}
                    </a>
                    <span className="opacity-60 shrink-0">{cp.commentDate}</span>
                  </div>
                  <p className="mt-1.5 italic opacity-85">
                    &ldquo;{cp.commentText}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <GitBranch className="h-4 w-4 text-purple-500" />
                Seed Profile Match Evidence ({profile.matchedSeeds.length})
              </h3>
              {profile.matchedSeeds.map((seed, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-xs ${
                    darkMode
                      ? "border-slate-800 bg-slate-800/40"
                      : "border-purple-100 bg-purple-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <a
                      href={seed.seedLinkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-purple-500 hover:underline"
                    >
                      {seed.seedCommenterName}
                    </a>
                    <span className="rounded bg-purple-500/15 px-2 py-0.5 font-semibold text-purple-500">
                      {seed.similarityScore}% match (cos {seed.semanticCosine})
                    </span>
                  </div>
                  <p className="mt-1 opacity-80">{seed.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

