import { DiscoveryResponse } from "@/types/discovery";

export const ALL_EXPORT_COLUMNS = [
  { key: "category", label: "Category (Commenter vs Lookalike)" },
  { key: "rank", label: "Rank" },
  { key: "name", label: "Full Name" },
  { key: "linkedin_profile_url", label: "LinkedIn Profile URL" },
  { key: "current_role", label: "Current Role" },
  { key: "organisation", label: "Organisation" },
  { key: "location", label: "Location" },
  { key: "target_persona", label: "Target Persona" },
  { key: "relevance_score", label: "Relevance Score" },
  { key: "similarity_score", label: "Similarity Score" },
  { key: "school_ecosystem_indicators", label: "School Ecosystem Indicators" },
  { key: "source_post_urls_or_seed_profiles", label: "Traceability (Post URLs / Seed Profiles)" },
  { key: "ai_explanation", label: "AI Analysis Explanation" },
  { key: "data_source", label: "Data Source" },
] as const;

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports both Original Commenters and AI-Discovered Lookalikes into a single
 * traceable CSV with an explicit `category` column distinguishing the two groups.
 */
export function exportDiscoveryToCsv(
  result: DiscoveryResponse,
  selectedColumns?: string[]
): string {
  const activeCols =
    selectedColumns && selectedColumns.length > 0
      ? selectedColumns
      : ALL_EXPORT_COLUMNS.map((c) => c.key);

  const buildRowMap = (record: Record<string, string>) =>
    activeCols.map((col) => escapeCsvCell(record[col] ?? ""));

  const rows: string[][] = [];

  result.commenters.forEach((c, idx) => {
    rows.push(
      buildRowMap({
        category: "original_commenter",
        rank: String(idx + 1),
        name: c.name,
        linkedin_profile_url: c.linkedinProfileUrl,
        current_role: c.currentRole,
        organisation: c.organisation,
        location: c.location,
        target_persona: c.targetPersona,
        relevance_score: String(c.relevanceScore),
        similarity_score: "N/A (Seed)",
        school_ecosystem_indicators: c.schoolEcosystemIndicators.join(" | "),
        source_post_urls_or_seed_profiles: c.commentedPosts
          .map((p) => p.postUrl)
          .join(" | "),
        ai_explanation: c.aiExplanation,
        data_source: c.provenance.dataSource,
      })
    );
  });

  result.lookalikes.forEach((l, idx) => {
    rows.push(
      buildRowMap({
        category: "ai_lookalike",
        rank: String(idx + 1),
        name: l.name,
        linkedin_profile_url: l.linkedinProfileUrl,
        current_role: l.currentRole,
        organisation: l.organisation,
        location: l.location,
        target_persona: l.targetPersona,
        relevance_score: String(l.relevanceScore),
        similarity_score: String(l.similarityScore),
        school_ecosystem_indicators: l.schoolEcosystemIndicators.join(" | "),
        source_post_urls_or_seed_profiles: l.matchedSeeds
          .map(
            (s) =>
              `${s.seedCommenterName} (${s.similarityScore}% - ${s.seedLinkedinUrl})`
          )
          .join(" | "),
        ai_explanation: l.aiExplanation,
        data_source: l.provenance.dataSource,
      })
    );
  });

  return [
    activeCols.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");
}

export function exportDiscoveryToJson(result: DiscoveryResponse): string {
  return JSON.stringify(
    {
      exportMetadata: {
        runId: result.runId,
        timestamp: result.timestamp,
        input: result.input,
        dataSource: result.dataSource,
        complianceNotice: result.complianceNotice,
        aiEngine: result.aiEngine,
      },
      discoveredPosts: result.posts,
      originalCommenters: result.commenters,
      aiDiscoveredLookalikes: result.lookalikes,
    },
    null,
    2
  );
}
