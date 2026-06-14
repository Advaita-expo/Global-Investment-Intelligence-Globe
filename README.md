# Global Investment Intelligence Globe

Standalone public-source intelligence globe for monitoring direct and indirect cross-border investment flows.

Live demo:

```text
https://advaita-expo.github.io/Global-Investment-Intelligence-Globe/
```

## Run locally

```powershell
cd "C:\Users\shlok\OneDrive\Documents\Playground\global-investment-intelligence-globe"
python -m http.server 5176 --bind 127.0.0.1
```

Open:

```text
http://localhost:5176/
```

## Live data layer

The project now includes a near-real-time public news signal layer:

- `scripts/fetch-live-data.js` pulls public article records from the GDELT DOC 2.1 API.
- `data/live-investment-intel.json` stores the latest generated feed for the static frontend.
- `.github/workflows/live-data.yml` refreshes the feed on normal pushes, then every 30 minutes, and republishes the static site to the `gh-pages` branch.

Live signals are not treated as verified investment transactions. They are labelled as GDELT live public news signals and should be opened at the source URL before being used as evidence.

## Source policy

The seed data uses public links only: company announcements, government releases, sovereign investor statements, development finance releases, and official project portals. The curated records are not an exhaustive database. The live layer adds public news signals that are classified automatically and kept separate from curated verified records.

## Intelligence layers

- Green markers: direct FDI and operating capex.
- Blue markers: sovereign funds, portfolio stakes, and indirect capital.
- Yellow markers: development finance or ODA.
- Orange markers: joint ventures and investment platforms.
- Purple markers: strategic stakes or structured financing.
- Red markers: sensitive strategic infrastructure watch.
- Blue arcs: investor country to recipient country capital corridors.

## Current focus areas

Semiconductors, EV batteries, cloud infrastructure, rail and ports, sovereign wealth investments, retail and digital platform stakes, urban development, strategic infrastructure corridors, Africa, Australia/APAC, Gulf capital, BRICS finance, stock and portfolio stakes, hedge fund/private-equity style alternatives, and crypto/Web3 capital flows.

## Region and asset parameters

- Regions: Africa, APAC, Australia, Gulf, BRICS, India, USA, Mexico, UK, UAE, Saudi Arabia, Qatar, Singapore, Japan, South Korea, Taiwan, China, Indonesia, Brazil, South Africa, Senegal, Angola, Egypt, and Pakistan.
- Asset classes: direct FDI, stock/portfolio stakes, sovereign capital, development finance, private equity/alternatives, infrastructure platforms, and crypto/Web3 strategic stakes.
