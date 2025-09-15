import { NextResponse } from "next/server";
import changelogData from "@/data/changelog.json";
import type { ChangelogEntry } from "@/components/ui/changelog-1";

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (envUrl) {
    // Ensure it has protocol
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }
  return "http://localhost:3000";
}

export async function GET() {
  const site = getSiteUrl();
  const entries = changelogData as ChangelogEntry[];

  const rssItems = entries
    .map((e) => {
      const pubDate = new Date(e.date).toUTCString();
      const link = `${site}/changelog#${encodeURIComponent(e.version)}`;
      const itemsList = (e.items || []).map((i) => `• ${i}`).join("\n");
      const description = `${e.description}${itemsList ? `\n\n${itemsList}` : ""}`;
      return `
        <item>
          <title><![CDATA[${e.version}: ${e.title}]]></title>
          <link>${link}</link>
          <guid>${link}</guid>
          <pubDate>${pubDate}</pubDate>
          <description><![CDATA[${description}]]></description>
        </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>ThesisFlow-AI Changelog</title>
    <link>${site}/changelog</link>
    <description>Latest releases and improvements for ThesisFlow-AI</description>
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
    },
  });
}
