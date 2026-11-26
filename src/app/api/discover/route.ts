import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runDiscoveryPipeline } from "@/lib/pipeline";

const SuppliedCommentSchema = z.object({
  commenterName: z.string().min(1),
  linkedinProfileUrl: z.string().url(),
  currentRole: z.string().optional(),
  organisation: z.string().optional(),
  location: z.string().optional(),
  headline: z.string().optional(),
  commentText: z.string().min(1),
  commentDate: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

const DiscoveryRequestSchema = z
  .object({
    mode: z.enum(["keyword", "post_url"]),
    query: z.string().optional(),
    postUrl: z.string().optional(),
    userSuppliedComments: z.array(SuppliedCommentSchema).optional(),
    maxPosts: z.number().int().min(1).max(10).optional(),
    maxLookalikes: z.number().int().min(1).max(25).optional(),
  })
  .refine(
    (data) =>
      (data.mode === "keyword" && Boolean(data.query?.trim())) ||
      (data.mode === "post_url" && Boolean(data.postUrl?.trim())),
    {
      message:
        "Provide a non-empty 'query' for keyword mode or a 'postUrl' for post_url mode.",
    }
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DiscoveryRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid discovery request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await runDiscoveryPipeline(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Discovery API error:", err);
    return NextResponse.json(
      { error: "Internal server error while running discovery pipeline." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postUrl = searchParams.get("postUrl") || undefined;
  const query = searchParams.get("query") || "K12 B2B Sales";

  const result = await runDiscoveryPipeline({
    mode: postUrl ? "post_url" : "keyword",
    query: postUrl ? undefined : query,
    postUrl,
  });

  return NextResponse.json(result, { status: 200 });
}

