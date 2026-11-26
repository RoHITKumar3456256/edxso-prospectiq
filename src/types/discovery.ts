export type DataSourceMode =
  | "curated_test_dataset"
  | "user_supplied_data"
  | "compliant_api_provider";

export type InputMode = "keyword" | "post_url";

export type TargetPersona =
  | "School & Education Consultant / Advisor"
  | "Former Principal / Director / Owner / Trustee"
  | "Education Entrepreneur / School Network Pro"
  | "Multi-School Professional"
  | "School Decision-Maker Connector"
  | "General EdTech / B2B Professional";

export interface DiscoveredPost {
  id: string;
  url: string;
  authorName: string;
  authorHeadline: string;
  authorProfileUrl: string;
  publishedDate: string; // ISO date or YYYY-MM-DD
  snippet: string;
  fullText?: string;
  topicTags: string[];
  engagementSummary: {
    likes: number;
    commentsCount: number;
  };
  dataSource: DataSourceMode;
}

export interface RawCommentRecord {
  postId: string;
  postUrl: string;
  commenterName: string;
  linkedinProfileUrl: string;
  headline: string;
  currentRole: string;
  organisation: string;
  location: string;
  industry: string;
  skills: string[];
  schoolEcosystemSignals: string[];
  commentText: string;
  commentDate: string;
  experienceYears?: number;
  multiSchoolAffiliations?: string[];
  dataSource: DataSourceMode;
}

export interface CommenterProfile {
  id: string;
  category: "original_commenter";
  name: string;
  linkedinProfileUrl: string;
  headline: string;
  currentRole: string;
  organisation: string;
  location: string;
  industry: string;
  skills: string[];
  targetPersona: TargetPersona;
  schoolEcosystemIndicators: string[];
  commentedPosts: Array<{
    postId: string;
    postUrl: string;
    commentText: string;
    commentDate: string;
  }>;
  relevanceScore: number; // 0 - 100
  scoreBreakdown: {
    semanticSimilarity: number; // 0 - 100
    ecosystemFit: number; // 0 - 100
    decisionMakerProximity: number; // 0 - 100
    engagementDepth: number; // 0 - 100
  };
  aiExplanation: string;
  provenance: {
    dataSource: DataSourceMode;
    isTestFixture: boolean;
    deduplicatedFromCount: number;
  };
}

export interface CandidateProfileRecord {
  id: string;
  name: string;
  linkedinProfileUrl: string;
  headline: string;
  currentRole: string;
  organisation: string;
  location: string;
  industry: string;
  skills: string[];
  schoolEcosystemSignals: string[];
  bioSummary: string;
  multiSchoolAffiliations?: string[];
  dataSource: DataSourceMode;
}

export interface SeedMatchEvidence {
  seedCommenterId: string;
  seedCommenterName: string;
  seedLinkedinUrl: string;
  similarityScore: number; // 0 - 100
  semanticCosine: number; // 0 - 1
  sharedAttributes: {
    rolesAndSeniority: string[];
    industryAndDomain: string[];
    skills: string[];
    schoolNetworkOverlap: string[];
  };
  rationale: string;
}

export interface LookalikeProfile {
  id: string;
  category: "ai_lookalike";
  name: string;
  linkedinProfileUrl: string;
  headline: string;
  currentRole: string;
  organisation: string;
  location: string;
  industry: string;
  skills: string[];
  targetPersona: TargetPersona;
  schoolEcosystemIndicators: string[];
  matchedSeeds: SeedMatchEvidence[];
  similarityScore: number; // 0 - 100 (best/weighted seed similarity)
  relevanceScore: number; // 0 - 100 (EDXSO outreach relevance)
  scoreBreakdown: {
    semanticSimilarity: number;
    ecosystemFit: number;
    decisionMakerProximity: number;
    seedAffinity: number;
  };
  aiExplanation: string;
  provenance: {
    dataSource: DataSourceMode;
    isTestFixture: boolean;
    discoveryMethod: string;
  };
}

export interface PipelineStageInfo {
  stage: number;
  name: string;
  status: "completed" | "skipped" | "warning";
  durationMs: number;
  summary: string;
}

export interface DiscoveryRequest {
  mode: InputMode;
  query?: string;
  postUrl?: string;
  /** Optional user-supplied comments JSON for compliant BYO-data workflow */
  userSuppliedComments?: Array<{
    commenterName: string;
    linkedinProfileUrl: string;
    currentRole?: string;
    organisation?: string;
    location?: string;
    headline?: string;
    commentText: string;
    commentDate?: string;
    skills?: string[];
  }>;
  maxPosts?: number;
  maxLookalikes?: number;
}

export interface DiscoveryResponse {
  runId: string;
  timestamp: string;
  input: {
    mode: InputMode;
    query?: string;
    postUrl?: string;
  };
  dataSource: DataSourceMode;
  complianceNotice: string;
  aiEngine: {
    mode: "openai_embeddings_and_llm" | "gemini_embeddings_and_llm" | "local_hybrid_semantic_engine";
    embeddingModel: string;
    scoringFormula: string;
  };
  stages: PipelineStageInfo[];
  posts: DiscoveredPost[];
  commenters: CommenterProfile[];
  lookalikes: LookalikeProfile[];
  stats: {
    postsDiscovered: number;
    rawCommentsExtracted: number;
    uniqueCommenters: number;
    duplicatesRemoved: number;
    lookalikesDiscovered: number;
    avgCommenterRelevance: number;
    avgLookalikeRelevance: number;
  };
}

