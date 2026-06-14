# Navigation Migration Skill

Migrate Shopify navigation menus to Next.js components.

## Shopify Navigation Structure

```
Main Menu (from Shopify admin):
├── Home
├── Quick Delivery
│   ├── Lighting
│   ├── Furniture
│   ├── Stone
│   ├── Decor
│   ├── Ceiling Fan
│   ├── Wall Panel
│   └── Rugs
├── Wall Panels
│   ├── Slat (Fluted) Wall Panel
│   ├── Solid Wood Slat Panel
│   └── Profile Accessories
├── Lighting | Ceiling Fan
│   ├── Ceiling Fan
│   ├── Table Lamp
│   ├── Pendant Light
│   ├── Ceiling Mounted Light
│   ├── Floor Lamp
│   └── Wall Light
├── Furniture
│   ├── Armchair ... (13 sub-items)
├── Stone Options
│   ├── Sintered Stone
│   └── Natural Stone
├── Finish Materials
│   ├── Linen ... (5 sub-items)
├── Designer Club
└── Design Trends (blog)
```

## Extraction Method
```bash
# From scanner HTML (navigation is in the page source):
node -e "
  const html = require('fs').readFileSync('output/raw/www.homeu.ph.html','utf8');
  // Extract nav items from HTML by parsing <nav> or header elements
"

# From Heremes3 analysis (intelligent reconstruction):
node tools/migration-brain/hermes-agent.mjs analyze-nav '<links-json>'
```

## Output
- `migration-output/navigation.json` — hierarchical structure
- Updated Next.js Header/Footer components
