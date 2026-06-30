# Archived Research — Zillow/Redfin Photo Ingestion with Bright Data

> **Pivot note (June 30, 2026):** The Product Listing Analyzer MVP now accepts
> seller text and product photos directly. Bright Data and Zillow are no longer
> required dependencies. This report is retained only as research for a possible
> future feature that imports listings from public marketplace URLs.

## TL;DR
- **Yes — this is feasible in a single evening.** Bright Data ships dedicated, officially-maintained, pre-built Zillow and Redfin Scraper APIs, and both return listing photo/image URLs (not just text), so you can extract real image URLs per listing without building your own anti-bot infrastructure.
- **Photo URLs are confirmed in the payload.** Bright Data's Zillow record stores images in a top-level `photos` array (objects → `mixedSources.jpeg` → `{url, width}` across widths 192–1536px, real `photos.zillowstatic.com` URLs). The Redfin scraper exposes `Photos` and `Responsive photos` fields with `ssl.cdn-redfin.com` image URLs.
- **The main hackathon risk is latency, not blocking.** Bright Data hit 100% success on Zillow at a 2.1-second response time — the fastest of 11 providers tested — in Scrape.do's independent benchmark, but its Scraper API is asynchronous (trigger → poll snapshot → download). Budget for seconds-to-minutes per job, and use the synchronous `/scrape` endpoint or MCP for the fastest single-listing path.

## Key Findings
1. **Dedicated scrapers exist for both sites.** Bright Data has a pre-built **Zillow Scraper API** (dataset_id `gd_lfqkr8wm13ixtbd8f5`) and a **Redfin Scraper**, both part of its library of 600+ pre-built scrapers. There is also a broader "Real Estate Scraper API" and pre-collected Zillow/Redfin datasets.
2. **Image URLs are included** — confirmed for Zillow (`photos` array of `mixedSources.jpeg` URL/width objects) and Redfin (`Photos`, `Responsive photos` fields).
3. **General-purpose tools also work** (Web Unlocker, Scraping Browser, MCP `scrape_as_markdown`) but the dedicated scraper is the fastest path to structured image URLs.
4. **Reliability is strong** — Scrape.do's independent benchmark put Bright Data at 98.44% average success (highest of 11 providers) and 100% on Zillow at 2.1s. Both Zillow (PerimeterX + Cloudflare) and Redfin require residential proxies, which Bright Data handles automatically.
5. **Setup is fast** — 5,000 free credits/month, API token from dashboard, single cURL/SDK call. Pay-per-success.
6. **Watch-outs** — async polling latency, media links that can expire after 24h, you pay for valid records even on your own bad input, and field availability that "can't be guaranteed 100%."

## Details

### 1. Does Bright Data have dedicated Zillow / Redfin scrapers?
Yes. Bright Data maintains pre-built Scraper APIs for both:
- **Zillow Scraper API** — product page at brightdata.com/products/web-scraper/zillow; dataset_id `gd_lfqkr8wm13ixtbd8f5`. Endpoints include: property details by URL, properties listing by filters (`location` + `listingCategory` + `HomeType`), properties listing by search URL, and price history (separate dataset_id `gd_lxu1cz9r88uiqsosl`).
- **Redfin Scraper** — product page at brightdata.com/products/web-scraper/redfin. Collects sell price, size, rooms, description, listing agent, property type, year built, estimated value, and more.
- **Real Estate Scraper API** — a broader scraper covering Zillow, Zoopla, apartments.com, etc.
- **Pre-collected datasets** — a Zillow dataset (repeatedly cited as a "130M+ record" pre-collected dataset) at ~$250/100K records; Redfin datasets are custom-built on request.

These sit alongside the well-known LinkedIn/Amazon/Instagram scrapers, so Zillow and Redfin are first-class, officially-maintained targets. Bright Data also publishes working code in official GitHub repos (`luminati-io/zillow-scraper`, `brightdata/mls-scraper`, `brightdata/cli`, `brightdata/sdk-python`).

### 2. Do the returned payloads include photo/image URLs?

