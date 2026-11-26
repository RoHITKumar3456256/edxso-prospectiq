#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { exportDiscoveryToCsv, exportDiscoveryToJson } from "../lib/exportUtils";
import { runDiscoveryPipeline } from "../lib/pipeline";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const postUrl = args.url;
  const query = args.query || (!postUrl ? "K12 B2B Sales" : undefined);
  const format = (args.format || "summary").toLowerCase();
  const outPath = args.out;

  const result = await runDiscoveryPipeline({
    mode: postUrl ? "post_url" : "keyword",
    query,
    postUrl,
  });

  if (outPath) {
    const absPath = resolve(process.cwd(), outPath);
    const content =
      format === "csv"
        ? exportDiscoveryToCsv(result)
        : exportDiscoveryToJson(result);
    writeFileSync(absPath, content, "utf-8");
    console.log(`Exported ${format.toUpperCase()} results to: ${absPath}`);
  }

  if (format === "json" && !outPath) {
    console.log(exportDiscoveryToJson(result));
    return;
  }
  if (format === "csv" && !outPath) {
    console.log(exportDiscoveryToCsv(result));
    return;
  }

  console.log("\n=== EDXSO LinkedIn Engagement & Lookalike Discovery CLI ===");
  console.log(`Run ID      : ${result.runId}`);
  console.log(`Input       : ${result.input.mode === "keyword" ? `Keyword "${result.input.query}"` : `URL ${result.input.postUrl}`}`);
  console.log(`Data Source : ${result.dataSource}`);
  console.log(`AI Engine   : ${result.aiEngine.mode} (${result.aiEngine.embeddingModel})`);
  console.log(`Notice      : ${result.complianceNotice}\n`);

  console.log(`Posts Discovered (${result.posts.length}):`);
  result.posts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.publishedDate}] ${p.authorName} -> ${p.url}`);
  });

  console.log(`\nOriginal Commenters (${result.commenters.length} unique, ${result.stats.duplicatesRemoved} duplicates merged):`);
  result.commenters.forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${c.name} | Score: ${c.relevanceScore}/100 | ${c.targetPersona} | ${c.linkedinProfileUrl}`
    );
  });

  console.log(`\nAI-Discovered Lookalikes (${result.lookalikes.length}):`);
  result.lookalikes.forEach((l, i) => {
    const topSeed = l.matchedSeeds[0];
    console.log(
      `  ${i + 1}. ${l.name} | Relevance: ${l.relevanceScore}/100 | Similarity: ${l.similarityScore}% (Seed: ${topSeed?.seedCommenterName || "N/A"}) | ${l.linkedinProfileUrl}`
    );
  });
  console.log("");
}

main().catch((err) => {
  console.error("CLI execution failed:", err);
  process.exit(1);
});

