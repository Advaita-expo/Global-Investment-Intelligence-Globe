const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "data", "live-investment-intel.json");
const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";
const WORLD_BANK_NEWS_API = "https://search.worldbank.org/api/v2/news";
const ENABLE_GDELT = process.env.ENABLE_GDELT === "true";

const QUERY = "investment";
const RELEVANCE_RE = /investment|invests?|funding|financing|stake|acquisition|FDI|sovereign|data center|semiconductor|battery|infrastructure|private equity|portfolio|crypto|critical minerals|development finance/i;
const OFFICIAL_FINANCE_RE = /approved|financing|loan|grant|investment|program|project|mobiliz|private capital|infrastructure|energy|digital|water|transport|finance|resilience|recovery/i;

const COUNTRIES = [
  { id: "usa", name: "USA", lat: 38.9, lng: -77.04, aliases: ["United States", "U.S.", "US", "USA", "America"] },
  { id: "canada", name: "Canada", lat: 45.42, lng: -75.69, aliases: ["Canada", "Canadian"] },
  { id: "mexico", name: "Mexico", lat: 19.43, lng: -99.13, aliases: ["Mexico", "Mexican"] },
  { id: "uk", name: "United Kingdom", lat: 51.5, lng: -0.13, aliases: ["United Kingdom", "UK", "Britain", "British", "England"] },
  { id: "europe", name: "Europe", lat: 50.1, lng: 10.4, aliases: ["Europe", "European Union", "EU"] },
  { id: "india", name: "India", lat: 28.61, lng: 77.21, aliases: ["India", "Indian"] },
  { id: "china", name: "China", lat: 39.9, lng: 116.4, aliases: ["China", "Chinese"] },
  { id: "russia", name: "Russia", lat: 55.75, lng: 37.62, aliases: ["Russia", "Russian"] },
  { id: "australia", name: "Australia", lat: -33.87, lng: 151.21, aliases: ["Australia", "Australian"] },
  { id: "japan", name: "Japan", lat: 35.68, lng: 139.65, aliases: ["Japan", "Japanese"] },
  { id: "southkorea", name: "South Korea", lat: 37.56, lng: 126.98, aliases: ["South Korea", "Korea", "Korean"] },
  { id: "taiwan", name: "Taiwan", lat: 25.03, lng: 121.56, aliases: ["Taiwan", "Taiwanese"] },
  { id: "singapore", name: "Singapore", lat: 1.35, lng: 103.82, aliases: ["Singapore", "Singaporean"] },
  { id: "indonesia", name: "Indonesia", lat: -6.21, lng: 106.85, aliases: ["Indonesia", "Indonesian"] },
  { id: "vietnam", name: "Vietnam", lat: 21.03, lng: 105.85, aliases: ["Vietnam", "Vietnamese"] },
  { id: "uae", name: "UAE", lat: 24.45, lng: 54.38, aliases: ["UAE", "United Arab Emirates", "Abu Dhabi", "Dubai", "Emirati"] },
  { id: "saudi", name: "Saudi Arabia", lat: 24.71, lng: 46.67, aliases: ["Saudi Arabia", "Saudi", "Riyadh"] },
  { id: "qatar", name: "Qatar", lat: 25.29, lng: 51.53, aliases: ["Qatar", "Qatari", "Doha"] },
  { id: "africa", name: "Africa", lat: 1.5, lng: 20.0, aliases: ["Africa", "African"] },
  { id: "southafrica", name: "South Africa", lat: -29.0, lng: 24.0, aliases: ["South Africa", "South African"] },
  { id: "egypt", name: "Egypt", lat: 30.04, lng: 31.24, aliases: ["Egypt", "Egyptian"] },
  { id: "nigeria", name: "Nigeria", lat: 9.08, lng: 8.68, aliases: ["Nigeria", "Nigerian"] },
  { id: "kenya", name: "Kenya", lat: -1.29, lng: 36.82, aliases: ["Kenya", "Kenyan"] },
  { id: "angola", name: "Angola", lat: -8.84, lng: 13.23, aliases: ["Angola", "Angolan", "Lobito"] },
  { id: "brazil", name: "Brazil", lat: -15.79, lng: -47.88, aliases: ["Brazil", "Brazilian"] },
  { id: "middleeast", name: "Middle East", lat: 29.3, lng: 47.9, aliases: ["Middle East", "Mideast"] },
  { id: "brics", name: "BRICS", lat: 1.0, lng: 45.0, aliases: ["BRICS", "New Development Bank"] }
];

