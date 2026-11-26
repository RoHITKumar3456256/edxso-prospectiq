import {
  TEST_CANDIDATE_POOL,
  TEST_POSTS,
  TEST_RAW_COMMENTS,
} from "@/data/testDataset";
import {
  CandidateProfileRecord,
  DataSourceMode,
  DiscoveredPost,
  DiscoveryRequest,
  RawCommentRecord,
} from "@/types/discovery";

export interface PostAndCommentRetrievalResult {
  posts: DiscoveredPost[];
  rawComments: RawCommentRecord[];
  candidatePool: CandidateProfileRecord[];
  dataSource: DataSourceMode;
  complianceNotice: string;
}

/**
 * Compliant Data Access Layer
 * ---------------------------
 * Respects LinkedIn's platform terms and assignment constraints:
 * 1. Never scrapes LinkedIn or bypasses authentication/CAPTCHA/rate limits.
 * 2. Supports User-Supplied Post URLs + User-Exported Comments (JSON/CSV).
 * 3. Supports optional compliant third-party search providers (Tavily / SerpAPI)
 *    when API keys are configured in environment variables.
 * 4. Falls back cleanly to the clearly labelled Curated Test Dataset so the
 *    end-to-end workflow can be evaluated reliably without fabricating live data.
 */
export async function retrievePostsAndComments(
  req: DiscoveryRequest
): Promise<PostAndCommentRetrievalResult> {
  const maxPosts = req.maxPosts ?? 5;

  // Case 1: User supplied a direct LinkedIn Post URL
  if (req.mode === "post_url" && req.postUrl) {
    const normalizedUrl = req.postUrl.trim();
    const matchedTestPost = TEST_POSTS.find(
      (p) => p.url.toLowerCase() === normalizedUrl.toLowerCase()
    );

    // If user also supplied exported comments, use them as user_supplied_data
    if (req.userSuppliedComments && req.userSuppliedComments.length > 0) {
      const post: DiscoveredPost = matchedTestPost
        ? { ...matchedTestPost, dataSource: "user_supplied_data" }
        : {
            id: "user-post-01",
            url: normalizedUrl,
            authorName: "User-Supplied Post Author",
            authorHeadline: "LinkedIn Post (User-Supplied URL)",
            authorProfileUrl: normalizedUrl,
            publishedDate: new Date().toISOString().slice(0, 10),
            snippet:
              "Direct LinkedIn post URL supplied by the user with exported engagement records.",
            topicTags: ["User-Supplied Post"],
            engagementSummary: {
              likes: 0,
              commentsCount: req.userSuppliedComments.length,
            },
            dataSource: "user_supplied_data",
          };

      const rawComments: RawCommentRecord[] = req.userSuppliedComments.map((c) => ({
        postId: post.id,
        postUrl: post.url,
        commenterName: c.commenterName,
        linkedinProfileUrl: c.linkedinProfileUrl,
        headline: c.headline || c.currentRole || "LinkedIn Member",
        currentRole: c.currentRole || "Not specified",
        organisation: c.organisation || "Not specified",
        location: c.location || "Not specified",
        industry: "Education / B2B",
        skills: c.skills && c.skills.length > 0 ? c.skills : inferSkillsFromText(c.commentText + " " + (c.headline || "")),
        schoolEcosystemSignals: inferEcosystemSignals(
          `${c.headline || ""} ${c.currentRole || ""} ${c.organisation || ""} ${c.commentText}`
        ),
        commentText: c.commentText,
        commentDate: c.commentDate || new Date().toISOString().slice(0, 10),
        dataSource: "user_supplied_data",
      }));

      return {
        posts: [post],
        rawComments,
        candidatePool: TEST_CANDIDATE_POOL,
        dataSource: "user_supplied_data",
        complianceNotice:
          "Post and commenter records were supplied directly by the user (BYO-Data). Lookalike candidates are matched against the clearly labelled curated candidate pool.",
      };
    }

    // If the supplied URL matches one of our curated test posts
    if (matchedTestPost) {
      const postComments = TEST_RAW_COMMENTS.filter(
        (c) => c.postId === matchedTestPost.id
      );
      return {
        posts: [matchedTestPost],
        rawComments: postComments,
        candidatePool: TEST_CANDIDATE_POOL,
        dataSource: "curated_test_dataset",
        complianceNotice:
          "Matched curated test dataset post. Displaying clearly labelled demo/test fixture records (not live LinkedIn data).",
      };
    }

    // External arbitrary LinkedIn URL without user-supplied comments:
    // Check if Tavily API is configured for compliant public metadata lookup
    const publicMeta = await tryCompliantPublicLookup(normalizedUrl);
    const externalPost: DiscoveredPost = {
      id: "supplied-post-01",
      url: normalizedUrl,
      authorName: publicMeta?.authorName || "External LinkedIn Post (Supplied URL)",
      authorHeadline:
        publicMeta?.snippet ||
        "Direct URL processed without unauthorised scraping. Attach exported comments JSON/CSV to analyse live commenters.",
      authorProfileUrl: normalizedUrl,
      publishedDate: new Date().toISOString().slice(0, 10),
      snippet:
        publicMeta?.snippet ||
        "LinkedIn does not expose a public API for comment retrieval on arbitrary post URLs. To analyse commenters from this post compliantly, import exported comment records or run with the curated demo post.",
      topicTags: ["Supplied URL", "Compliant Mode"],
      engagementSummary: { likes: 0, commentsCount: 0 },
      dataSource: publicMeta ? "compliant_api_provider" : "user_supplied_data",
    };

    return {
      posts: [externalPost],
      rawComments: [],
      candidatePool: TEST_CANDIDATE_POOL,
      dataSource: publicMeta ? "compliant_api_provider" : "user_supplied_data",
      complianceNotice:
        "Processed user-supplied LinkedIn URL compliantly without scraping. Because LinkedIn restricts public comment APIs, 0 comments were auto-fetched; import exported comments JSON/CSV to extract and rank commenters for this URL.",
    };
  }

  // Case 2: Keyword / Phrase Search
  const query = (req.query || "K12 B2B Sales").trim();

  // Optional: If TAVILY_API_KEY is configured, we can discover public LinkedIn post URLs compliantly
  if (process.env.TAVILY_API_KEY) {
    const tavilyPosts = await tryTavilyLinkedInPostSearch(query, maxPosts);
    if (tavilyPosts && tavilyPosts.length > 0) {
      // Note: Public search indexes post URLs/snippets, not full commenter lists (LinkedIn restriction)
      return {
        posts: tavilyPosts,
        rawComments: TEST_RAW_COMMENTS.slice(0, 6), // Clearly labelled fallback for demoing stage 3-6
        candidatePool: TEST_CANDIDATE_POOL,
        dataSource: "compliant_api_provider",
        complianceNotice:
          "Posts discovered via compliant Tavily public web search API. Because public search engines do not expose full LinkedIn comment threads, commenter extraction uses the clearly labelled test dataset unless user-exported comments are provided.",
      };
    }
  }

  // Default: Curated Test Dataset matching / ranking by query relevance
  const scoredPosts = TEST_POSTS.map((post) => ({
    post,
    score: computeKeywordOverlapScore(
      query,
      `${post.snippet} ${post.fullText || ""} ${post.topicTags.join(" ")}`
    ),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPosts)
    .map((x) => x.post);

  const selectedPostIds = new Set(scoredPosts.map((p) => p.id));
  const rawComments = TEST_RAW_COMMENTS.filter((c) =>
    selectedPostIds.has(c.postId)
  );

  return {
    posts: scoredPosts,
    rawComments,
    candidatePool: TEST_CANDIDATE_POOL,
    dataSource: "curated_test_dataset",
    complianceNotice:
      "Running on the clearly labelled Curated Test Dataset (demo fixtures, not live LinkedIn data). LinkedIn does not provide a public API for unrestricted phrase-based post search or comment extraction; see Methodology & Compliance for the compliant production path.",
  };
}

function computeKeywordOverlapScore(query: string, text: string): number {
  const qTokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  const lower = text.toLowerCase();
  if (qTokens.length === 0) return 1;
  let hits = 0;
  for (const tok of qTokens) {
    if (lower.includes(tok)) hits += 1;
  }
  return hits / qTokens.length;
}

function inferSkillsFromText(text: string): string[] {
  const dictionary = [
    "K12 B2B Sales",
    "School Partnerships",
    "EdTech",
    "Curriculum Design",
    "School Governance",
    "Principal Coaching",
    "NEP 2020",
    "Teacher Training",
    "Academic Audits",
    "CBSE Compliance",
  ];
  const lower = text.toLowerCase();
  return dictionary.filter((d) => lower.includes(d.toLowerCase()));
}

function inferEcosystemSignals(text: string): string[] {
  const signals: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("principal")) signals.push("Principal / School Leadership");
  if (lower.includes("trustee") || lower.includes("owner"))
    signals.push("School Owner / Trustee");
  if (lower.includes("consultant") || lower.includes("advisor"))
    signals.push("Education Consultant / Advisor");
  if (lower.includes("school") && (lower.includes("network") || lower.includes("chain") || lower.includes("group")))
    signals.push("Multi-School Network Affiliation");
  if (lower.includes("edtech") || lower.includes("founder"))
    signals.push("Education Entrepreneur");
  return signals;
}

async function tryCompliantPublicLookup(
  url: string
): Promise<{ authorName?: string; snippet?: string } | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: url,
        max_results: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return {
      authorName: first.title,
      snippet: first.content,
    };
  } catch {
    return null;
  }
}

async function tryTavilyLinkedInPostSearch(
  query: string,
  maxPosts: number
): Promise<DiscoveredPost[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `site:linkedin.com/posts ${query}`,
        max_results: maxPosts,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];
    if (!Array.isArray(results) || results.length === 0) return null;

    return results.slice(0, maxPosts).map((r: { url: string; title?: string; content?: string }, idx: number) => ({
      id: `tavily-post-${idx + 1}`,
      url: r.url,
      authorName: r.title?.split(" on LinkedIn")?.[0] || "LinkedIn Author",
      authorHeadline: "Discovered via Public Search Index",
      authorProfileUrl: r.url,
      publishedDate: new Date().toISOString().slice(0, 10),
      snippet: (r.content || "").slice(0, 260),
      topicTags: [query],
      engagementSummary: { likes: 0, commentsCount: 0 },
      dataSource: "compliant_api_provider" as const,
    }));
  } catch {
    return null;
  }
}

