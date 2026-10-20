const FEED_URL = "https://feeds.acast.com/public/shows/tabaghe16";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";

function toFa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => faDigits[Number(digit)]);
}

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

function plainText(value: string) {
  return decodeXml(value)
    .replace(/<hr[\s\S]*$/i, "")
    .replace(/حامیان این قسمت:[\s\S]*$/i, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitle(rawTitle: string) {
  const number = rawTitle.match(/\bEP\s*(\d+)/i)?.[1] ?? "—";
  const cleaned = rawTitle.replace(/^EP\s*\d+\s*[-–—:]?\s*/i, "").trim();
  const parts = cleaned.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return { number: toFa(number), guest: parts[0], title: parts.slice(1).join(" | ") };
  }
  return { number: toFa(number), guest: "طبقه ۱۶", title: cleaned };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function GET() {
  try {
    const response = await fetch(FEED_URL, {
      headers: { "user-agent": "Tabaghe16PersonalNotes/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);

    const xml = await response.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
    const episodes = items.map((match, index) => {
      const item = match[1];
      const rawTitle = tag(item, "title");
      const parsed = parseTitle(rawTitle);
      const audioUrl = item.match(/<enclosure[^>]+url="([^"]+)"/i)?.[1] ?? "";
      const guid = plainText(tag(item, "guid")) || `episode-${index}`;
      const description = plainText(tag(item, "description"));

      return {
        id: guid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(-80),
        number: parsed.number,
        title: parsed.title,
        guest: parsed.guest,
        topic: "کسب‌وکار، فناوری و زندگی",
        publishedAt: formatDate(tag(item, "pubDate")),
        duration: toFa(tag(item, "itunes:duration")),
        audioUrl,
        description:
          description.length > 390 ? `${description.slice(0, 387).trim()}…` : description,
      };
    }).filter((episode) => episode.audioUrl);

    return Response.json(
      { episodes },
      { headers: { "cache-control": "public, max-age=900, s-maxage=3600" } },
    );
  } catch {
    return Response.json(
      { error: "دریافت فهرست اپیزودها در حال حاضر ممکن نیست." },
      { status: 502 },
    );
  }
}