const EXTRA_LOCATIONS = {
  "Morocco": { lat: 34.02, lng: -6.84 },
  "Kyrgyz Republic": { lat: 42.87, lng: 74.59 },
  "Solomon Islands": { lat: -9.43, lng: 160.0 },
  "Bangladesh": { lat: 23.81, lng: 90.41 },
  "Uzbekistan": { lat: 41.31, lng: 69.24 },
  "Kazakhstan": { lat: 51.16, lng: 71.47 },
  "Pakistan": { lat: 30.4, lng: 69.3 },
  "Sri Lanka": { lat: 6.93, lng: 79.86 },
  "Philippines": { lat: 14.6, lng: 120.98 },
  "Thailand": { lat: 13.75, lng: 100.5 },
  "Malaysia": { lat: 3.14, lng: 101.69 },
  "Cambodia": { lat: 11.56, lng: 104.93 },
  "Laos": { lat: 17.97, lng: 102.6 },
  "Iraq": { lat: 33.31, lng: 44.36 },
  "Jordan": { lat: 31.95, lng: 35.93 },
  "Ghana": { lat: 5.56, lng: -0.2 },
  "Senegal": { lat: 14.69, lng: -17.45 },
  "Tanzania": { lat: -6.16, lng: 35.75 },
  "Ethiopia": { lat: 9.03, lng: 38.74 },
  "Mozambique": { lat: -25.97, lng: 32.58 },
  "Colombia": { lat: 4.71, lng: -74.07 },
  "Peru": { lat: -12.05, lng: -77.04 },
  "Argentina": { lat: -34.6, lng: -58.38 },
  "Chile": { lat: -33.45, lng: -70.66 },
  "Türkiye": { lat: 39.93, lng: 32.86 },
  "Turkey": { lat: 39.93, lng: 32.86 },
  "Ukraine": { lat: 50.45, lng: 30.52 },
  "Poland": { lat: 52.23, lng: 21.01 }
};

