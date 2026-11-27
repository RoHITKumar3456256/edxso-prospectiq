"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  Download,
  ExternalLink,
  Filter,
  GitBranch,
  Layers,
  LayoutDashboard,
  Link2,
  Loader2,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { ExportDrawer } from "@/components/ExportDrawer";
import { FilterModal, ProspectFilters } from "@/components/FilterModal";
import { MethodologyPanel } from "@/components/MethodologyPanel";
import { ProspectCard } from "@/components/ProspectCard";
import { ProspectDetailDrawer } from "@/components/ProspectDetailDrawer";
import { SchemaAndApiPanel } from "@/components/SchemaAndApiPanel";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  CommenterProfile,
  DiscoveryResponse,
  InputMode,
  LookalikeProfile,
} from "@/types/discovery";

const SAMPLE_BYO_COMMENTS = JSON.stringify(
  [
    {
      commenterName: "Arundhati Menon (User-Supplied)",
      linkedinProfileUrl: "https://www.linkedin.com/in/arundhati-menon-k12",
      currentRole: "Former Principal & School Accreditation Advisor",
      organisation: "EduTrust Advisory",
      location: "Bengaluru, India",
      headline: "Advising 18 CBSE & ICSE Schools on NEP 2020 and EdTech Adoption",
      commentText:
        "Great insights! Principals in our school network always look for peer-validated solutions before committing.",
    },
    {
      commenterName: "Vikramaditya Joshi (User-Supplied)",
      linkedinProfileUrl: "https://www.linkedin.com/in/vikramaditya-joshi-trustee",
      currentRole: "Managing Trustee",
      organisation: "Joshi Vidya Mandir Trust (5 Campuses)",
      location: "Pune, India",
      headline: "School Owner & Trustee | K-12 Multi-Campus Governance",
      commentText:
        "Alignment with school trustees and academic directors is key for any B2B K12 partnership.",
    },
  ],
  null,
  2
);

type NavSection =
  | "overview"
  | "commenters"
  | "lookalikes"
  | "schema"
  | "methodology";

