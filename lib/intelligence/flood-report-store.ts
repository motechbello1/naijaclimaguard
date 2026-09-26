import { prisma } from "@/lib/db";
import type { LiveFloodFeedItem } from "@/lib/intelligence/live-flood-feed";
import { aiEnabled } from "@/lib/floodpass/ai/provider";
import { applyReading, readHeadlines, storedReading, type NewsReading } from "@/lib/floodpass/ai/news-reader";

/**
 * Saves news items. With readWithAi (the scheduled scan only, never a public
 * page load) the AI News Reader reads up to 40 headlines it has not read yet.
 * Earlier AI readings are always re-applied, so a keyword guess never undoes
 * a confident AI correction. Items passed in are corrected in place.
 */
export async function persistFloodReports(items: LiveFloodFeedItem[]): Promise<number>;
export async function persistFloodReports(items: LiveFloodFeedItem[], options: { readWithAi: true }): Promise<{ stored: number; aiRead: number }>;
export async function persistFloodReports(items: LiveFloodFeedItem[], options: { readWithAi?: boolean } = {}): Promise<number | { stored: number; aiRead: number }> {
  const recent = items.slice(0, 100);
  let stored = 0;

  const readings = new Map<string, NewsReading>();
  const existing = await prisma.externalFloodReport
    .findMany({ where: { id: { in: recent.map((item) => item.id) } }, select: { id: true, metadata: true } })
    .catch(() => []);
  for (const row of existing) {
    const reading = storedReading(row.metadata);
    if (reading) readings.set(row.id, reading);
  }
  let aiRead = 0;
  if (options.readWithAi && aiEnabled()) {
    const unread = recent.filter((item) => !readings.has(item.id)).slice(0, 40);
    for (let i = 0; i < unread.length; i += 20) {
      const batch = unread.slice(i, i + 20);
      const results = await readHeadlines(batch.map((item) => item.title)).catch(() => []);
      results.forEach((reading, index) => {
        if (reading) { readings.set(batch[index].id, reading); aiRead += 1; }
      });
    }
  }
  for (const item of recent) {
    const reading = readings.get(item.id);
    if (reading) Object.assign(item, applyReading(item, reading));
  }
  const meta = (item: LiveFloodFeedItem) => ({
    ingestion: "live-flood-feed-v2",
    states: item.states ?? [item.state],
    ...(readings.has(item.id) ? { ai: readings.get(item.id) } : {}),
  });

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
        metadata: meta(item),
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
        metadata: meta(item),
      },
    })));
    stored += settled.filter((result) => result.status === "fulfilled").length;
  }
  if (options.readWithAi) return { stored, aiRead };
  return stored;
}

export async function loadArchivedFloodReports(days = 14, limit = 250): Promise<LiveFloodFeedItem[]> {
  const cutoff = new Date(Date.now() - Math.max(1, Math.min(days, 90)) * 86_400_000);
  const rows = await prisma.externalFloodReport.findMany({
    // UNVERIFIED rows are headlines the AI found to be foreign or not about a flood.
    where: { publishedAt: { gte: cutoff }, status: { not: "UNVERIFIED" } },
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
  for (const item of [...archived, ...fresh].filter((entry) => entry.status !== "UNVERIFIED")) {
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