**Zillow — YES, confirmed from Bright Data's own sample data.** The Zillow product page lists "Photos, Responsive photos, Has vr model, Description, Home status…" as fields. The actual structure, verified from Bright Data's official sample file (`zillow_api_data/zillow_properties.json` in the `luminati-io/zillow-scraper` repo, for zpid 20533547), is a top-level `photos` array:

```json
"photos": [
  {
    "mixedSources": {
      "jpeg": [
        {"url": "https://photos.zillowstatic.com/fp/<hash>-cc_ft_192.jpg",  "width": 192},
        {"url": "https://photos.zillowstatic.com/fp/<hash>-cc_ft_768.jpg",  "width": 768},
        {"url": "https://photos.zillowstatic.com/fp/<hash>-cc_ft_1536.jpg", "width": 1536}
      ]
    }
  }
]
```
Each photo object provides 8 width variants (192, 384, 576, 768, 960, 1152, 1344, 1536px). There is also a scalar `photoCount` field (e.g. 25). For your project, take the highest-`width` URL from each photo object's `mixedSources.jpeg` array. Note: this particular export contained only `jpeg` sub-arrays, not `webp`.

**Redfin — YES.** The Redfin scraper output schema includes `Photos` and `Responsive photos` fields. Independent Redfin scrapers confirm the image-field format used by the site: e.g. `"image_urls": "https://ssl.cdn-redfin.com/photo/9/bigphoto/547/424049547_0.jpg"`.

### 3. If no dedicated scraper — would general-purpose tools work?
They would, and they're a good fallback, but you don't need them since dedicated scrapers exist:
- **Web Unlocker API** — handles CAPTCHAs/anti-bot, returns HTML/markdown; you parse the `__NEXT_DATA__` JSON yourself. Async mode typically ~2 minutes.
- **Scraping Browser / Browser API** — remote Playwright/Puppeteer; Bright Data's own MLS-scraper repo demonstrates this beats local Playwright, which gets served an aggressive "Press and Hold" CAPTCHA instantly because of browser-fingerprint detection.
- **MCP server** (`@brightdata/mcp`) — exposes `web_data_zillow_properties_listing` as a structured tool plus base tools `scrape_as_markdown`/`search_engine`; ideal if your hackathon stack is an AI agent. Free tier shares the same 5,000 credits/month pool.

### 4. Known issues / rate limits / barriers
- **Anti-bot**: Zillow runs PerimeterX + Cloudflare (each rated 8/10 difficulty by ScrapeOps); datacenter IPs are blocked almost universally. Redfin blocks datacenter IPs with a human-verification page. Bright Data's residential network handles both automatically — this is the core value proposition.
- **Rate limits**: a `429 Too Many Requests` is returned if you exceed concurrency; use batch input (up to 1GB / 5,000 URLs per call). Discovery scrapers auto-batch up to 100 requests.
- **Async latency**: a trigger returns a `snapshot_id`; you poll until status is `ready`, then download. The synchronous `/scrape` endpoint times out at ~1 minute and falls back to a `snapshot_id`.
- **Media-link expiry**: Bright Data's Scrapers FAQ lists, among scraper limitations, "**Media Links expiring after 24 hours**" and "**Media only accessible with a generated token in the same session**." For a hackathon demo this is usually fine, but download/cache any images you need to display persistently.
- **Billing gotcha**: per the Scrapers FAQ, "**unsuccessful attempts resulting from incorrect inputs by the user will still be billed. Since the failure to retrieve data was due to user input rather than Bright Data's performance, resources were still consumed.**" You are NOT billed for Bright Data-side failures (pay-per-success).
- **Structure drift**: Zillow's CSS class names are auto-generated and change frequently; the managed scraper absorbs this maintenance, but Bright Data notes field availability "can't be guaranteed 100%."

### 5. Reputation / reliability
- **Independent benchmark**: Scrape.do tested 11 providers across 7 hard domains (Amazon, Indeed, GitHub, Zillow, Capterra, Google, X/Twitter). Per Scrape.do, "Bright Data achieved a 98.44% average success rate across all scrapers… That is the highest result of any platform tested," and "Bright Data hit 100% success on Zillow with a 2.1-second response time, the fastest Zillow result across all providers tested."
- **Scale**: 400M+ residential IPs across 195 countries, a claimed 99.99% uptime SLA, and 20,000+ customers (third-party reviews note adoption including a majority of top global LLM labs, and report the company crossing $300M ARR in 2025).
- **Community caveats**: Reddit users note occasional throttling during "ultra high-demand events," and record/bandwidth pricing can be unpredictable at scale. Minor concerns for a hackathon.

