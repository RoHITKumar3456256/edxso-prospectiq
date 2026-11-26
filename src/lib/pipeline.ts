import { retrievePostsAndComments } from "@/lib/dataAccess";
import {
  classifyTargetPersona,
  computeDecisionMakerProximityScore,
  computeEcosystemFitScore,
  computeEmbeddings,
  cosineSimilarity,
  detectEmbeddingProvider,
  EDXSO_OUTREACH_ANCHOR,
} from "@/lib/semanticEngine";
import {
  CandidateProfileRecord,
  CommenterProfile,
  DiscoveryRequest,
  DiscoveryResponse,
  LookalikeProfile,
  PipelineStageInfo,
  RawCommentRecord,
  SeedMatchEvidence,
} from "@/types/discovery";

function normalizeLinkedinUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "").split("?")[0];
}

/**
 * Runs the complete 6-stage EDXSO LinkedIn Engagement & Lookalike Discovery pipeline:
 * 1. Search Input
 * 2. Post Discovery
 * 3. Commenter Extraction & Deduplication
 * 4. AI Profile Analysis
 * 5. Lookalike Profile Discovery
 * 6. Ranking & Results
 */
export async function runDiscoveryPipeline(
  req: DiscoveryRequest
): Promise<DiscoveryResponse> {
  const stages: PipelineStageInfo[] = [];
  const runId = `run-${Date.now().toString(36)}`;
  const aiProvider = detectEmbeddingProvider();

  // Stage 1: Search Input
  const t1 = Date.now();
  const normalizedQuery =
    req.mode === "keyword" ? (req.query || "K12 B2B Sales").trim() : undefined;
  const normalizedUrl =
    req.mode === "post_url" ? (req.postUrl || "").trim() : undefined;
  stages.push({
    stage: 1,
    name: "Search Input",
    status: "completed",
    durationMs: Math.max(1, Date.now() - t1),
    summary:
      req.mode === "keyword"
        ? `Accepted keyword phrase: "${normalizedQuery}"`
        : `Accepted direct LinkedIn post URL: ${normalizedUrl}`,
  });

  // Stage 2: Post Discovery
  const t2 = Date.now();
  const retrieval = await retrievePostsAndComments(req);
  stages.push({
    stage: 2,
    name: "Post Discovery",
    status: retrieval.posts.length > 0 ? "completed" : "warning",
    durationMs: Math.max(2, Date.now() - t2),
    summary: `Discovered ${retrieval.posts.length} post(s) via ${retrieval.dataSource.replace(/_/g, " ")}.`,
  });

  // Stage 3: Commenter Extraction & Deduplication
  const t3 = Date.now();
  const dedupedMap = new Map<
    string,
    {
      base: RawCommentRecord;
      commentedPosts: CommenterProfile["commentedPosts"];
      rawCount: number;
    }
  >();

  for (const raw of retrieval.rawComments) {
    const key = normalizeLinkedinUrl(raw.linkedinProfileUrl);
    const existing = dedupedMap.get(key);
    const postEntry = {
      postId: raw.postId,
      postUrl: raw.postUrl,
      commentText: raw.commentText,
      commentDate: raw.commentDate,
    };

    if (existing) {
      const alreadyHasPost = existing.commentedPosts.some(
        (p) => p.postId === raw.postId && p.commentText === raw.commentText
      );
      if (!alreadyHasPost) {
        existing.commentedPosts.push(postEntry);
      }
      existing.rawCount += 1;
    } else {
      dedupedMap.set(key, {
        base: raw,
        commentedPosts: [postEntry],
        rawCount: 1,
      });
    }
  }

  const dedupedEntries = Array.from(dedupedMap.values());
  const duplicatesRemoved =
    retrieval.rawComments.length - dedupedEntries.length;

  stages.push({
    stage: 3,
    name: "Commenter Extraction",
    status: dedupedEntries.length > 0 ? "completed" : "warning",
    durationMs: Math.max(2, Date.now() - t3),
    summary: `Extracted ${retrieval.rawComments.length} comment(s) -> ${dedupedEntries.length} unique commenters (${duplicatesRemoved} cross-post duplicate(s) merged).`,
  });

  // Stage 4: AI Profile Analysis (Embeddings + Semantic Scoring)
  const t4 = Date.now();
  const commenterTexts = dedupedEntries.map((entry) =>
    [
      entry.base.headline,
      entry.base.currentRole,
      entry.base.organisation,
      entry.base.industry,
      entry.base.skills.join(" "),
      entry.base.schoolEcosystemSignals.join(" "),
      entry.commentedPosts.map((p) => p.commentText).join(" "),
    ].join(" ")
  );

  // Filter candidate pool to strictly exclude anyone who already commented
  const commenterUrls = new Set(dedupedMap.keys());
  const eligibleCandidates = retrieval.candidatePool.filter(
    (cand) => !commenterUrls.has(normalizeLinkedinUrl(cand.linkedinProfileUrl))
  );

  const candidateTexts = eligibleCandidates.map((cand) =>
    [
      cand.headline,
      cand.currentRole,
      cand.organisation,
      cand.industry,
      cand.skills.join(" "),
      cand.schoolEcosystemSignals.join(" "),
      cand.bioSummary,
    ].join(" ")
  );

  // Compute all embeddings in one batch: [anchor, ...commenters, ...candidates]
  const allEmbeddings = await computeEmbeddings([
    EDXSO_OUTREACH_ANCHOR,
    ...commenterTexts,
    ...candidateTexts,
  ]);

  const anchorEmbedding = allEmbeddings[0] || [];
  const commenterEmbeddings = allEmbeddings.slice(
    1,
    1 + commenterTexts.length
  );
  const candidateEmbeddings = allEmbeddings.slice(
    1 + commenterTexts.length
  );

  const analyzedCommenters: CommenterProfile[] = dedupedEntries.map(
    (entry, idx) => {
      const fullText = commenterTexts[idx];
      const vec = commenterEmbeddings[idx] || [];
      const rawCosine = cosineSimilarity(anchorEmbedding, vec);
      // Scale cosine similarity into 0-100 intuitive range
      const semanticSimilarity = Math.min(100, Math.round(rawCosine * 135));
      const ecosystemFit = computeEcosystemFitScore(
        fullText,
        entry.base.schoolEcosystemSignals,
        entry.base.multiSchoolAffiliations
      );
      const decisionMakerProximity =
        computeDecisionMakerProximityScore(fullText);
      const engagementDepth = Math.min(
        100,
        45 +
          entry.commentedPosts.length * 20 +
          Math.min(25, Math.floor(entry.commentedPosts[0]?.commentText.length / 8))
      );

      const relevanceScore = Math.round(
        0.35 * semanticSimilarity +
          0.3 * ecosystemFit +
          0.25 * decisionMakerProximity +
          0.1 * engagementDepth
      );

      const targetPersona = classifyTargetPersona(fullText);
      const indicators =
        entry.base.schoolEcosystemSignals.length > 0
          ? entry.base.schoolEcosystemSignals
          : ["K-12 / B2B Engagement"];

      const aiExplanation = buildCommenterExplanation(
        entry.base,
        targetPersona,
        entry.commentedPosts.length,
        relevanceScore,
        indicators
      );

      return {
        id: `commenter-${idx + 1}`,
        category: "original_commenter",
        name: entry.base.commenterName,
        linkedinProfileUrl: entry.base.linkedinProfileUrl,
        headline: entry.base.headline,
        currentRole: entry.base.currentRole,
        organisation: entry.base.organisation,
        location: entry.base.location,
        industry: entry.base.industry,
        skills: entry.base.skills,
        targetPersona,
        schoolEcosystemIndicators: indicators,
        commentedPosts: entry.commentedPosts,
        relevanceScore,
        scoreBreakdown: {
          semanticSimilarity,
          ecosystemFit,
          decisionMakerProximity,
          engagementDepth,
        },
        aiExplanation,
        provenance: {
          dataSource: entry.base.dataSource,
          isTestFixture: entry.base.dataSource === "curated_test_dataset",
          deduplicatedFromCount: entry.rawCount,
        },
      };
    }
  );

  // Rank commenters descending by relevanceScore
  analyzedCommenters.sort((a, b) => b.relevanceScore - a.relevanceScore);

  stages.push({
    stage: 4,
    name: "AI Profile Analysis",
    status: analyzedCommenters.length > 0 ? "completed" : "warning",
    durationMs: Math.max(2, Date.now() - t4),
    summary: `Analysed ${analyzedCommenters.length} unique commenter(s) using ${aiProvider.embeddingModel}.`,
  });

  // Stage 5: Lookalike Profile Discovery
  const t5 = Date.now();
  // Use top-scoring commenters as seeds (relevance >= 55, or fallback to all if few)
  const seedCommentersWithVec = analyzedCommenters
    .map((c) => {
      const originalIdx = dedupedEntries.findIndex(
        (d) =>
          normalizeLinkedinUrl(d.base.linkedinProfileUrl) ===
          normalizeLinkedinUrl(c.linkedinProfileUrl)
      );
      return {
        commenter: c,
        vec: commenterEmbeddings[originalIdx] || [],
      };
    })
    .filter((item) => item.commenter.relevanceScore >= 55)
    .slice(0, 6);

  const activeSeeds =
    seedCommentersWithVec.length > 0
      ? seedCommentersWithVec
      : analyzedCommenters.slice(0, 3).map((c, i) => ({
          commenter: c,
          vec: commenterEmbeddings[i] || [],
        }));

  const maxLookalikes = req.maxLookalikes ?? 10;

  const discoveredLookalikes: LookalikeProfile[] = eligibleCandidates.map(
    (cand, idx) => {
      const candVec = candidateEmbeddings[idx] || [];
      const candText = candidateTexts[idx];

      // Compare against every active seed profile
      const seedMatches: SeedMatchEvidence[] = activeSeeds
        .map(({ commenter: seed, vec: seedVec }) => {
          const cos = cosineSimilarity(candVec, seedVec);
          const overlap = computeAttributeOverlap(cand, seed);
          const simScore = Math.min(
            99,
            Math.round(cos * 100 * 0.55 + overlap.score * 0.45)
          );

          return {
            seedCommenterId: seed.id,
            seedCommenterName: seed.name,
            seedLinkedinUrl: seed.linkedinProfileUrl,
            similarityScore: simScore,
            semanticCosine: Number(cos.toFixed(3)),
            sharedAttributes: overlap.shared,
            rationale: buildSeedMatchRationale(cand, seed, overlap.shared, simScore),
          };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 3);

      const bestSeedSimilarity = seedMatches[0]?.similarityScore ?? 0;
      const anchorCosine = cosineSimilarity(anchorEmbedding, candVec);
      const semanticSimilarity = Math.min(
        100,
        Math.round(anchorCosine * 135)
      );
      const ecosystemFit = computeEcosystemFitScore(
        candText,
        cand.schoolEcosystemSignals,
        cand.multiSchoolAffiliations
      );
      const decisionMakerProximity =
        computeDecisionMakerProximityScore(candText);

      const relevanceScore = Math.round(
        0.3 * semanticSimilarity +
          0.3 * ecosystemFit +
          0.2 * decisionMakerProximity +
          0.2 * bestSeedSimilarity
      );

      const targetPersona = classifyTargetPersona(candText);
      const indicators =
        cand.schoolEcosystemSignals.length > 0
          ? cand.schoolEcosystemSignals
          : ["Adjacent / General B2B"];

      return {
        id: `lookalike-${idx + 1}`,
        category: "ai_lookalike",
        name: cand.name,
        linkedinProfileUrl: cand.linkedinProfileUrl,
        headline: cand.headline,
        currentRole: cand.currentRole,
        organisation: cand.organisation,
        location: cand.location,
        industry: cand.industry,
        skills: cand.skills,
        targetPersona,
        schoolEcosystemIndicators: indicators,
        matchedSeeds: seedMatches,
        similarityScore: bestSeedSimilarity,
        relevanceScore,
        scoreBreakdown: {
          semanticSimilarity,
          ecosystemFit,
          decisionMakerProximity,
          seedAffinity: bestSeedSimilarity,
        },
        aiExplanation: buildLookalikeExplanation(
          cand,
          targetPersona,
          seedMatches[0],
          relevanceScore
        ),
        provenance: {
          dataSource: cand.dataSource,
          isTestFixture: cand.dataSource === "curated_test_dataset",
          discoveryMethod: `${aiProvider.embeddingModel} cosine similarity + structured attribute overlap against ${activeSeeds.length} seed commenter(s)`,
        },
      };
    }
  );

  // Rank lookalikes descending by relevanceScore and take top N
  discoveredLookalikes.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const finalLookalikes = discoveredLookalikes.slice(0, maxLookalikes);

  stages.push({
    stage: 5,
    name: "Lookalike Discovery",
    status: "completed",
    durationMs: Math.max(2, Date.now() - t5),
    summary: `Used ${activeSeeds.length} high-fit seed commenter(s) to discover and score ${finalLookalikes.length} lookalike profiles.`,
  });

  // Stage 6: Ranking & Results
  const t6 = Date.now();
  const avgCommenterRelevance =
    analyzedCommenters.length > 0
      ? Math.round(
          analyzedCommenters.reduce((acc, c) => acc + c.relevanceScore, 0) /
            analyzedCommenters.length
        )
      : 0;
  const avgLookalikeRelevance =
    finalLookalikes.length > 0
      ? Math.round(
          finalLookalikes.reduce((acc, l) => acc + l.relevanceScore, 0) /
            finalLookalikes.length
        )
      : 0;

  stages.push({
    stage: 6,
    name: "Ranking & Results",
    status: "completed",
    durationMs: Math.max(1, Date.now() - t6),
    summary: `Ranked ${analyzedCommenters.length} commenters (avg ${avgCommenterRelevance}/100) and ${finalLookalikes.length} lookalikes (avg ${avgLookalikeRelevance}/100) in separate traceable groups.`,
  });

  return {
    runId,
    timestamp: new Date().toISOString(),
    input: {
      mode: req.mode,
      query: normalizedQuery,
      postUrl: normalizedUrl,
    },
    dataSource: retrieval.dataSource,
    complianceNotice: retrieval.complianceNotice,
    aiEngine: {
      mode: aiProvider.mode,
      embeddingModel: aiProvider.embeddingModel,
      scoringFormula:
        "Commenters: 0.35*Semantic + 0.30*EcosystemFit + 0.25*DecisionMakerProximity + 0.10*EngagementDepth | Lookalikes: 0.30*Semantic + 0.30*EcosystemFit + 0.20*DecisionMakerProximity + 0.20*SeedAffinity",
    },
    stages,
    posts: retrieval.posts,
    commenters: analyzedCommenters,
    lookalikes: finalLookalikes,
    stats: {
      postsDiscovered: retrieval.posts.length,
      rawCommentsExtracted: retrieval.rawComments.length,
      uniqueCommenters: analyzedCommenters.length,
      duplicatesRemoved,
      lookalikesDiscovered: finalLookalikes.length,
      avgCommenterRelevance,
      avgLookalikeRelevance,
    },
  };
}

function computeAttributeOverlap(
  cand: CandidateProfileRecord,
  seed: CommenterProfile
): {
  score: number;
  shared: SeedMatchEvidence["sharedAttributes"];
} {
  const candSkills = new Set(cand.skills.map((s) => s.toLowerCase()));
  const sharedSkills = seed.skills.filter((s) =>
    candSkills.has(s.toLowerCase())
  );

  const rolesAndSeniority: string[] = [];
  const candRoleText = `${cand.currentRole} ${cand.headline}`.toLowerCase();
  const seedRoleText = `${seed.currentRole} ${seed.headline}`.toLowerCase();
  const roleKeywords = [
    "principal",
    "director",
    "trustee",
    "consultant",
    "advisor",
    "founder",
    "vp",
    "head",
  ];
  for (const rk of roleKeywords) {
    if (candRoleText.includes(rk) && seedRoleText.includes(rk)) {
      rolesAndSeniority.push(rk.charAt(0).toUpperCase() + rk.slice(1));
    }
  }

  const industryAndDomain: string[] = [];
  if (
    cand.industry.toLowerCase() === seed.industry.toLowerCase() ||
    (cand.industry.toLowerCase().includes("education") &&
      seed.industry.toLowerCase().includes("education"))
  ) {
    industryAndDomain.push(cand.industry);
  }

  const schoolNetworkOverlap: string[] = [];
  if (
    cand.schoolEcosystemSignals.length > 0 &&
    seed.schoolEcosystemIndicators.length > 0
  ) {
    if (
      cand.multiSchoolAffiliations?.length &&
      seed.schoolEcosystemIndicators.some((s) => s.toLowerCase().includes("school"))
    ) {
      schoolNetworkOverlap.push("Multi-School K-12 Ecosystem Reach");
    }
    if (
      candRoleText.includes("cbse") &&
      seedRoleText.includes("cbse")
    ) {
      schoolNetworkOverlap.push("CBSE School Network");
    }
    if (
      candRoleText.includes("icse") &&
      seedRoleText.includes("icse")
    ) {
      schoolNetworkOverlap.push("ICSE School Network");
    }
  }

  let score = 15;
  score += Math.min(35, sharedSkills.length * 14);
  score += Math.min(25, rolesAndSeniority.length * 15);
  score += industryAndDomain.length > 0 ? 15 : 0;
  score += Math.min(15, schoolNetworkOverlap.length * 10);

  return {
    score: Math.min(100, score),
    shared: {
      rolesAndSeniority,
      industryAndDomain,
      skills: sharedSkills,
      schoolNetworkOverlap,
    },
  };
}

function buildCommenterExplanation(
  raw: RawCommentRecord,
  persona: string,
  postCount: number,
  score: number,
  indicators: string[]
): string {
  const tier =
    score >= 80 ? "High-priority" : score >= 60 ? "Strong" : "Moderate/Low";
  return `${tier} EDXSO prospect (${persona}). Engaged on ${postCount} relevant post(s) with signals: ${indicators.slice(0, 3).join(", ")}. Current role: ${raw.currentRole} at ${raw.organisation}.`;
}

function buildSeedMatchRationale(
  cand: CandidateProfileRecord,
  seed: CommenterProfile,
  shared: SeedMatchEvidence["sharedAttributes"],
  simScore: number
): string {
  const parts: string[] = [];
  if (shared.rolesAndSeniority.length > 0) {
    parts.push(`shared seniority/role (${shared.rolesAndSeniority.join(", ")})`);
  }
  if (shared.skills.length > 0) {
    parts.push(`overlapping skills (${shared.skills.slice(0, 3).join(", ")})`);
  }
  if (shared.industryAndDomain.length > 0) {
    parts.push(`same domain (${shared.industryAndDomain[0]})`);
  }
  if (shared.schoolNetworkOverlap.length > 0) {
    parts.push(shared.schoolNetworkOverlap.join(", "));
  }
  const detail =
    parts.length > 0
      ? parts.join("; ")
      : "semantic profile context alignment";
  return `${simScore}% similarity to seed ${seed.name} driven by ${detail}.`;
}

function buildLookalikeExplanation(
  cand: CandidateProfileRecord,
  persona: string,
  topSeed: SeedMatchEvidence | undefined,
  score: number
): string {
  const tier =
    score >= 80 ? "High-priority" : score >= 60 ? "Strong" : "Low-fit";
  const seedClause = topSeed
    ? `Closest match to seed commenter ${topSeed.seedCommenterName} (${topSeed.similarityScore}% similarity).`
    : "";
  return `${tier} lookalike (${persona}). ${seedClause} ${cand.bioSummary}`;
}

