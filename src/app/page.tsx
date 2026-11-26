"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Code2,
  Database,
  Download,
  ExternalLink,
  Filter,
  Layers,
  LayoutDashboard,
  Link2,
  Loader2,
  Moon,
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

  const filteredCommenters = useMemo(
    () => (result ? result.commenters.filter(matchesFilters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, filters]
  );

  const filteredLookalikes = useMemo(
    () => (result ? result.lookalikes.filter(matchesFilters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, filters]
  );

  const allPersonas = useMemo(() => {
    if (!result) return [];
    const set = new Set<string>();
    result.commenters.forEach((c) => set.add(c.targetPersona));
    result.lookalikes.forEach((l) => set.add(l.targetPersona));
    return Array.from(set);
  }, [result]);

  const shellBg = darkMode
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";
  const sidebarBg = darkMode
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-slate-200";
  const cardBg = darkMode
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "Discovery Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "commenters",
      label: "Original Commenters",
      icon: <Users className="h-4 w-4" />,
      badge: filteredCommenters.length,
    },
    {
      id: "lookalikes",
      label: "AI Lookalikes",
      icon: <Sparkles className="h-4 w-4" />,
      badge: filteredLookalikes.length,
    },
    {
      id: "schema",
      label: "Schema & API Docs",
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      id: "methodology",
      label: "AI & Compliance",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <div className={`flex min-h-screen ${shellBg}`}>
      {/* Left SaaS Sidebar */}
      <aside
        className={`hidden w-64 shrink-0 flex-col justify-between border-r p-4 lg:flex ${sidebarBg}`}
      >
        <div>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm">
              E
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">EDXSO ProspectLens</p>
              <p className="text-[11px] opacity-60">K-12 AI Intelligence</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "opacity-75 hover:bg-slate-500/10 hover:opacity-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        active
                          ? "bg-white/20 text-white"
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

        <div className="space-y-3 border-t border-slate-200/20 pt-4 text-xs">
          {result && (
            <div className="rounded-xl bg-indigo-500/10 p-3">
              <p className="font-semibold text-indigo-500">Active AI Engine</p>
              <p className="mt-0.5 text-[11px] opacity-80 truncate">
                {result.aiEngine.embeddingModel}
              </p>
              <p className="mt-1 text-[10px] opacity-60">
                Source: {result.dataSource.replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Command Header */}
        <header
          className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-6 ${
            darkMode
              ? "border-slate-800 bg-slate-900/90"
              : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold lg:hidden">EDXSO ProspectLens</span>
            <div className="flex gap-1 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    activeNav === item.id
                      ? "bg-indigo-600 text-white"
                      : "opacity-70"
                  }`}
                >
                  {item.label.split(" ")[0]}
                </button>
              ))}
            </div>
            {result && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 px-3 py-1 text-xs font-medium">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                {result.dataSource === "curated_test_dataset"
                  ? "Curated Test Dataset (Demo)"
                  : result.dataSource === "user_supplied_data"
                  ? "User-Supplied Data"
                  : "Compliant API Provider"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                darkMode
                  ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              Filters
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV / JSON
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle theme"
              className={`rounded-lg border p-1.5 transition ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-amber-400"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
          {/* Search Input Card (Always accessible on Overview/Commenters/Lookalikes) */}
          {(activeNav === "overview" ||
            activeNav === "commenters" ||
            activeNav === "lookalikes") && (
            <section className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-base font-bold">
                    Stage 1 · LinkedIn Engagement &amp; Lookalike Discovery
                  </h1>
                  <p className="text-xs opacity-70">
                    Search by K-12 phrase or supply a direct LinkedIn post URL to extract commenters &amp; discover lookalikes.
                  </p>
                </div>
                <div
                  className={`inline-flex rounded-lg border p-1 ${
                    darkMode
                      ? "border-slate-700 bg-slate-800"
                      : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMode("keyword")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      mode === "keyword"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Keyword
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("post_url")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      mode === "post_url"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Post URL
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runDiscovery();
                }}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                {mode === "keyword" ? (
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='e.g. "K12 B2B Sales"'
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                ) : (
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/posts/..."
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Discover Prospects
                    </>
                  )}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-60">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("keyword");
                    setQuery("K12 B2B Sales");
                    runDiscovery({ mode: "keyword", query: "K12 B2B Sales" });
                  }}
                  className="rounded-full bg-indigo-500/15 px-2.5 py-1 font-medium text-indigo-500 hover:bg-indigo-500/25"
                >
                  Demo: &ldquo;K12 B2B Sales&rdquo;
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
                  className="rounded-full bg-slate-500/15 px-2.5 py-1 font-medium hover:bg-slate-500/25"
                >
                  Demo: Direct Post URL
                </button>
                {mode === "post_url" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowByoInput(!showByoInput);
                      if (!byoCommentsText)
                        setByoCommentsText(SAMPLE_BYO_COMMENTS);
                    }}
                    className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-500 hover:bg-emerald-500/25"
                  >
                    {showByoInput ? "Hide" : "+ Attach"} User-Exported Comments (JSON)
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
                      : "border-slate-300 bg-slate-50 text-slate-800"
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

          {result && activeNav === "overview" && (
            <>
              {/* Compliance Notice */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <span className="font-semibold">Compliance &amp; Data Provenance: </span>
                  {result.complianceNotice}
                </div>
              </div>

              {/* KPI Strip */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <p className="text-xs opacity-65">Posts Discovered</p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.stats.postsDiscovered}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-65">
                    {result.stats.rawCommentsExtracted} raw comments
                  </p>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <p className="text-xs opacity-65">Unique Commenters</p>
                  <p className="mt-1 text-2xl font-bold text-blue-500">
                    {result.stats.uniqueCommenters}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-500 font-medium">
                    {result.stats.duplicatesRemoved} duplicates merged
                  </p>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <p className="text-xs opacity-65">AI Lookalikes</p>
                  <p className="mt-1 text-2xl font-bold text-purple-500">
                    {result.stats.lookalikesDiscovered}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-65">
                    Strictly separated from commenters
                  </p>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <p className="text-xs opacity-65">Avg Relevance Score</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-500">
                    {result.stats.avgCommenterRelevance}%
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-65">
                    Lookalikes avg: {result.stats.avgLookalikeRelevance}%
                  </p>
                </div>
              </section>

              {/* 6-Stage Workflow Stepper */}
              <section className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
                <h2 className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-70">
                  <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                  6-Stage Execution Pipeline
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  {result.stages.map((st) => (
                    <div
                      key={st.stage}
                      className="rounded-xl border border-slate-500/15 bg-slate-500/5 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-500">
                          Stage {st.stage}
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <p className="mt-0.5 text-xs font-semibold">{st.name}</p>
                      <p className="mt-1 text-[11px] opacity-70 leading-snug">
                        {st.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Discovered Posts */}
              <section className="space-y-3">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Stage 2 · Discovered Posts ({result.posts.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {result.posts.map((post) => (
                    <div
                      key={post.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 shadow-sm ${cardBg}`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{post.authorName}</span>
                          <span className="opacity-60">{post.publishedDate}</span>
                        </div>
                        <p className="text-[11px] opacity-60 truncate">
                          {post.authorHeadline}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed opacity-85 line-clamp-3">
                          &ldquo;{post.snippet}&rdquo;
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-500/15 pt-2 text-[11px]">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-indigo-500 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Post URL
                        </a>
                        <span className="opacity-60">
                          {post.engagementSummary.commentsCount} comments
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Top Ranked Preview Table */}
              <section className="grid gap-4 lg:grid-cols-2">
                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">
                      Top Original Commenters
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveNav("commenters")}
                      className="text-xs font-semibold text-indigo-500 hover:underline"
                    >
                      View all ({filteredCommenters.length}) →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {filteredCommenters.slice(0, 4).map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setDetailTarget({ kind: "commenter", profile: c })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-slate-500/15 p-2.5 text-left text-xs hover:border-indigo-500/40"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold truncate">
                            #{i + 1} {c.name}
                          </p>
                          <p className="opacity-65 truncate">
                            {c.currentRole} · {c.organisation}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-500">
                          {c.relevanceScore}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`rounded-xl border p-4 shadow-sm ${cardBg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">
                      Top AI-Discovered Lookalikes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveNav("lookalikes")}
                      className="text-xs font-semibold text-purple-500 hover:underline"
                    >
                      View all ({filteredLookalikes.length}) →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {filteredLookalikes.slice(0, 4).map((l, i) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() =>
                          setDetailTarget({ kind: "lookalike", profile: l })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-slate-500/15 p-2.5 text-left text-xs hover:border-purple-500/40"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold truncate">
                            #{i + 1} {l.name}
                          </p>
                          <p className="opacity-65 truncate">
                            Seed: {l.matchedSeeds[0]?.seedCommenterName} (
                            {l.similarityScore}% match)
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-purple-500/15 px-2 py-1 font-bold text-purple-500">
                          {l.relevanceScore}%
                        </span>
                      </button>
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
                <span className="text-xs opacity-65">
                  Click &ldquo;Inspect Semantic Match&rdquo; on any card for full score gauge
                </span>
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
                      className="text-xs font-semibold text-indigo-500 hover:underline"
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
                <span className="text-xs opacity-65">
                  Strictly separated from original commenters with seed traceability
                </span>
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
                      className="text-xs font-semibold text-purple-500 hover:underline"
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
