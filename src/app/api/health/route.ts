import { NextResponse } from "next/server";
import { detectEmbeddingProvider } from "@/lib/semanticEngine";

export async function GET() {
  const provider = detectEmbeddingProvider();
  return NextResponse.json({
    status: "ok",
    service: "EDXSO LinkedIn Engagement & Lookalike Discovery Tool",
    aiEngine: provider,
    timestamp: new Date().toISOString(),
  });
}

