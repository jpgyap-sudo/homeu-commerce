# HomeU Site Crawler

Crawls www.homeu.ph to discover all URLs, pages, collections, and products.

## Usage

```bash
# Generate sitemap of all discoverable URLs
node crawl.mjs > output/all-urls.txt

# Crawl speed: respect the live site, add delays between requests
```

## Output

- `sitemap.txt` - All discovered URLs
- `all-urls.txt` - Flat list of URLs
- `crawl-report.json` - Structured crawl results

## Structure

The crawler should:
1. Start from homepage
2. Extract all links from navigation
3. Follow pagination (page=2, page=3, etc.)
4. Follow product links
5. Follow blog links
6. Follow page links
7. Report total URL count and broken links