const REGION_LOCATIONS = {
  "Middle East and North Africa": { lat: 29.3, lng: 31.2 },
  "Middle East, North Africa, Afghanistan, & Pakistan": { lat: 29.3, lng: 47.9 },
  "Europe and Central Asia": { lat: 43.2, lng: 55.0 },
  "East Asia and Pacific": { lat: 8.0, lng: 122.0 },
  "South Asia": { lat: 22.0, lng: 78.0 },
  "Africa": { lat: 1.5, lng: 20.0 },
  "Latin America and Caribbean": { lat: -12.0, lng: -60.0 }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Global-Investment-Intelligence-Globe/1.0 public-source-feed"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, timeoutMs = 20000) {
  const body = await fetchText(url, timeoutMs);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${body.slice(0, 180)}`);
  }
}

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function wordRegex(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^[A-Z.]{2,4}$/.test(term)) return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, "i");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function countriesIn(text, sourceCountry) {
  const found = [];
  for (const c of COUNTRIES) {
    if (c.aliases.some(alias => wordRegex(alias).test(text))) found.push(c);
  }
  if (sourceCountry) {
    const source = COUNTRIES.find(c => c.aliases.some(alias => alias.toLowerCase() === String(sourceCountry).toLowerCase()));
    if (source && !found.some(c => c.id === source.id)) found.unshift(source);
  }
  return found.filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx);
}

function cdata(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value["cdata!"] || value.cdata || "";
}

function stripHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, "-")
    .replace(/â€¦/g, "...")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function amountFrom(text) {
  const match = String(text || "").match(/(?:US\$|USD|\$)\s?[\d,.]+(?:\s?(?:billion|million|trillion|bn|m))?/i);
  return match ? match[0].replace(/\s+/g, " ") : "Amount not extracted";
}

function locationFor(country, region) {
  const direct = COUNTRIES.find(c => c.name.toLowerCase() === String(country || "").toLowerCase());
  if (direct) return { lat: direct.lat, lng: direct.lng };
  if (EXTRA_LOCATIONS[country]) return EXTRA_LOCATIONS[country];
  if (REGION_LOCATIONS[region]) return REGION_LOCATIONS[region];
  return { lat: 20, lng: 0 };
}

function isOfficialFinanceDoc(doc) {
  const title = stripHtml(cdata(doc.title));
  const body = stripHtml(`${cdata(doc.descr)} ${doc.topic || ""} ${doc.keywd || ""} ${cdata(doc.content_1000)}`);
  if (/global growth|global economic prospects|outlook|forecast/i.test(title)) return false;
  if (amountFrom(body) !== "Amount not extracted") return true;
  return /financ|investment|support|program|project|framework|private sector|capital|infrastructure/i.test(title);
}

function inferSegment(text) {
  if (/semiconductor|chip|fab|foundry|microchip|wafer|advanced packaging/i.test(text)) return "semiconductors";
  if (/battery|\bEV\b|electric vehicle|gigafactory|lithium|nickel/i.test(text)) return "ev";
  if (/cloud|data center|datacenter|ai infrastructure|digital infrastructure/i.test(text)) return "digital";
  if (/port|rail|railway|corridor|logistics|shipping|airport|road|infrastructure/i.test(text)) return "infrastructure";
  if (/sovereign|wealth fund|pif|adia|adq|qia|gic|temasek|mubadala/i.test(text)) return "sovereign";
  if (/stock|portfolio|equity stake|shares|market|asset management|mutual fund/i.test(text)) return "finance";
  if (/hedge fund|private equity|buyout|alternative asset|blackstone|kkr|carlyle|apollo/i.test(text)) return "alternatives";
  if (/crypto|stablecoin|blockchain|web3|digital asset|bitcoin|token/i.test(text)) return "crypto";
  if (/renewable|solar|wind|green hydrogen|clean energy|power project/i.test(text)) return "renewables";
  return "infrastructure";
}

function inferType(text, segment) {
  if (/blocked|scrutiny|security review|sanction|restricted|national security|sensitive/i.test(text)) return "restricted";
  if (/development finance|loan|world bank|adb|dfc|jica|ifc|new development bank|financing/i.test(text)) return "development";
  if (/joint venture| jv |partnership|platform/i.test(text)) return "jointventure";
  if (/acquire|acquisition|buyout|takeover|stake|minority|equity|shares|portfolio/i.test(text)) return "portfolio";
  if (segment === "crypto" || segment === "alternatives" || segment === "sovereign" || segment === "finance") return "portfolio";
  return "direct";
}

function statusFor(type, segment) {
  if (type === "restricted") return "Sensitive Live Watch";
  if (type === "development") return "Live Development Finance Signal";
  if (type === "jointventure") return "Live JV / Platform Signal";
  if (type === "portfolio" && segment === "alternatives") return "Live Private Capital Signal";
  if (type === "portfolio") return "Live Portfolio / Stake Signal";
  return "Live Direct Investment Signal";
}

function parseGdeltDate(value) {
  const raw = String(value || "");
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]} UTC`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  return new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function makeRecord(article, index) {
  const title = String(article.title || "").trim();
  const domain = String(article.domain || "public source").trim();
  const url = String(article.url || "").trim();
  const sourceCountry = article.sourcecountry || "";
  const text = `${title} ${domain} ${sourceCountry}`;
  const matches = countriesIn(text, sourceCountry);
  const from = matches[0] || { name: sourceCountry || "Global", lat: 20, lng: 0 };
  const to = matches[1] || matches[0] || { name: "Global", lat: 20, lng: 0 };
  const segment = inferSegment(text);
  const type = inferType(text, segment);
  const date = parseGdeltDate(article.seendate);

  return {
    id: `live-${hash(url || title)}`,
    n: title || `Live investment signal ${index + 1}`,
    lat: to.lat,
    lng: to.lng,
    u: 56000 + index * 900,
    t: type,
    tier: index < 12 ? 0 : 1,
    status: statusFor(type, segment),
    investor: from.name,
    recipient: to.name,
    sector: segment.replace(/^\w/, c => c.toUpperCase()) + " intelligence",
    form: "Live public news signal",
    amount: "Amount not extracted from headline",
    category: `${from.name} -> ${to.name}`,
    date,
    source: domain,
    sourceType: "GDELT live public news",
    segment,
    directness: matches.length > 1 ? "Inferred cross-border signal" : "Country-linked signal",
    assetClass: segment === "crypto" ? "Crypto / Web3" : segment === "alternatives" ? "Hedge / PE / alternatives" : "Live news intelligence",
    bloc: sourceCountry || "Global",
    summary: `Live public-source article detected by GDELT. Classification is inferred from the headline and source metadata; open the source before treating it as verified investment evidence.`,
    url,
    globe: true,
    live: true,
    isLiveSignal: true,
    dataLayer: "Live news signal",
    sourceCountry
  };
}

function makeWorldBankRecord(doc, index) {
  const title = stripHtml(cdata(doc.title)) || `World Bank live finance signal ${index + 1}`;
  const description = stripHtml(cdata(doc.descr) || cdata(doc.content_1000) || cdata(doc.content));
  const fullText = stripHtml(`${title} ${description} ${doc.topic || ""} ${doc.keywd || ""}`);
  const country = doc.country || doc.count || doc.regionname || "Global";
  const region = doc.regionname || doc.admreg || "Global";
  const loc = locationFor(country, region);
  const segment = inferSegment(fullText);
  const url = String(doc.url || "").replace(/^http:/, "https:");
  const amount = amountFrom(fullText);
  const date = doc.lnchdt ? new Date(doc.lnchdt).toISOString().slice(0, 16).replace("T", " ") + " UTC" : parseGdeltDate();

  return {
    id: `wb-${hash(url || title)}`,
    n: title,
    lat: loc.lat,
    lng: loc.lng,
    u: 64000 + index * 850,
    t: "development",
    tier: index < 14 ? 0 : 1,
    status: "Live Official Development Finance Signal",
    investor: "World Bank Group",
    recipient: country,
    sector: (doc.topic || segment).split(",")[0] || "Development finance",
    form: "Official financing / program approval",
    amount,
    category: `World Bank Group -> ${country}`,
    date,
    source: "World Bank Group",
    sourceType: "World Bank public news API",
    segment,
    directness: "Official development finance",
    assetClass: "Development finance",
    bloc: region,
    summary: description || "Official World Bank public news record. Open the source for full context before treating it as evidence.",
    url,
    globe: true,
    live: true,
    isLiveSignal: true,
    dataLayer: "Official development finance feed",
    sourceCountry: "World Bank Group"
  };
}

async function fetchWorldBankRecords() {
  const url = new URL(WORLD_BANK_NEWS_API);
  url.searchParams.set("format", "json");
  url.searchParams.set("rows", process.env.WORLD_BANK_ROWS || "20");
  url.searchParams.set("fct", "displayconttype_exact,topic_exact,lang_exact,count_exact,countcode_exact,admreg_exact");
  url.searchParams.set("src", "cq55");
  url.searchParams.set("apilang", "en");
  url.searchParams.set("lang_exact", "English");
  url.searchParams.set("displayconttype_exact", "Press Release");
  url.searchParams.set("os", "0");

  const data = await fetchJson(url, 25000);
  const docs = data && data.documents ? Object.values(data.documents) : [];
  return docs
    .filter(doc => doc && doc.url && cdata(doc.title))
    .filter(doc => RELEVANCE_RE.test(`${cdata(doc.title)} ${cdata(doc.descr)} ${doc.topic || ""} ${doc.keywd || ""} ${cdata(doc.content_1000)}`))
    .filter(doc => OFFICIAL_FINANCE_RE.test(`${cdata(doc.descr)} ${doc.topic || ""} ${doc.keywd || ""} ${cdata(doc.content_1000)}`))
    .filter(isOfficialFinanceDoc)
    .map(makeWorldBankRecord);
}

async function fetchGdelt() {
  const url = new URL(GDELT_DOC_API);
  url.searchParams.set("query", QUERY);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", process.env.GDELT_MAX_RECORDS || "50");
  url.searchParams.set("timespan", process.env.GDELT_TIMESPAN || "48h");
  url.searchParams.set("sort", "HybridRel");

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.GDELT_TIMEOUT_MS || 15000));
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Global-Investment-Intelligence-Globe/1.0 public-source-feed"
        }
      });
      if (response.status === 429) {
        const body = await response.text();
        throw new Error(`GDELT rate limit: ${body.slice(0, 160)}`);
      }
      if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
      const body = await response.text();
      try {
        return JSON.parse(body);
      } catch {
        throw new Error(`GDELT returned non-JSON response: ${body.slice(0, 220)}`);
      }
    } catch (error) {
      lastError = error;
      await sleep([6500, 12000, 20000][attempt]);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function readExisting() {
  try {
    return JSON.parse(await fs.readFile(OUT_FILE, "utf8"));
  } catch {
    return { meta: {}, records: [], routes: [], hotspots: [] };
  }
}

function buildRoutes(records) {
  return records
    .filter(r => r.investor !== r.recipient)
    .slice(0, 30)
    .map((r, i) => {
      const from = r.investor === "World Bank Group"
        ? { lat: 38.9, lng: -77.04 }
        : COUNTRIES.find(c => c.name === r.investor) || { lat: 20, lng: 0 };
      return {
        from: { lat: from.lat, lng: from.lng },
        to: { lat: r.lat, lng: r.lng },
        label: `${r.investor} -> ${r.recipient} live signal`,
        intensity: Math.max(0.42, 0.78 - i * 0.01),
        isLiveSignal: true
      };
    });
}

function buildHotspots(records) {
  const counts = new Map();
  for (const record of records) {
    const key = record.recipient;
    if (!counts.has(key)) counts.set(key, { count: 0, lat: record.lat, lng: record.lng });
    counts.get(key).count += 1;
  }
  return [...counts.entries()]
    .filter(([, value]) => value.count > 1)
    .slice(0, 12)
    .map(([name, value]) => ({
      n: `${name} live investment news cluster`,
      lat: value.lat,
      lng: value.lng,
      strength: Math.min(0.95, 0.45 + value.count * 0.08),
      isLiveSignal: true
    }));
}

async function main() {
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  const now = new Date().toISOString();
  const existing = await readExisting();

  try {
    const warnings = [];
    const officialRecords = await fetchWorldBankRecords();
    let gdeltRecords = [];

    if (ENABLE_GDELT) {
      try {
        const data = await fetchGdelt();
        const articles = Array.isArray(data.articles) ? data.articles : [];
        const seenArticles = new Set();
        gdeltRecords = articles
          .filter(article => article && article.url && article.title)
          .filter(article => RELEVANCE_RE.test(`${article.title || ""} ${article.domain || ""}`))
          .filter(article => {
            const key = String(article.url).replace(/[?#].*$/, "");
            if (seenArticles.has(key)) return false;
            seenArticles.add(key);
            return true;
          })
          .map(makeRecord);
      } catch (error) {
        warnings.push(String(error && error.message ? error.message : error).slice(0, 240));
      }
    }

    const seen = new Set();
    const records = officialRecords
      .concat(gdeltRecords)
      .filter(record => {
        const key = String(record.url || record.id || record.n).replace(/[?#].*$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 50);

    if (!records.length) {
      throw new Error(warnings[0] || "No public-source records returned by configured feeds");
    }

    const payload = {
      meta: {
        feed: ENABLE_GDELT ? "Official development finance feed plus curated GDELT signals" : "Official development finance live feed",
        generatedAt: now,
        lastAttemptAt: now,
        status: "ok",
        recordCount: records.length,
        refreshCadence: "GitHub Actions schedule: every 30 minutes plus push refresh",
        sourcePolicy: "Live records are public official-source signals, not an exhaustive investment database. Open the source URL before using a signal as evidence.",
        sources: ENABLE_GDELT ? ["World Bank public news API", "GDELT DOC 2.1"] : ["World Bank public news API"],
        query: QUERY,
        warnings
      },
      records,
      routes: buildRoutes(records),
      hotspots: buildHotspots(records)
    };

    await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`Wrote ${records.length} live records to ${path.relative(ROOT, OUT_FILE)}`);
  } catch (error) {
    const payload = {
      ...existing,
      meta: {
        ...(existing.meta || {}),
        lastAttemptAt: now,
        status: "error",
        error: String(error && error.message ? error.message : error).slice(0, 300),
        sourcePolicy: "Live feed refresh failed; keeping the previous public-source feed. No records were invented."
      }
    };
    await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.warn(payload.meta.error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
