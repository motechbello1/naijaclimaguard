import { prisma } from "@/lib/db";
import type { LiveFloodFeedItem } from "@/lib/intelligence/live-flood-feed";

export async function persistFloodReports(items: LiveFloodFeedItem[]) {
  const recent = items.slice(0, 100);
  let stored = 0;

  // Small chunks avoid exhausting the database connection pool in serverless
  // environments while keeping ingestion idempotent.
  for (let i = 0; i < recent.length; i += 10) {
    const chunk = recent.slice(i, i + 10);
    const settled = await Promise.allSettled(chunk.map((item) => prisma.externalFloodReport.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.publishedAt),
        state: item.state,
        areas: item.areas,
        status: item.status,
        severity: item.severity,
        channel: item.channel,
        metadata: { ingestion: "live-flood-feed-v1" },
      },
      update: {
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.publishedAt),
        state: item.state,
        areas: item.areas,
        status: item.status,
        severity: item.severity,
        channel: item.channel,
      },
    })));
    stored += settled.filter((result) => result.status === "fulfilled").length;
  }
  return stored;
}

export async function loadArchivedFloodReports(days = 14, limit = 250): Promise<LiveFloodFeedItem[]> {
  const cutoff = new Date(Date.now() - Math.max(1, Math.min(days, 90)) * 86_400_000);
  const rows = await prisma.externalFloodReport.findMany({
    where: { publishedAt: { gte: cutoff } },
    orderBy: { publishedAt: "desc" },
    take: Math.max(1, Math.min(limit, 500)),
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    publishedAt: row.publishedAt.toISOString(),
    state: row.state || "Nigeria / location unparsed",
    areas: Array.isArray(row.areas) ? row.areas.filter((value): value is string => typeof value === "string") : [],
    status: row.status as LiveFloodFeedItem["status"],
    severity: row.severity,
    channel: "news",
  }));
}

export function mergeFloodReports(fresh: LiveFloodFeedItem[], archived: LiveFloodFeedItem[]) {
  const merged = new Map<string, LiveFloodFeedItem>();
  for (const item of [...archived, ...fresh]) {
    const current = merged.get(item.id);
    if (!current || new Date(item.publishedAt) >= new Date(current.publishedAt)) merged.set(item.id, item);
  }
  return Array.from(merged.values()).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function summarizeFloodReports(items: LiveFloodFeedItem[]) {
  const summary = new Map<string, { count: number; highestSeverity: number; latestAt: string }>();
  for (const item of items) {
    const current = summary.get(item.state) ?? { count: 0, highestSeverity: 0, latestAt: item.publishedAt };
    current.count += 1;
    current.highestSeverity = Math.max(current.highestSeverity, item.severity);
    if (new Date(item.publishedAt) > new Date(current.latestAt)) current.latestAt = item.publishedAt;
    summary.set(item.state, current);
  }
  return Array.from(summary.entries())
    .map(([state, value]) => ({ state, ...value }))
    .sort((a, b) => b.highestSeverity - a.highestSeverity || b.count - a.count);
}
