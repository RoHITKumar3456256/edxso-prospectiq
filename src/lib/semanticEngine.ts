import { TargetPersona } from "@/types/discovery";

/**
 * EDXSO Ideal Outreach Anchor Text used for semantic similarity scoring.
 */
export const EDXSO_OUTREACH_ANCHOR =
  "K12 school education consultant advisor former principal school director owner trustee " +
  "education entrepreneur school network multi-school partnerships CBSE ICSE IB NEP 2020 " +
  "school decision makers procurement academic governance teacher training EdTech B2B sales";

/**
 * Domain ontology synonym/concept groups for local hybrid semantic vectorization.
 * Expands surface tokens into shared semantic concepts so "Former Principal" and
 * "School Director" or "Trustee" and "School Owner" share high semantic similarity
 * even without exact keyword overlap.
 */
const SEMANTIC_CONCEPT_CLUSTERS: Record<string, string[]> = {
  concept_school_leadership: [
    "principal", "director", "headmaster", "headmistress", "dean", "superintendent",
    "academic head", "school leader", "leadership", "former principal", "retired principal",
  ],
  concept_governance_ownership: [
    "trustee", "owner", "founder", "chairman", "managing trustee", "board",
    "governance", "society", "trust", "decision-maker", "decision maker", "p&l",
  ],
  concept_advisory_consulting: [
    "consultant", "advisor", "advisory", "mentor", "coaching", "auditor",
    "accreditation", "affiliation", "curriculum", "nep", "cbse", "icse", "ib",
  ],
  concept_multi_school_network: [
    "multi-school", "network", "consortium", "association", "chain", "group",
    "campuses", "schools", "alliance", "collective", "forum", "guild", "cluster",
  ],
  concept_edtech_b2b: [
    "k12", "k-12", "edtech", "b2b", "partnerships", "gtm", "alliances",
    "channel", "institutional", "procurement", "vendor", "saas", "sales",
  ],
  concept_teacher_academic: [
    "teacher", "faculty", "academic", "assessment", "learning", "pedagogy",
    "training", "classroom", "outcomes", "retention",
  ],
};

export interface EmbeddingProviderInfo {
  mode: "openai_embeddings_and_llm" | "gemini_embeddings_and_llm" | "local_hybrid_semantic_engine";
  embeddingModel: string;
}

export function detectEmbeddingProvider(): EmbeddingProviderInfo {
  if (process.env.OPENAI_API_KEY) {
    return {
      mode: "openai_embeddings_and_llm",
      embeddingModel: "text-embedding-3-small",
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      mode: "gemini_embeddings_and_llm",
      embeddingModel: "text-embedding-004",
    };
  }
  return {
    mode: "local_hybrid_semantic_engine",
    embeddingModel: "edxso-hybrid-ontology-tfidf-v1",
  };
}

/**
 * Computes dense or sparse semantic embeddings for a batch of texts.
 * Uses OpenAI or Gemini Embeddings when API keys are configured, and falls back
 * seamlessly to the deterministic Hybrid Ontology + TF-IDF Vectorizer.
 */
export async function computeEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: texts,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          return json.data.map((d: { embedding: number[] }) => d.embedding);
        }
      }
    } catch {
      // Fall through to local semantic engine
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const vectors: number[][] = [];
      for (const text of texts) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: { parts: [{ text }] },
            }),
          }
        );
        if (!res.ok) throw new Error("Gemini embed failed");
        const json = await res.json();
        vectors.push(json.embedding.values);
      }
      return vectors;
    } catch {
      // Fall through to local semantic engine
    }
  }

  return computeLocalHybridVectors(texts);
}

/**
 * Local Hybrid Semantic Vectorizer:
 * 1. Tokenizes text + bigrams
 * 2. Expands domain-specific K-12 education concepts (weighted 2.2x)
 * 3. Applies IDF weighting across the batch and L2-normalizes each vector
 */
