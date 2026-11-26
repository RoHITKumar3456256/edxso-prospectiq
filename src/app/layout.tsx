import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDXSO ProspectLens | LinkedIn Engagement & Lookalike Discovery",
  description:
    "AI-powered application for discovering K-12 school ecosystem commenters and lookalike prospects with semantic ranking and full source traceability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}

