export type FloodFeedStatus = "REPORTED" | "WARNING" | "WATCH" | "UNVERIFIED";

export interface LiveFloodFeedItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  state: string;
  areas: string[];
  status: FloodFeedStatus;
  severity: number;
  channel: "news";
}

export interface LiveFloodFeedResult {
  generatedAt: string;
  items: LiveFloodFeedItem[];
  stateSummary: Array<{ state: string; count: number; highestSeverity: number; latestAt: string }>;
  sourceHealth: Array<{ source: string; ok: boolean }>;
}

type Jurisdiction = { state: string; aliases: string[] };
const UNPARSED = "Nigeria / location unparsed";

export const NIGERIA_JURISDICTIONS: Jurisdiction[] = [
  { state: "Abia", aliases: ["abia", "umuahia", "aba"] },
  { state: "Adamawa", aliases: ["adamawa", "yola", "mubi"] },
  { state: "Akwa Ibom", aliases: ["akwa ibom", "uyo", "eket"] },
  { state: "Anambra", aliases: ["anambra", "awka", "onitsha", "nnewi", "ogidi"] },
  { state: "Bauchi", aliases: ["bauchi"] },
  { state: "Bayelsa", aliases: ["bayelsa", "yenagoa"] },
  { state: "Benue", aliases: ["benue", "makurdi"] },
  { state: "Borno", aliases: ["borno", "maiduguri"] },
  { state: "Cross River", aliases: ["cross river", "calabar"] },
  { state: "Delta", aliases: ["delta state", "asaba", "warri", "ughelli"] },
  { state: "Ebonyi", aliases: ["ebonyi", "abakaliki"] },
  { state: "Edo", aliases: ["edo state", "benin city"] },
  { state: "Ekiti", aliases: ["ekiti", "ado ekiti", "ado-ekiti"] },
  { state: "Enugu", aliases: ["enugu", "nsukka"] },
  { state: "FCT", aliases: ["fct", "abuja", "maitama", "asokoro", "garki", "wuse", "wuse 2", "gudu", "lokogoma", "gaduwa", "lugbe", "kubwa", "jabi", "gwarinpa", "apo", "guzape", "nyanya", "kuje", "gwagwalada", "bwari"] },
  { state: "Gombe", aliases: ["gombe"] },
  { state: "Imo", aliases: ["imo state", "owerri"] },
  { state: "Jigawa", aliases: ["jigawa", "dutse"] },
  { state: "Kaduna", aliases: ["kaduna", "zaria", "kafanchan"] },
  { state: "Kano", aliases: ["kano"] },
  { state: "Katsina", aliases: ["katsina"] },
  { state: "Kebbi", aliases: ["kebbi", "birnin kebbi"] },
  { state: "Kogi", aliases: ["kogi", "lokoja", "okene"] },
  { state: "Kwara", aliases: ["kwara", "ilorin"] },
  { state: "Lagos", aliases: ["lagos", "ikeja", "lekki", "victoria island", "ikorodu", "epe", "ajah"] },
  { state: "Nasarawa", aliases: ["nasarawa", "lafia", "keffi", "mararaba"] },
  { state: "Niger", aliases: ["niger state", "minna", "suleja", "bida", "shiroro"] },
  { state: "Ogun", aliases: ["ogun", "abeokuta", "ijebu ode", "ota", "sagamu"] },
  { state: "Ondo", aliases: ["ondo state", "akure"] },
  { state: "Osun", aliases: ["osun", "osogbo", "ile-ife", "ile ife", "ilesa"] },
  { state: "Oyo", aliases: ["oyo state", "ibadan", "ogbomoso"] },
  { state: "Plateau", aliases: ["plateau", "jos"] },
  { state: "Rivers", aliases: ["rivers state", "port harcourt"] },
  { state: "Sokoto", aliases: ["sokoto"] },
  { state: "Taraba", aliases: ["taraba", "jalingo"] },
  { state: "Yobe", aliases: ["yobe", "damaturu", "potiskum"] },
  { state: "Zamfara", aliases: ["zamfara", "gusau"] },
];

