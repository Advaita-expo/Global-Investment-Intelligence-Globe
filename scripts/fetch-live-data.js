const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "data", "live-investment-intel.json");
const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";

const QUERY = "investment";
const RELEVANCE_RE = /investment|invests?|funding|financing|stake|acquisition|FDI|sovereign|data center|semiconductor|battery|infrastructure|private equity|portfolio|crypto|critical minerals|development finance/i;

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function inferSegment(text) {
  if (/semiconductor|chip|fab|foundry|microchip|wafer|advanced packaging/i.test(text)) return "semiconductors";
  if (/battery|ev|electric vehicle|gigafactory|lithium|nickel/i.test(text)) return "ev";
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
      const from = COUNTRIES.find(c => c.name === r.investor) || { lat: 20, lng: 0 };
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
    const data = await fetchGdelt();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const seen = new Set();
    const records = articles
      .filter(article => article && article.url && article.title)
      .filter(article => RELEVANCE_RE.test(`${article.title || ""} ${article.domain || ""}`))
      .filter(article => {
        const key = String(article.url).replace(/[?#].*$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(makeRecord)
      .slice(0, 50);

    const payload = {
      meta: {
        feed: "GDELT DOC 2.1 live public news signals",
        generatedAt: now,
        lastAttemptAt: now,
        status: "ok",
        recordCount: records.length,
        refreshCadence: "GitHub Actions schedule: every 30 minutes",
        sourcePolicy: "Live records are public news signals, not verified investment transactions. Open the source URL before using a signal as evidence.",
        query: QUERY
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
