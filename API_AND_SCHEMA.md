# API & Database Schema Documentation

## 1. REST API Reference

Base URL: `https://<your-deployed-domain>` (or `http://localhost:3000` locally)

### `POST /api/discover`
Executes the full 6-stage LinkedIn Engagement & Lookalike Discovery pipeline.

**Request Body (`application/json`)**:
```json
{
  "mode": "keyword",
  "query": "K12 B2B Sales",
  "maxPosts": 5,
  "maxLookalikes": 10
}
```
Or **Direct LinkedIn Post URL Mode** (with optional BYO exported comments):
```json
{
  "mode": "post_url",
  "postUrl": "https://www.linkedin.com/posts/demo-rohit-mehta-edtech_k12-b2b-sales-school-procurement-01",
  "userSuppliedComments": [
    {
      "commenterName": "Arundhati Menon",
      "linkedinProfileUrl": "https://www.linkedin.com/in/arundhati-menon-k12",
      "currentRole": "Former Principal & School Advisor",
      "organisation": "EduTrust Advisory",
      "location": "Bengaluru, India",
      "commentText": "Principals in our network value peer-validated EdTech."
    }
  ]
}
```

**Response (`200 OK`)**:
Returns a `DiscoveryResponse` containing:
- `runId`, `timestamp`, `dataSource`, `complianceNotice`, `aiEngine`
- `stages[]`: Execution status and duration for all 6 pipeline stages
- `posts[]`: Discovered posts (`url`, `authorName`, `publishedDate`, `snippet`)
- `commenters[]`: Deduplicated & ranked `original_commenter` records with `commentedPosts[]` traceability
- `lookalikes[]`: Strictly separated `ai_lookalike` records with `matchedSeeds[]` evidence
- `stats`: Summary counts and average relevance scores

**Error Responses**:
- `400 Bad Request`: Zod validation failure (e.g., missing `query` in `keyword` mode or invalid URL).
- `500 Internal Server Error`: Unexpected pipeline failure.

---

### `GET /api/discover`
Quick evaluation endpoint.
- Query params: `?query=K12+B2B+Sales` or `?postUrl=https://...`

### `GET /api/health`
Returns service status, active AI embedding mode, and server timestamp.

---

## 2. Database Schema

The full PostgreSQL + `pgvector` DDL is provided in [`db/schema.sql`](./db/schema.sql).

```
discovery_runs (1) ──────< (N) discovered_posts
      │                              │
      │                              ▼
      ├──────< (N) post_engagements >── (1) prospect_profiles
      │                                        ▲
      └──────< (N) lookalike_matches ──────────┘ (candidate_profile_id & seed_profile_id)
```

### Key Integrity & Compliance Guarantees
- **Cross-Post Deduplication**: `prospect_profiles.linkedin_profile_url_norm` has a `UNIQUE` constraint so a professional commenting on multiple posts is stored once and linked via `post_engagements`.
- **Strict Separation**: `original_commenter` records live in `post_engagements`, while `ai_lookalike` records live in `lookalike_matches` with `chk_distinct_seed_candidate`.
- **Data Retention**: `discovery_runs.expires_at` enforces a 90-day TTL for PII minimization.