function computeLocalHybridVectors(texts: string[]): number[][] {
  const tokenizedDocs = texts.map((t) => extractWeightedTokens(t));
  const vocab = new Map<string, number>();
  const docFreq = new Map<string, number>();

  for (const tokens of tokenizedDocs) {
    const seen = new Set<string>();
    for (const tok of tokens.keys()) {
      if (!vocab.has(tok)) vocab.set(tok, vocab.size);
      if (!seen.has(tok)) {
        seen.add(tok);
        docFreq.set(tok, (docFreq.get(tok) || 0) + 1);
      }
    }
  }

  const N = texts.length;
  return tokenizedDocs.map((tokens) => {
    const vec = new Array<number>(vocab.size).fill(0);
    for (const [tok, tf] of tokens.entries()) {
      const idx = vocab.get(tok)!;
      const df = docFreq.get(tok) || 1;
      const idf = Math.log((N + 1) / (df + 0.5)) + 1;
      vec[idx] = tf * idf;
    }
    return l2Normalize(vec);
  });
}

function extractWeightedTokens(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  for (const w of words) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]}_${words[i + 1]}`;
    counts.set(bigram, (counts.get(bigram) || 0) + 0.8);
  }

  // Ontology concept expansion
  for (const [concept, keywords] of Object.entries(SEMANTIC_CONCEPT_CLUSTERS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) hits += 1;
    }
    if (hits > 0) {
      counts.set(concept, hits * 2.2);
    }
  }

  return counts;
}

function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

export function classifyTargetPersona(text: string): TargetPersona {
  const lower = text.toLowerCase();
  if (
    lower.includes("trustee") ||
    lower.includes("school owner") ||
    lower.includes("former principal") ||
    lower.includes("former icse principal") ||
    lower.includes("former cbse principal") ||
    lower.includes("group director")
  ) {
    return "Former Principal / Director / Owner / Trustee";
  }
  if (
    lower.includes("consultant") ||
    lower.includes("advisor") ||
    lower.includes("auditor") ||
    lower.includes("accreditation")
  ) {
    return "School & Education Consultant / Advisor";
  }
  if (
    lower.includes("consortium") ||
    lower.includes("association") ||
    lower.includes("connects") ||
    lower.includes("decision-maker") ||
    lower.includes("decision maker")
  ) {
    return "School Decision-Maker Connector";
  }
  if (
    lower.includes("founder") ||
    lower.includes("co-founder") ||
    lower.includes("entrepreneur") ||
    lower.includes("vp")
  ) {
    return "Education Entrepreneur / School Network Pro";
  }
  if (
    lower.includes("campuses") ||
    lower.includes("schools") ||
    lower.includes("multi-school")
  ) {
    return "Multi-School Professional";
  }
  return "General EdTech / B2B Professional";
}

export function computeEcosystemFitScore(
  text: string,
  signals: string[],
  multiSchoolAffiliations?: string[]
): number {
  const lower = text.toLowerCase();
  let score = 15;

  if (lower.includes("k-12") || lower.includes("k12") || lower.includes("cbse") || lower.includes("icse") || lower.includes("school")) {
    score += 25;
  }
  if (lower.includes("principal") || lower.includes("trustee") || lower.includes("school owner") || lower.includes("director")) {
    score += 20;
  }
  if (lower.includes("consultant") || lower.includes("advisor") || lower.includes("auditor")) {
    score += 15;
  }
  score += Math.min(20, signals.length * 7);
  if (multiSchoolAffiliations && multiSchoolAffiliations.length > 0) {
    score += 15;
  }
  if (lower.includes("higher education") && !lower.includes("k-12") && !lower.includes("k12")) {
    score -= 20;
  }
  return Math.max(5, Math.min(100, Math.round(score)));
}

export function computeDecisionMakerProximityScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 20;
  if (lower.includes("trustee") || lower.includes("school owner") || lower.includes("managing trustee")) {
    score += 70;
  } else if (lower.includes("former principal") || lower.includes("group director") || lower.includes("director of academics")) {
    score += 65;
  } else if (lower.includes("consultant") || lower.includes("advisor") || lower.includes("association") || lower.includes("consortium")) {
    score += 55;
  } else if (lower.includes("partnerships") || lower.includes("alliances") || lower.includes("founder")) {
    score += 45;
  }
  if (lower.includes("decision-maker") || lower.includes("school owners") || lower.includes("principals")) {
    score += 10;
  }
  return Math.max(5, Math.min(100, Math.round(score)));
}

