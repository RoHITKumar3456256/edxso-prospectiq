"use client";

import React, { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { CommenterProfile, LookalikeProfile } from "@/types/discovery";

type ProspectCardProps =
  | { kind: "commenter"; rank: number; profile: CommenterProfile }
  | { kind: "lookalike"; rank: number; profile: LookalikeProfile };

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-indigo-500";
  return "bg-slate-400";
}

export function ProspectCard(props: ProspectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { kind, rank, profile } = props;

  const breakdownItems =
    kind === "commenter"
      ? [
          { label: "Semantic Similarity", value: profile.scoreBreakdown.semanticSimilarity },
          { label: "School Ecosystem Fit", value: profile.scoreBreakdown.ecosystemFit },
          { label: "Decision-Maker Proximity", value: profile.scoreBreakdown.decisionMakerProximity },
          { label: "Engagement Depth", value: profile.scoreBreakdown.engagementDepth },
        ]
      : [
          { label: "Semantic Similarity", value: profile.scoreBreakdown.semanticSimilarity },
          { label: "School Ecosystem Fit", value: profile.scoreBreakdown.ecosystemFit },
          { label: "Decision-Maker Proximity", value: profile.scoreBreakdown.decisionMakerProximity },
          { label: "Seed Profile Affinity", value: profile.scoreBreakdown.seedAffinity },
        ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {rank}
            </span>
            <h3 className="text-base font-semibold text-slate-900">
              {profile.name}
            </h3>
            {kind === "commenter" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                <UserCheck className="h-3 w-3" />
                Original Commenter
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
                <Sparkles className="h-3 w-3" />
                AI Lookalike ({profile.similarityScore}% Seed Match)
              </span>
            )}
            {profile.provenance.isTestFixture && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                Test Fixture
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-slate-700">{profile.headline}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {profile.currentRole} · {profile.organisation}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {profile.location}
            </span>
          </div>

          <div className="pt-1">
            <a
              href={profile.linkedinProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline break-all"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {profile.linkedinProfileUrl}
            </a>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <div
            className={`flex flex-col items-center rounded-lg border px-3 py-1.5 ${scoreColor(
              profile.relevanceScore
            )}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Relevance
            </span>
            <span className="text-xl font-bold leading-tight">
              {profile.relevanceScore}
              <span className="text-xs font-normal opacity-75">/100</span>
            </span>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {profile.targetPersona}
          </span>
        </div>
      </div>

      {/* School Ecosystem Indicators */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.schoolEcosystemIndicators.map((sig, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50/70 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/70"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            {sig}
          </span>
        ))}
      </div>

      {/* AI Explanation */}
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
        <span className="font-semibold text-slate-900">AI Analysis: </span>
        {profile.aiExplanation}
      </p>

      {/* Traceability Preview */}
      {kind === "commenter" && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Source Engagement Traceability ({profile.commentedPosts.length} post
              {profile.commentedPosts.length > 1 ? "s" : ""}
              {profile.provenance.deduplicatedFromCount > 1
                ? ` · Deduplicated across ${profile.provenance.deduplicatedFromCount} comments`
                : ""}
              )
            </span>
          </div>
          {profile.commentedPosts.map((cp, idx) => (
            <div
              key={idx}
              className="rounded-md border border-blue-100 bg-blue-50/40 p-2 text-xs text-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={cp.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-700 hover:underline truncate max-w-md"
                >
                  {cp.postUrl}
                </a>
                <span className="text-[11px] text-slate-500">{cp.commentDate}</span>
              </div>
              <p className="mt-1 italic text-slate-600">&ldquo;{cp.commentText}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {kind === "lookalike" && (
        <div className="mt-3 space-y-1.5">
          <div className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5 text-purple-600" />
            Seed Profile Traceability ({profile.matchedSeeds.length} matched seed
            {profile.matchedSeeds.length > 1 ? "s" : ""})
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.matchedSeeds.slice(0, 2).map((seed, idx) => (
              <div
                key={idx}
                className="rounded-md border border-purple-100 bg-purple-50/40 p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-purple-900">
                    {seed.seedCommenterName}
                  </span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-semibold text-purple-800">
                    {seed.similarityScore}% match
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{seed.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Score Breakdown */}
      <div className="mt-3 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Hide Score Breakdown & Skills
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> View Score Breakdown & Skills
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {breakdownItems.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-800">
                      {item.value}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${barColor(item.value)}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