function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [mode, setMode] = useState<InputMode>("keyword");
  const [query, setQuery] = useState("K12 B2B Sales");
  const [postUrl, setPostUrl] = useState(
    "https://www.linkedin.com/posts/demo-rohit-mehta-edtech_k12-b2b-sales-school-procurement-01"
  );
  const [showByoInput, setShowByoInput] = useState(false);
  const [byoCommentsText, setByoCommentsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);

  // Interactive "Intersected" Traceability State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ProspectFilters>({
    persona: "ALL",
    location: "",
    skillKeyword: "",
    minScore: 0,
  });

  const [detailTarget, setDetailTarget] = useState<
    | { kind: "commenter"; profile: CommenterProfile }
    | { kind: "lookalike"; profile: LookalikeProfile }
    | null
  >(null);

  async function runDiscovery(override?: {
    mode?: InputMode;
    query?: string;
    postUrl?: string;
    byoText?: string;
  }) {
    const activeMode = override?.mode ?? mode;
    const activeQuery = override?.query ?? query;
    const activeUrl = override?.postUrl ?? postUrl;
    const activeByo = override?.byoText ?? byoCommentsText;

    setLoading(true);
    setError(null);
    setSelectedPostId(null);
    setSelectedSeedId(null);

    try {
      let parsedComments = undefined;
      if (activeMode === "post_url" && activeByo.trim()) {
        try {
          parsedComments = JSON.parse(activeByo);
        } catch {
          throw new Error(
            "Invalid JSON in Imported Comments field. Please provide a valid JSON array."
          );
        }
      }

      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          query: activeMode === "keyword" ? activeQuery : undefined,
          postUrl: activeMode === "post_url" ? activeUrl : undefined,
          userSuppliedComments: parsedComments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute discovery pipeline.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runDiscovery({ mode: "keyword", query: "K12 B2B Sales" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchesFilters = (p: CommenterProfile | LookalikeProfile) => {
    if (p.relevanceScore < filters.minScore) return false;
    if (filters.persona !== "ALL" && p.targetPersona !== filters.persona)
      return false;
    if (
      filters.location.trim() &&
      !p.location.toLowerCase().includes(filters.location.toLowerCase())
    )
      return false;
    if (filters.skillKeyword.trim()) {
      const kw = filters.skillKeyword.toLowerCase();
      const hay = `${p.headline} ${p.currentRole} ${p.skills.join(" ")}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  };

  const filteredCommenters = useMemo(() => {
    if (!result) return [];
    return result.commenters.filter((c) => {
      if (!matchesFilters(c)) return false;
      if (
        selectedPostId &&
        !c.commentedPosts.some((cp) => cp.postId === selectedPostId)
      ) {
        return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, filters, selectedPostId]);

  const filteredLookalikes = useMemo(() => {
    if (!result) return [];
    return result.lookalikes.filter((l) => {
      if (!matchesFilters(l)) return false;
      if (
        selectedSeedId &&
        !l.matchedSeeds.some((ms) => ms.seedCommenterId === selectedSeedId)
      ) {
        return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, filters, selectedSeedId]);

  const allPersonas = useMemo(() => {
    if (!result) return [];
    const set = new Set<string>();
    result.commenters.forEach((c) => set.add(c.targetPersona));
    result.lookalikes.forEach((l) => set.add(l.targetPersona));
    return Array.from(set);
  }, [result]);

  const selectedPostObj = useMemo(
    () => result?.posts.find((p) => p.id === selectedPostId) || null,
    [result, selectedPostId]
  );

  const selectedSeedObj = useMemo(
    () => result?.commenters.find((c) => c.id === selectedSeedId) || null,
    [result, selectedSeedId]
  );

  const shellBg = darkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-[#F4F7FC] text-slate-900";
  const railBg = darkMode
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-slate-200/80";
  const cardBg = darkMode
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : "bg-white border-slate-200/80 text-slate-900";

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "commenters",
      label: "Commenters",
      icon: <Users className="h-4 w-4" />,
      badge: filteredCommenters.length,
    },
    {
      id: "lookalikes",
      label: "Lookalikes",
      icon: <Sparkles className="h-4 w-4" />,
      badge: filteredLookalikes.length,
    },
    {
      id: "schema",
      label: "Schema & API",
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: "methodology",
      label: "Compliance",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <div className={`flex min-h-screen ${shellBg}`}>
      {/* Slim Waalaxy-style Left Navigation Rail */}
      <aside
        className={`hidden w-20 xl:w-56 shrink-0 flex-col justify-between border-r p-3 lg:flex ${railBg}`}
      >
        <div>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 font-extrabold text-white shadow-md shadow-blue-500/20">
              E
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-bold tracking-tight">EDXSO</p>
              <p className="text-[11px] font-medium text-blue-600">
                ProspectIQ
              </p>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  title={item.label}
                  className={`flex w-full items-center justify-center xl:justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "opacity-70 hover:bg-blue-500/10 hover:opacity-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    <span className="hidden xl:inline">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`hidden xl:inline rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-slate-500/15"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden xl:block space-y-2 border-t border-slate-200/30 pt-4 text-xs">
          <div
            className={`rounded-2xl p-3 ${
              darkMode ? "bg-slate-800/70" : "bg-[#EEF4FF]"
            }`}
          >
            <p className="text-[11px] font-bold text-blue-600">
              AI Semantic Engine
            </p>
            <p className="mt-0.5 text-[11px] opacity-75 truncate">
              {result?.aiEngine.embeddingModel || "hybrid-ontology-v1"}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Floating Pill Top Header (Waalaxy style) */}
        <header className="sticky top-0 z-20 px-4 pt-3 sm:px-6">
          <div
            className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 shadow-sm backdrop-blur ${
              darkMode
                ? "border-slate-800 bg-slate-900/90"
                : "border-slate-200/80 bg-white/95"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold lg:hidden">EDXSO ProspectIQ</span>
              <div className="flex gap-1 lg:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      activeNav === item.id
                        ? "bg-blue-600 text-white"
                        : "opacity-70"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {result && (
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    darkMode
                      ? "bg-slate-800 text-blue-400"
                      : "bg-[#EEF4FF] text-blue-700"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  {result.dataSource === "curated_test_dataset"
                    ? "Curated Test Dataset"
                    : result.dataSource === "user_supplied_data"
                    ? "User-Supplied Data"
                    : "Compliant API"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                Filters
              </button>
              <button
                type="button"
                disabled={!result}
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV / JSON
              </button>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Toggle theme"
                className={`rounded-xl border p-1.5 transition ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-amber-400"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
          {/* Greeting + Waalaxy Pastel KPI Hero Row */}
          {result && activeNav === "overview" && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    EDXSO K-12 Prospect Discovery
                  </h1>
                  <p className="text-xs opacity-65">
                    Click any post or commenter below to interactively trace connected prospects across stages.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  6-Stage Pipeline Ready ({result.runId})
                </div>
              </div>

              {/* 3 Pastel Hero Cards (Waalaxy Layout) */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Sky Blue Card: Original Commenters */}
                <div
                  onClick={() => setActiveNav("commenters")}
                  className={`cursor-pointer rounded-2xl border p-5 transition hover:shadow-md ${
                    darkMode
                      ? "border-blue-500/30 bg-blue-950/30"
                      : "border-blue-100 bg-[#EBF3FF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          in
                        </span>
                        Original Commenters
                      </span>
                      <p className="mt-3 text-4xl font-extrabold tracking-tight">
                        {result.stats.uniqueCommenters}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {result.stats.duplicatesRemoved} duplicates merged
                      </p>
                    </div>
                    <ScoreGauge
                      score={result.stats.avgCommenterRelevance}
                      label="Avg Fit"
                      size={88}
                    />
                  </div>
                </div>

                {/* Soft Lavender Card: AI Lookalikes */}
                <div
                  onClick={() => setActiveNav("lookalikes")}
                  className={`cursor-pointer rounded-2xl border p-5 transition hover:shadow-md ${
                    darkMode
                      ? "border-purple-500/30 bg-purple-950/30"
                      : "border-purple-100 bg-[#EFEAFF]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Lookalikes
                      </span>
                      <p className="mt-3 text-4xl font-extrabold tracking-tight">
                        {result.stats.lookalikesDiscovered}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        Strictly separated from seeds
                      </p>
                    </div>
                    <ScoreGauge
                      score={result.stats.avgLookalikeRelevance}
                      label="Avg Fit"
                      size={88}
                    />
                  </div>
                </div>

                {/* Crisp Summary Card: Pipeline & Posts */}
                <div className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                      Pipeline Telemetry
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600">
                      {result.input.mode === "keyword" ? "Keyword" : "Post URL"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-500/5 p-2.5">
                      <p className="text-xl font-bold">
                        {result.stats.postsDiscovered}
                      </p>
                      <p className="text-[10px] opacity-65">Posts</p>
                    </div>
                    <div className="rounded-xl bg-slate-500/5 p-2.5">
                      <p className="text-xl font-bold">
                        {result.stats.rawCommentsExtracted}
                      </p>
                      <p className="text-[10px] opacity-65">Comments</p>
                    </div>
                    <div className="rounded-xl bg-slate-500/5 p-2.5">
                      <p className="text-xl font-bold">
                        {result.stages.length}
                      </p>
                      <p className="text-[10px] opacity-65">Stages</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Search Input Bar */}
          {(activeNav === "overview" ||
            activeNav === "commenters" ||
            activeNav === "lookalikes") && (
            <section className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runDiscovery();
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div
                  className={`inline-flex shrink-0 rounded-xl border p-1 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800"
                      : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMode("keyword")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mode === "keyword"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Keyword
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("post_url")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      mode === "post_url"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Post URL
                  </button>
                </div>

                {mode === "keyword" ? (
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='e.g. "K12 B2B Sales"'
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  />
                ) : (
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/posts/..."
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm focus:border-blue-500 focus:outline-none ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900"
                    }`}
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run Discovery
                    </>
                  )}
                </button>
              </form>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-55">Quick presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("keyword");
                    setQuery("K12 B2B Sales");
                    runDiscovery({ mode: "keyword", query: "K12 B2B Sales" });
                  }}
                  className="rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-600 hover:bg-blue-500/20"
                >
                  &ldquo;K12 B2B Sales&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const demoUrl =
                      "https://www.linkedin.com/posts/demo-rohit-mehta-edtech_k12-b2b-sales-school-procurement-01";
                    setMode("post_url");
                    setPostUrl(demoUrl);
                    setByoCommentsText("");
                    runDiscovery({
                      mode: "post_url",
                      postUrl: demoUrl,
                      byoText: "",
                    });
                  }}
                  className="rounded-full bg-slate-500/10 px-2.5 py-1 font-medium hover:bg-slate-500/20"
                >
                  Direct Post URL
                </button>
                {mode === "post_url" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowByoInput(!showByoInput);
                      if (!byoCommentsText)
                        setByoCommentsText(SAMPLE_BYO_COMMENTS);
                    }}
                    className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 hover:bg-emerald-500/20"
                  >
                    {showByoInput ? "Hide" : "+ Attach"} User-Exported Comments
                  </button>
                )}
              </div>

              {mode === "post_url" && showByoInput && (
                <textarea
                  rows={5}
                  value={byoCommentsText}
                  onChange={(e) => setByoCommentsText(e.target.value)}
                  className={`mt-3 w-full rounded-xl border p-3 font-mono text-xs ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-200"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  {error}
                </div>
              )}
            </section>
          )}

          {/* Active Intersected Traceability Banner */}
          {(selectedPostObj || selectedSeedObj) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <GitBranch className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">
                  Interactive Traceability Active:
                </span>
                {selectedPostObj && (
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 font-medium text-white">
                    Post by {selectedPostObj.authorName}
                  </span>
                )}
                {selectedSeedObj && (
                  <span className="rounded-full bg-purple-600 px-2.5 py-0.5 font-medium text-white">
                    Seed: {selectedSeedObj.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPostId(null);
                  setSelectedSeedId(null);
                }}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Trace
              </button>
            </div>
          )}

          {result && activeNav === "overview" && (
            <>
              {/* Compliance Notice */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <span className="font-semibold">Data Provenance: </span>
                  {result.complianceNotice}
                </div>
              </div>

              {/* Interactive Connected 3-Column Funnel: Posts -> Commenters -> Lookalikes */}
              <section className="grid gap-4 lg:grid-cols-3">
                {/* Column 1: Discovered Posts */}
                <div className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                      <Layers className="h-3.5 w-3.5 text-blue-600" />
                      1. Posts ({result.posts.length})
                    </h2>
                    <span className="text-[11px] opacity-55">Click to trace</span>
                  </div>
                  <div className="space-y-2.5">
                    {result.posts.map((post) => {
                      const active = selectedPostId === post.id;
                      return (
                        <div
                          key={post.id}
                          onClick={() =>
                            setSelectedPostId(active ? null : post.id)
                          }
                          className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                            active
                              ? "border-blue-600 bg-blue-500/10 ring-1 ring-blue-600"
                              : "border-slate-500/15 hover:border-blue-500/40"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="truncate">{post.authorName}</span>
                            <span className="text-[10px] opacity-60 shrink-0">
                              {post.publishedDate}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] opacity-75">
                            &ldquo;{post.snippet}&rdquo;
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Post URL
                            </a>
                            <span className="opacity-60">
                              {post.engagementSummary.commentsCount} comments
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Original Commenters */}
                <div className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      2. Commenters ({filteredCommenters.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNav("commenters")}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {filteredCommenters.slice(0, 6).map((c) => {
                      const active = selectedSeedId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() =>
                            setSelectedSeedId(active ? null : c.id)
                          }
                          className={`cursor-pointer rounded-xl border p-2.5 text-xs transition ${
                            active
                              ? "border-purple-600 bg-purple-500/10 ring-1 ring-purple-600"
                              : "border-slate-500/15 hover:border-blue-500/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/15 text-[11px] font-bold text-blue-600">
                                {initials(c.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{c.name}</p>
                                <p className="text-[11px] opacity-65 truncate">
                                  {c.currentRole}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                              {c.relevanceScore}%
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
                            <span>
                              {c.commentedPosts.length} post(s) · Click to trace seeds
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailTarget({ kind: "commenter", profile: c });
                              }}
                              className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              Inspect <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3: AI-Discovered Lookalikes */}
                <div className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      3. Lookalikes ({filteredLookalikes.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNav("lookalikes")}
                      className="text-[11px] font-semibold text-purple-600 hover:underline"
                    >
                      All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {filteredLookalikes.slice(0, 6).map((l) => (
                      <div
                        key={l.id}
                        onClick={() =>
                          setDetailTarget({ kind: "lookalike", profile: l })
                        }
                        className="cursor-pointer rounded-xl border border-slate-500/15 p-2.5 text-xs transition hover:border-purple-500/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600/15 text-[11px] font-bold text-purple-600">
                              {initials(l.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{l.name}</p>
                              <p className="text-[11px] opacity-65 truncate">
                                {l.currentRole}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-lg bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-600">
                            {l.relevanceScore}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
                          <span className="truncate">
                            Seed: {l.matchedSeeds[0]?.seedCommenterName} (
                            {l.similarityScore}%)
                          </span>
                          <span className="font-semibold text-purple-600 shrink-0">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {result && activeNav === "commenters" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  Original Commenters ({filteredCommenters.length})
                </h2>
              </div>
              {filteredCommenters.map((c, idx) => (
                <div key={c.id} className="space-y-1">
                  <ProspectCard kind="commenter" rank={idx + 1} profile={c} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailTarget({ kind: "commenter", profile: c })
                      }
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Inspect Semantic Match Drawer →
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {result && activeNav === "lookalikes" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  AI-Discovered Lookalike Profiles ({filteredLookalikes.length})
                </h2>
              </div>
              {filteredLookalikes.map((l, idx) => (
                <div key={l.id} className="space-y-1">
                  <ProspectCard kind="lookalike" rank={idx + 1} profile={l} />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailTarget({ kind: "lookalike", profile: l })
                      }
                      className="text-xs font-semibold text-purple-600 hover:underline"
                    >
                      Inspect Semantic Match Drawer →
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeNav === "schema" && <SchemaAndApiPanel darkMode={darkMode} />}

          {result && activeNav === "methodology" && (
            <MethodologyPanel result={result} />
          )}
        </main>
      </div>

      {/* Drawers & Modals */}
      <ProspectDetailDrawer
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        darkMode={darkMode}
      />
      <ExportDrawer
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        result={result}
        darkMode={darkMode}
      />
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        personas={allPersonas}
        darkMode={darkMode}
      />
    </div>
  );
}
