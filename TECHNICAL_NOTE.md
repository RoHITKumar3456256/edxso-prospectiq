# Technical Note: EDXSO LinkedIn Engagement & Lookalike Profile Discovery Tool

## 1. System Architecture

The application is built as a modular, 6-stage pipeline in TypeScript (`src/lib/pipeline.ts`), shared across both the Next.js web UI (`src/app/page.tsx`, `/api/discover`) and the CLI (`src/cli/discover.ts`):

1. **Search Input**: Validates either a keyword/phrase (`mode: "keyword"`) or a direct LinkedIn post URL (`mode: "post_url"`) with optional user-exported comments (`userSuppliedComments`) via Zod schemas.
2. **Post Discovery (`src/lib/dataAccess.ts`)**: Retrieves 5 relevant posts for keyword queries or processes the supplied post URL directly.
3. **Commenter Extraction & Deduplication**: Normalizes LinkedIn profile URLs (`lowercase`, trailing slash and query-param stripped) to merge cross-post duplicates while preserving every `(postUrl, commentText, commentDate)` tuple.
4. **AI Profile Analysis (`src/lib/semanticEngine.ts`)**: Vectorizes profile + engagement context, classifies each commenter into an EDXSO target persona, and computes a 4-factor relevance score with an explanation.
5. **Lookalike Profile Discovery**: Excludes all original commenters from the candidate pool, selects top-scoring commenters as seeds, computes pairwise semantic cosine similarity + structured attribute overlap, and records `SeedMatchEvidence`.
6. **Ranking & Export (`src/lib/exportUtils.ts`)**: Ranks both groups independently by EDXSO outreach relevance and exports traceable CSV/JSON.

## 2. Compliant Data Retrieval Approach & Limitations

LinkedIn does **not** provide a public API for unrestricted phrase-based post search or comment extraction, and scraping or bypassing LinkedIn access controls violates platform terms and assignment constraints.

Therefore, the system implements a **three-tier compliant data access architecture**:
- **Tier 1 — Curated Test Dataset (`curated_test_dataset`)**: Clearly labelled demo fixtures (`demo-` URLs) representing 5 realistic K-12 B2B sales posts, 13 raw comments (with intentional cross-post overlaps to demonstrate deduplication), and 12 candidate profiles (including non-K-12 control profiles to validate ranking discrimination).
- **Tier 2 — User-Supplied Data (`user_supplied_data`)**: Users can paste any LinkedIn post URL and attach exported comment records (JSON) for immediate compliant AI analysis.
- **Tier 3 — Optional Compliant Search API (`compliant_api_provider`)**: When `TAVILY_API_KEY` is configured, keyword queries discover public LinkedIn post URLs via Tavily's search index without touching LinkedIn's authenticated endpoints.

**Path to Production**: In production, Tier 1 is replaced by (a) LinkedIn Marketing / Community Management APIs with OAuth partner approval for owned/partner posts, or (b) a licensed B2B data provider (e.g., Proxycurl, Coresignal) for compliant profile enrichment.

## 3. AI/ML Method, Similarity Logic & Ranking Methodology

### Semantic Embedding Engine
- **Cloud Mode**: Uses OpenAI `text-embedding-3-small` or Google Gemini `text-embedding-004` when `OPENAI_API_KEY` or `GEMINI_API_KEY` is provided.
- **Built-in Hybrid Fallback**: When no external API key is set, `computeLocalHybridVectors()` builds L2-normalized TF-IDF vectors (unigrams + bigrams) augmented with a **K-12 Education Ontology** (`concept_school_leadership`, `concept_governance_ownership`, `concept_advisory_consulting`, `concept_multi_school_network`, `concept_edtech_b2b`, `concept_teacher_academic`) weighted at `2.2x`. This ensures domain synonyms like *"Former Principal"* and *"Group Director"* or *"Trustee"* and *"School Owner"* align semantically rather than relying on exact keyword matching.

### Relevance Scoring Formula
- **Original Commenters**:
  $$\text{Relevance} = 0.35 \cdot S_{\text{semantic}} + 0.30 \cdot S_{\text{ecosystem}} + 0.25 \cdot S_{\text{decision\_maker}} + 0.10 \cdot S_{\text{engagement}}$$
- **AI-Discovered Lookalikes**:
  $$\text{Relevance} = 0.30 \cdot S_{\text{semantic}} + 0.30 \cdot S_{\text{ecosystem}} + 0.20 \cdot S_{\text{decision\_maker}} + 0.20 \cdot S_{\text{seed\_affinity}}$$
- **Lookalike Seed Similarity**:
  $$\text{SeedSimilarity} = 0.55 \cdot (\cos(\mathbf{v}_{\text{cand}}, \mathbf{v}_{\text{seed}}) \times 100) + 0.45 \cdot S_{\text{attribute\_overlap}}$$

## 4. Privacy, Data Minimization & Retention
- **Minimization**: Only outreach-relevant professional metadata (name, LinkedIn URL, role, organisation, location, public comment text) is processed.
- **Stateless Execution**: No PII is persisted in a database; exports are generated on demand by the user.
- **Consent & Outreach**: Discovered prospects should be contacted through compliant LinkedIn InMail or opt-in B2B outreach channels.

