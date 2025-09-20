import { NextResponse } from "next/server";
import changelogData from "@/data/changelog.json";
import type { ChangelogEntry } from "@/components/ui/changelog-1";

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (envUrl) {
    const withProtocol = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    return withProtocol.replace(/\/+$/, '');
  }
  return "http://localhost:3000";
}

export async function GET() {
  const site = getSiteUrl();
  const entries = changelogData as ChangelogEntry[];

  const updated = entries[0] ? new Date(entries[0].date).toISOString() : new Date().toISOString();

  const feedEntries = entries
    .map((e) => {
      const updatedAt = new Date(e.date).toISOString();
      const link = `${site}/changelog#${encodeURIComponent(e.version)}`;
      const id = `${site}/releases/${encodeURIComponent(e.version)}`;
      const itemsList = (e.items || []).map((i) => `• ${i}`).join("\n");
      const content = `${e.description}${itemsList ? `\n\n${itemsList}` : ""}`;
      return `
  <entry>
    <title>${e.version}: ${e.title}</title>
    <id>${id}</id>
    <link href="${link}" />
    <updated>${updatedAt}</updated>
    <content type="html"><![CDATA[${content.replace(/&/g, "&amp;\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}]]></content>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ThesisFlow-AI Changelog</title>
  <id>${site}/changelog</id>
  <link href="${site}/changelog" />
  <updated>${updated}</updated>
  ${feedEntries}
</feed>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
    },
  });
}
