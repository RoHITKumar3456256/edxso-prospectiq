# EDXSO ProspectLens — LinkedIn Engagement & Lookalike Profile Discovery Tool

An AI-powered full-stack application built for **EDXSO** to discover relevant decision-makers and ecosystem connectors in the K-12 school education sector, starting from a search phrase (e.g., `"K12 B2B Sales"`) or a direct LinkedIn post URL.

## Key Capabilities

1. **Dual Input Modes (UI & CLI)**:
   - **Keyword / Phrase Search**: Discovers 5 recent, relevant LinkedIn posts.
   - **Direct LinkedIn Post URL**: Processes a user-supplied post URL directly, with optional **User-Exported Comments (JSON)** import for compliant BYO-data analysis.
2. **Cross-Post Commenter Extraction & Deduplication**:
   - Deduplicates commenters across multiple posts by normalized LinkedIn profile URL while retaining every source post URL and comment snippet for full traceability.
3. **AI Profile Analysis & Persona Classification**:
   - Classifies prospects into EDXSO target personas (School Consultants/Advisors, Former Principals/Directors/Owners/Trustees, Education Entrepreneurs, Multi-School Professionals, School Decision-Maker Connectors).
   - Computes a transparent, multi-factor **Relevance Score (0–100)** with human-readable AI explanations.
4. **AI Lookalike Profile Discovery**:
   - Uses high-fit commenters as **Seed Profiles** to discover similar professionals using semantic embeddings (cosine similarity) + structured attribute overlap (role, seniority, skills, school-network reach).
   - Strictly separates **Original Commenters** from **AI-Discovered Lookalikes** and records seed match evidence for every lookalike.
5. **Compliant Data Handling & Export**:
   - Never scrapes LinkedIn or bypasses authentication/CAPTCHA/rate limits.
   - Clearly labels the **Curated Test Dataset** (`curated_test_dataset`) so demo fixtures are never misrepresented as live LinkedIn data.
   - One-click **CSV** and **JSON** export with separated categories and full provenance.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Validation**: Zod
- **AI / Semantic Engine**: OpenAI (`text-embedding-3-small`) / Gemini (`text-embedding-004`) when configured, with a built-in deterministic **Hybrid K-12 Ontology + TF-IDF Cosine Similarity Engine** fallback so the app runs 100% out-of-the-box with zero external API keys.
- **Testing**: Vitest

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure API keys in .env
cp .env.example .env

# 3. Run unit & integration tests
npm test

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## CLI Usage

Run the exact same 6-stage pipeline from the command line:

```bash
# Keyword search (default: "K12 B2B Sales")
npm run cli -- --query "K12 B2B Sales"

# Export directly to CSV or JSON
npm run cli -- --query "K12 B2B Sales" --format csv --out prospects.csv
npm run cli -- --query "K12 B2B Sales" --format json --out prospects.json

# Direct LinkedIn Post URL
npm run cli -- --url "https://www.linkedin.com/posts/demo-rohit-mehta-edtech_k12-b2b-sales-school-procurement-01"
```

## API Endpoints

- `POST /api/discover`: Accepts `{ mode: "keyword" | "post_url", query?, postUrl?, userSuppliedComments? }` and returns the full 6-stage `DiscoveryResponse`.
- `GET /api/discover?query=K12+B2B+Sales`: Convenience endpoint for quick evaluation.
- `GET /api/health`: Service & AI engine health check.

## Deployment (Vercel / Render / Docker)

The application is stateless and ready for 1-click deployment on **Vercel** or **Render**:
1. Push this repository to GitHub.
2. Import the repository in Vercel (Framework Preset: **Next.js**).
3. Optionally add `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `TAVILY_API_KEY` in Environment Variables (works out-of-the-box without them using the built-in semantic engine and curated test dataset).
4. Deploy — the live URL serves both the interactive UI and `/api/discover`.

## Documentation

- [TECHNICAL_NOTE.md](./TECHNICAL_NOTE.md) — Architecture, data retrieval approach, AI/ML similarity & ranking methodology, limitations, and privacy/retention policy.
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — 5–10 minute end-to-end demonstration walkthrough.