### 6. How fast to set up + payload shape
**Setup path (single evening):**
1. Create a Bright Data account → "Every new Bright Data account automatically includes 5,000 free credits per month (approximately $7.50 in value) — no credit card required, no promo code, no commitment."
2. Generate an API token from the dashboard.
3. Call the Zillow scraper:
```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"url":"https://www.zillow.com/homedetails/.../20533547_zpid/"}]' \
  "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lfqkr8wm13ixtbd8f5&include_errors=true"
```
4. Poll the returned `snapshot_id` (or use webhook delivery) → download JSON → read `photos[].mixedSources.jpeg`.

**Fastest options for a live demo:**
- Use the **Python SDK** (`pip install brightdata-sdk`) or **CLI** (`brightdata pipelines …`), which trigger + poll + return in one call.
- Use the **MCP** `web_data_zillow_properties_listing` tool if your project is agent-based.
- For single listings, prefer the synchronous `/datasets/v3/scrape` endpoint (real-time, up to 20 URL inputs).

## Recommendations

**Stage 1 — Tonight, fastest win (recommended):**
- Use the dedicated **Zillow Scraper API** (`gd_lfqkr8wm13ixtbd8f5`) via the Python SDK or CLI. It returns structured JSON including the `photos` array directly — no HTML parsing, no proxy setup. Extract the highest-`width` URL from each `mixedSources.jpeg` entry.
- If you only need a handful of listings for a demo, use the **synchronous `/scrape` endpoint** to avoid polling complexity.

**Stage 2 — If you hit latency or want resilience:**
- Switch to **batch input** (array of URLs in one trigger call) plus webhook delivery so you're not blocking on polls.
- **Cache/download the image bytes immediately** (don't hot-link), to avoid the documented 24-hour media-link expiry and session-token restriction.

**Stage 3 — If the dedicated scraper misses a field or you need search/discovery:**
- Use "discover by `input_filters`" (`location` + `listingCategory` + `HomeType`) or "discover by url" to pull listing sets, then hydrate details.
- Fall back to **Web Unlocker + `__NEXT_DATA__` parsing** or the **Scraping Browser** only if needed.

**Decision thresholds:**
- If single-listing latency >~30s breaks your demo → use sync `/scrape` or MCP, or pre-scrape and cache before presenting.
- If you need >5,000 records → you'll exceed the free tier; deposit funds (Bright Data docs cite pricing "from 0.7$ per 1000 records," its blog cites pay-per-success "$0.75/1K" promo vs a "$1.50 per 1,000 records" standard rate) or buy the pre-collected dataset (~$250/100K) instead of live scraping.
- If you need Redfin specifically → the Redfin scraper's `Photos`/`Responsive photos` fields are the equivalent path with the same workflow.

**Bottom line:** Bright Data is a well-suited, low-risk choice for this hackathon. Both Zillow and Redfin are officially supported, photo URLs are present in the payload, and the heavy lifting (anti-bot, proxies, CAPTCHA) is fully managed. Plan around async latency and media-link expiry, and you can have working image-URL extraction running within an evening.

## Caveats
- Vendor-adjacent benchmarks should be read with some skepticism: the 98.44% average and 100%/2.1s Zillow figures come from Scrape.do's benchmark (a competing vendor) and are cited by Bright Data's own marketing blog, not a fully neutral third party.
- Zillow dataset record counts appear inconsistently across Bright Data pages ("130M+" vs "295.7M+" vs "134M+"); treat exact counts as approximate marketing figures.
- The `webp` sub-array was absent in the one Bright Data Zillow sample inspected; only `jpeg` URLs were present, and field availability can vary by listing and over time.
- Pricing and free-credit figures are time-sensitive promotions as of mid-2026 and may change.
- Scraping Zillow/Redfin may conflict with their Terms of Service even where the underlying data is public; Bright Data asserts GDPR/CCPA compliance and public-data-only collection, but legal responsibility for your use rests with you.
