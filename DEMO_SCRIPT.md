# 5–10 Minute End-to-End Demo Script

1. **Introduction & Compliance Context (1 min)**:
   - Open the live deployed URL. Point out the **Data Provenance & Compliance Banner** clearly labelling the Curated Test Dataset and explaining why unauthorised LinkedIn scraping is avoided.
2. **Keyword Search Workflow — `"K12 B2B Sales"` (2 min)**:
   - Show Stage 1 (`"K12 B2B Sales"`), the 6-Stage Workflow Stepper, and Stage 2 (**5 Discovered Posts** with URLs, authors, dates, snippets).
3. **Deduplication & Commenter Analysis (2 min)**:
   - Open the **Original Commenters** tab. Highlight that 13 raw comments were deduplicated into 10 unique commenters (e.g., *Ananya Deshmukh*, *Meera Krishnan*, *Rajeshwar Iyer* each retain multiple source post URLs).
   - Expand **Score Breakdown & Skills** on a top commenter to show Semantic Similarity, Ecosystem Fit, Decision-Maker Proximity, and Engagement Depth.
4. **AI-Discovered Lookalikes & Seed Traceability (2 min)**:
   - Switch to **AI-Discovered Lookalikes**. Show strict separation from commenters, the matched **Seed Profile(s)**, similarity percentages, and why K-12 advisors/trustees rank at the top while generic FinTech/Higher-Ed profiles rank at the bottom.
5. **Direct LinkedIn Post URL + BYO-Data Mode (1.5 min)**:
   - Switch input mode to **LinkedIn Post URL**, click **+ Attach User-Exported Comments (JSON)**, and run the pipeline to demonstrate compliant processing of a user-supplied post URL.
6. **CLI & Export (1 min)**:
   - Click **Export CSV** and **Export JSON** to show separated `original_commenter` and `ai_lookalike` categories.
   - Optionally run `npm run cli -- --query "K12 B2B Sales"` in the terminal to show CLI parity.

