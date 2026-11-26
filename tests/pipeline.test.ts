import { describe, expect, it } from "vitest";
import { exportDiscoveryToCsv, exportDiscoveryToJson } from "../src/lib/exportUtils";
import { runDiscoveryPipeline } from "../src/lib/pipeline";

describe("EDXSO LinkedIn Engagement & Lookalike Discovery Pipeline", () => {
  it('discovers 5 posts for "K12 B2B Sales", deduplicates commenters, and separates lookalikes', async () => {
    const result = await runDiscoveryPipeline({
      mode: "keyword",
      query: "K12 B2B Sales",
    });

    expect(result.posts).toHaveLength(5);
    expect(result.dataSource).toBe("curated_test_dataset");
    expect(result.stats.duplicatesRemoved).toBeGreaterThan(0);
    expect(result.commenters.length).toBeLessThan(
      result.stats.rawCommentsExtracted
    );

    // Verify cross-post traceability on deduplicated commenters
    const multiPostCommenter = result.commenters.find(
      (c) => c.commentedPosts.length > 1
    );
    expect(multiPostCommenter).toBeDefined();
    expect(multiPostCommenter!.provenance.deduplicatedFromCount).toBeGreaterThan(1);

    // Verify strict separation between original commenters and lookalikes
    const commenterUrls = new Set(
      result.commenters.map((c) => c.linkedinProfileUrl.toLowerCase())
    );
    for (const lookalike of result.lookalikes) {
      expect(commenterUrls.has(lookalike.linkedinProfileUrl.toLowerCase())).toBe(
        false
      );
      expect(lookalike.category).toBe("ai_lookalike");
      expect(lookalike.matchedSeeds.length).toBeGreaterThan(0);
    }

    // Verify descending relevance ranking for both groups
    for (let i = 1; i < result.commenters.length; i++) {
      expect(result.commenters[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        result.commenters[i].relevanceScore
      );
    }
    for (let i = 1; i < result.lookalikes.length; i++) {
      expect(result.lookalikes[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        result.lookalikes[i].relevanceScore
      );
    }

    // Verify K-12 school ecosystem leaders outrank generic FinTech/Higher-Ed profiles
    const topLookalike = result.lookalikes[0];
    const fintechLookalike = result.lookalikes.find((l) =>
      l.linkedinProfileUrl.includes("fintech")
    );
    if (fintechLookalike) {
      expect(topLookalike.relevanceScore).toBeGreaterThan(
        fintechLookalike.relevanceScore
      );
    }
  });

  it("supports direct LinkedIn post URL mode with user-supplied comments", async () => {
    const result = await runDiscoveryPipeline({
      mode: "post_url",
      postUrl: "https://www.linkedin.com/posts/example-k12-post-123",
      userSuppliedComments: [
        {
          commenterName: "Test Principal",
          linkedinProfileUrl: "https://www.linkedin.com/in/test-principal-k12",
          currentRole: "Former Principal & School Advisor",
          organisation: "Test School Network",
          location: "Pune, India",
          commentText: "We advise 15 CBSE schools on B2B EdTech adoption.",
        },
      ],
    });

    expect(result.posts).toHaveLength(1);
    expect(result.dataSource).toBe("user_supplied_data");
    expect(result.commenters).toHaveLength(1);
    expect(result.commenters[0].name).toBe("Test Principal");
    expect(result.lookalikes.length).toBeGreaterThan(0);
  });

  it("exports both commenters and lookalikes in CSV and JSON formats", async () => {
    const result = await runDiscoveryPipeline({
      mode: "keyword",
      query: "K12 B2B Sales",
    });

    const csv = exportDiscoveryToCsv(result);
    expect(csv).toContain("original_commenter");
    expect(csv).toContain("ai_lookalike");

    const json = JSON.parse(exportDiscoveryToJson(result));
    expect(json.originalCommenters.length).toBe(result.commenters.length);
    expect(json.aiDiscoveredLookalikes.length).toBe(result.lookalikes.length);
  });
});

