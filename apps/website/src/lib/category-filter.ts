/**
 * Storefront category filtering.
 *
 * HomeU's storefront nav links to Shopify collection handles via
 * `/products?category=<handle>`. Most of those handles are tag-driven smart
 * collections (e.g. Furniture → Sofa = products tagged `sofa`). Our products
 * table only stores a single `category_id`, so the granular subcategories were
 * empty. This module reproduces the Shopify smart-collection TAG rules against
 * `products.tags` so every dropdown link resolves to the right products.
 *
 * Rules live in data/category-rules.json (mirrored from Shopify Admin).
 */
import categoryRules from '@/data/category-rules.json'

type Rule = { op: 'and' | 'or'; tags: string[] }
const RULES = (categoryRules as { rules: Record<string, Rule> }).rules

/** Returns true if the given category handle has a tag-based rule. */
export function hasCategoryRule(handle: string): boolean {
  return Object.prototype.hasOwnProperty.call(RULES, handle)
}

/**
 * Build a SQL boolean expression (and its parameter values) that matches a
 * product against a category's tag rule. `nextIndex` is the next free
 * positional parameter index ($N). Returns null when the handle has no rule.
 *
 * The expression checks `products.tags` (jsonb array of strings),
 * case-insensitively. Assumes the products table is aliased `p`.
 */
export function buildCategoryTagCondition(
  handle: string,
  nextIndex: number,
): { sql: string; values: string[] } | null {
  const rule = RULES[handle]
  if (!rule || rule.tags.length === 0) return null

  const values: string[] = []
  const checks = rule.tags.map((tag) => {
    values.push(tag)
    const idx = nextIndex + values.length - 1
    return (
      `EXISTS (SELECT 1 FROM jsonb_array_elements_text(` +
      `CASE WHEN jsonb_typeof(p.tags) = 'array' THEN p.tags ELSE '[]'::jsonb END` +
      `) AS _tag WHERE LOWER(_tag) = LOWER($${idx}))`
    )
  })

  const joiner = rule.op === 'or' ? ' OR ' : ' AND '
  return { sql: `(${checks.join(joiner)})`, values }
}
