# Calculator Apps — Skill

## Business Goal
Create tools architects, interior designers, and homeowners will visit the site repeatedly for. Each calculator ends with a CTA to request a quotation, save to project, or book a consultation.

## Priority Order
1. **Paint Calculator** — Walls + ceilings, paint coverage per can size
2. **Tile Calculator** — Floor/wall area + waste factor + grout
3. **Lighting Calculator** — Room lumens per sqm, fixture count
4. **Furniture Layout Calculator** — Room dimensions + furniture fit check
5. **Flooring Calculator** — Area + waste + material types
6. **Wallpaper Calculator** — Roll count based on pattern repeat
7. **Curtain/Blinds Estimator** — Width + height + fabric type
8. **Room Budget Estimator** — Multi-category budget allocation

## Common Architecture

### Component Pattern
```tsx
// components/calculator/PaintCalculator.tsx
export function PaintCalculator() {
  const [roomWidth, setWidth] = useState(0)
  const [roomLength, setLength] = useState(0)
  const [result, setResult] = useState(null)

  return (
    <div className="calculator-shell">
      <CalculatorInputs ... />
      {result && <CalculatorResult ... />}
      {/* Conversion CTA always visible with results */}
      {result && (
        <div className="calc-cta">
          <Link href="/rfq">Request Quotation</Link>
          <Link href="/appointments">Talk to Expert</Link>
          <button>Save to Project Board</button>
        </div>
      )}
    </div>
  )
}
```

### Conversion Rules
- Calculators produce results WITHOUT requiring login
- After showing results, suggest: Save project / Request quotation / Ask expert / Book showroom
- Pass calculation inputs to RFQ as notes so sales team sees what customer calculated

### UX Rules
- Clean, large inputs (touch-friendly)
- Real-time preview (update results as user types)
- Responsive: 1 column on mobile, 2 on desktop
- Remember last inputs via localStorage

## API Endpoints
```
POST /api/calculator/save — Save calculation to project (auth optional)
GET  /api/admin/calculations — Admin view of saved calculations
```

## Admin UI
- `/admin/analytics/calculators` — Usage stats per calculator type
- View saved calculations with customer data
- Clear filters for most-used calculators

## SEO Impact
Each calculator gets its own page at `/tools/{calculator-name}` with:
- Meta description: "Free {Calculator Name} — calculate your {material} needs for your {room type}"
- Schema markup for HowTo or Calculator
- Internal links from related product pages
