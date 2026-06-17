/**
 * Smart Collection rule evaluator — Shopify-style, improved.
 *
 * A smart collection has a list of rules and a match mode ('all' | 'any').
 * Each rule = { column, relation, condition }. We compile the rules into a
 * parameterised SQL WHERE fragment evaluated against the `products` table.
 *
 * Supported columns (superset of Shopify's): TITLE, TYPE, VENDOR, TAG,
 * PRICE, SALE_PRICE, SKU, INVENTORY (on-sale flag derived).
 */

export type RuleColumn =
  | 'TITLE'
  | 'TYPE'
  | 'VENDOR'
  | 'TAG'
  | 'PRICE'
  | 'SALE_PRICE'
  | 'SKU'

export type RuleRelation =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN'

export interface CollectionRule {
  column: RuleColumn
  relation: RuleRelation
  condition: string
}

export const RULE_COLUMNS: { value: RuleColumn; label: string; kind: 'text' | 'number' | 'tag' }[] = [
  { value: 'TITLE', label: 'Product title', kind: 'text' },
  { value: 'TYPE', label: 'Product type', kind: 'text' },
  { value: 'VENDOR', label: 'Vendor', kind: 'text' },
  { value: 'TAG', label: 'Tag', kind: 'tag' },
  { value: 'SKU', label: 'SKU', kind: 'text' },
  { value: 'PRICE', label: 'Price', kind: 'number' },
  { value: 'SALE_PRICE', label: 'Sale price', kind: 'number' },
]

export const RELATIONS_BY_KIND: Record<'text' | 'number' | 'tag', { value: RuleRelation; label: string }[]> = {
  text: [
    { value: 'EQUALS', label: 'is equal to' },
    { value: 'NOT_EQUALS', label: 'is not equal to' },
    { value: 'CONTAINS', label: 'contains' },
    { value: 'NOT_CONTAINS', label: 'does not contain' },
    { value: 'STARTS_WITH', label: 'starts with' },
    { value: 'ENDS_WITH', label: 'ends with' },
  ],
  tag: [
    { value: 'EQUALS', label: 'is equal to' },
    { value: 'NOT_EQUALS', label: 'is not equal to' },
  ],
  number: [
    { value: 'EQUALS', label: 'is equal to' },
    { value: 'NOT_EQUALS', label: 'is not equal to' },
    { value: 'GREATER_THAN', label: 'is greater than' },
    { value: 'LESS_THAN', label: 'is less than' },
  ],
}

const TEXT_COLUMN_SQL: Partial<Record<RuleColumn, string>> = {
  TITLE: 'p.title',
  TYPE: 'p.product_type',
  VENDOR: 'p.vendor',
  SKU: 'p.sku',
}

const NUMBER_COLUMN_SQL: Partial<Record<RuleColumn, string>> = {
  PRICE: 'p.price',
  SALE_PRICE: 'p.sale_price',
}

/**
 * Compile a single rule into a SQL fragment + the params it consumes.
 * Param placeholders use a running index passed by the caller.
 */
function compileRule(
  rule: CollectionRule,
  nextParam: () => number,
  params: any[]
): string {
  const { column, relation, condition } = rule
  const cond = (condition ?? '').trim()

  // ── TAG: products.tags is a JSONB array of strings ──────────────────
  if (column === 'TAG') {
    const i = nextParam()
    params.push(JSON.stringify([cond]))
    // tags @> '["x"]' — array contains the tag
    if (relation === 'NOT_EQUALS') return `NOT (p.tags @> $${i}::jsonb)`
    return `p.tags @> $${i}::jsonb`
  }

  // ── Text columns ────────────────────────────────────────────────────
  if (TEXT_COLUMN_SQL[column]) {
    const col = TEXT_COLUMN_SQL[column]!
    switch (relation) {
      case 'EQUALS': {
        const i = nextParam(); params.push(cond)
        return `LOWER(${col}) = LOWER($${i})`
      }
      case 'NOT_EQUALS': {
        const i = nextParam(); params.push(cond)
        return `(${col} IS NULL OR LOWER(${col}) <> LOWER($${i}))`
      }
      case 'CONTAINS': {
        const i = nextParam(); params.push(`%${cond}%`)
        return `${col} ILIKE $${i}`
      }
      case 'NOT_CONTAINS': {
        const i = nextParam(); params.push(`%${cond}%`)
        return `(${col} IS NULL OR ${col} NOT ILIKE $${i})`
      }
      case 'STARTS_WITH': {
        const i = nextParam(); params.push(`${cond}%`)
        return `${col} ILIKE $${i}`
      }
      case 'ENDS_WITH': {
        const i = nextParam(); params.push(`%${cond}`)
        return `${col} ILIKE $${i}`
      }
    }
  }

  // ── Number columns ──────────────────────────────────────────────────
  if (NUMBER_COLUMN_SQL[column]) {
    const col = NUMBER_COLUMN_SQL[column]!
    const num = parseFloat(cond)
    if (Number.isNaN(num)) return 'FALSE'
    const i = nextParam(); params.push(num)
    switch (relation) {
      case 'EQUALS': return `${col} = $${i}`
      case 'NOT_EQUALS': return `(${col} IS NULL OR ${col} <> $${i})`
      case 'GREATER_THAN': return `${col} > $${i}`
      case 'LESS_THAN': return `${col} < $${i}`
    }
  }

  return 'FALSE'
}

export interface CompiledRules {
  where: string
  params: any[]
}

/**
 * Compile a full ruleset into a WHERE clause (without the leading WHERE).
 * Returns { where, params }. `startIndex` lets the caller reserve $1..$n
 * for other params before the rule params.
 */
export function compileRules(
  rules: CollectionRule[],
  match: 'all' | 'any',
  startIndex = 0
): CompiledRules {
  const valid = (rules || []).filter(r => r && r.column && r.relation)
  if (valid.length === 0) return { where: 'FALSE', params: [] }

  const params: any[] = []
  let counter = startIndex
  const nextParam = () => ++counter

  const fragments = valid.map(r => `(${compileRule(r, nextParam, params)})`)
  const joiner = match === 'any' ? ' OR ' : ' AND '
  return { where: fragments.join(joiner), params }
}

/** Map a product_sort key to an ORDER BY clause. */
export function sortClause(productSort: string): string {
  switch (productSort) {
    case 'price-asc': return 'p.price ASC NULLS LAST'
    case 'price-desc': return 'p.price DESC NULLS LAST'
    case 'title-asc': return 'p.title ASC'
    case 'title-desc': return 'p.title DESC'
    case 'created-desc': return 'p.created_at DESC'
    case 'best-selling': return 'p.id ASC' // no sales data yet — stable fallback
    case 'manual':
    default: return 'p.id ASC'
  }
}