const decodeHtml = (value: string) => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function cleanText(value: string) {
  return decodeHtml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function stableId(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `flood-${(hash >>> 0).toString(16)}`;
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function aliasAppears(text: string, alias: string) {
  const escaped = escapeRegExp(alias.toLowerCase()).replace(/[-\s]+/g, "[-\\s]+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function extractLocations(text: string) {
  const lower = text.toLowerCase();
  const hits: Array<{ state: string; alias: string }> = [];
  for (const entry of NIGERIA_JURISDICTIONS) {
    for (const alias of entry.aliases) if (aliasAppears(lower, alias)) hits.push({ state: entry.state, alias });
  }
  if (!hits.length) return { state: UNPARSED, areas: [] as string[] };
  hits.sort((a, b) => b.alias.length - a.alias.length);
  const state = hits[0].state;
  const areas = hits.filter((hit) => hit.state === state).map((hit) => hit.alias)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 4).map((area) => area.replace(/\b\w/g, (c) => c.toUpperCase()));
  return { state, areas };
}

function classify(title: string): { status: FloodFeedStatus; severity: number } {
  const value = title.toLowerCase();
  const severe = ["sweeps", "swept", "submerge", "submerged", "submerges", "washed away", "cars floating", "vehicles floating", "trapped", "displaced", "drowned", "collapse", "rescue"]
    .some((word) => value.includes(word));
  if (severe) return { status: "REPORTED", severity: 4 };
  const occurred = ["floods", "flooded", "flooding", "flash flood", "inundated", "overflowed", "flood hits", "flood ravages"]
    .some((word) => value.includes(word));
  if (occurred) return { status: "REPORTED", severity: 3 };
  if (["warning", "alert", "evacuate", "expected to flood", "flood risk", "high risk"].some((word) => value.includes(word))) return { status: "WARNING", severity: 2 };
  if (["rain", "rainfall", "downpour", "storm", "forecast"].some((word) => value.includes(word))) return { status: "WATCH", severity: 1 };
  return { status: "UNVERIFIED", severity: 0 };
}

function parseDate(value: string | undefined) {
  if (!value) return new Date(0).toISOString();
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const parsed = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function isNigeriaItem(item: LiveFloodFeedItem) {
  return item.state !== UNPARSED || /\bnigeria(?:n)?\b/i.test(item.title);
}

async function fetchGdelt(): Promise<LiveFloodFeedItem[]> {
  const query = encodeURIComponent('(flood OR flooding OR "flash flood" OR inundation) Nigeria');
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=100&format=json&timespan=2d&sort=HybridRel`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const data = await response.json();
  return (Array.isArray(data?.articles) ? data.articles : []).map((article: any) => {
    const title = cleanText(String(article?.title ?? ""));
    const url = String(article?.url ?? "");
    const location = extractLocations(title);
    const risk = classify(title);
    return { id: stableId(`${title}|${url}`), title, url, source: String(article?.domain ?? "GDELT").replace(/^www\./, ""), publishedAt: parseDate(article?.seendate), state: location.state, areas: location.areas, status: risk.status, severity: risk.severity, channel: "news" as const };
  }).filter((item: LiveFloodFeedItem) => item.title && item.url && /flood|inundat/i.test(item.title) && isNigeriaItem(item));
}

function readXmlTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

async function fetchGoogleNews(query: string): Promise<LiveFloodFeedItem[]> {
  const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-NG&gl=NG&ceid=NG:en`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Google News ${response.status}`);
  const xml = await response.text();
  const chunks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return chunks.map((chunk) => {
    const title = readXmlTag(chunk, "title");
    const link = readXmlTag(chunk, "link");
    const sourceMatch = chunk.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i);
    const location = extractLocations(title);
    const risk = classify(title);
    return { id: stableId(`${title}|${link}`), title, url: link, source: sourceMatch ? cleanText(sourceMatch[1]) : "Google News", publishedAt: parseDate(readXmlTag(chunk, "pubDate")), state: location.state, areas: location.areas, status: risk.status, severity: risk.severity, channel: "news" as const };
  }).filter((item) => item.title && item.url && /flood|inundat/i.test(item.title) && isNigeriaItem(item));
}

export async function fetchLiveFloodFeed(): Promise<LiveFloodFeedResult> {
  const sourceJobs: Array<{ source: string; run: () => Promise<LiveFloodFeedItem[]> }> = [
    { source: "GDELT", run: fetchGdelt },
    { source: "Google News", run: () => fetchGoogleNews('(flood OR flooding OR "flash flood") Nigeria when:2d') },
    { source: "Vanguard", run: () => fetchGoogleNews('site:vanguardngr.com (flood OR flooding) Nigeria when:3d') },
    { source: "Guardian Nigeria", run: () => fetchGoogleNews('site:guardian.ng (flood OR flooding) Nigeria when:3d') },
    { source: "Daily Trust", run: () => fetchGoogleNews('site:dailytrust.com (flood OR flooding) Nigeria when:3d') },
    { source: "TheCable", run: () => fetchGoogleNews('site:thecable.ng (flood OR flooding) Nigeria when:3d') },
  ];
  const settled = await Promise.allSettled(sourceJobs.map((job) => job.run()));
  const sourceHealth = settled.map((result, index) => ({ source: sourceJobs[index].source, ok: result.status === "fulfilled" }));
  const combined = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const deduped = new Map<string, LiveFloodFeedItem>();
  for (const item of combined) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const current = deduped.get(key);
    if (!current || item.severity > current.severity || new Date(item.publishedAt) > new Date(current.publishedAt)) deduped.set(key, item);
  }
  const items = Array.from(deduped.values()).filter((item) => item.status !== "UNVERIFIED")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 150);
  const summary = new Map<string, { count: number; highestSeverity: number; latestAt: string }>();
  for (const item of items) {
    const current = summary.get(item.state) ?? { count: 0, highestSeverity: 0, latestAt: item.publishedAt };
    current.count += 1; current.highestSeverity = Math.max(current.highestSeverity, item.severity);
    if (new Date(item.publishedAt) > new Date(current.latestAt)) current.latestAt = item.publishedAt;
    summary.set(item.state, current);
  }
  return { generatedAt: new Date().toISOString(), items, stateSummary: Array.from(summary.entries()).map(([state, value]) => ({ state, ...value })).sort((a, b) => b.highestSeverity - a.highestSeverity || b.count - a.count), sourceHealth };
}
