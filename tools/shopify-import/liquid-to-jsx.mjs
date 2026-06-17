/**
 * liquid-to-jsx.mjs — Shopify Liquid → React JSX Transpiler
 *
 * Converts Shopify Debut (or any theme) .liquid templates into
 * Next.js / React .tsx components. This is the core of the
 * frictionless Shopify → Next.js theme migration.
 *
 * Usage:
 *   node tools/shopify-import/liquid-to-jsx.mjs <input.liquid> [output.tsx]
 *   node tools/shopify-import/liquid-to-jsx.mjs --batch <liquid-dir> <output-dir>
 *
 * What it handles:
 *   {{ variable }}                → {variable}
 *   {{ object.prop }}             → {object.prop}
 *   {{ value | filter }}          → {liquidFilter.filter(value)}
 *   {% if cond %}...{% endif %}   → {cond && (...)}
 *   {% unless cond %}             → {!cond && (...)}
 *   {% if x %}...{% else %}...    → {x ? (...) : (...)}
 *   {% for item in items %}       → {items.map((item, _i) => (...))}
 *   {% assign x = val %}          → const x = val; (hoisted)
 *   {% render 'snippet' %}        → <Snippet />
 *   {% include 'snippet' %}       → <Snippet />
 *   {{ 'file.js' | asset_url }}   → /assets/file.js
 *   class=                        → className=
 *   for=                          → htmlFor=
 *   Shopify object mapping        → DaVinciOS data model
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Shopify object → DaVinciOS data model mapping ──────────────────────────
const OBJECT_MAP = {
  'product.title':              'product.title',
  'product.description':        'renderLexical(product.description)',
  'product.price':              'formatPHP(product.price)',
  'product.compare_at_price':   'formatPHP(product.originalPrice)',
  'product.url':                '`/products/${product.slug}`',
  'product.featured_image':     'product.imageUrl',
  'product.images':             'product.images',
  'product.images.size':        'product.images?.length',
  'product.vendor':             'product.vendor',
  'product.type':               'product.productType',
  'product.tags':               'product.tags',
  'product.handle':             'product.slug',
  'collection.title':           'category.title',
  'collection.handle':          'category.slug',
  'collection.products':        'products',
  'collection.image':           'category.imageUrl',
  'collections':                'categories',
  'customer':                   'user',
  'customer.name':              'user?.name',
  'customer.email':             'user?.email',
  'shop.name':                  'siteConfig.name',
  'shop.email':                 'siteConfig.email',
  'shop.currency':              'siteConfig.currencyCode',
  'cart.item_count':            'cartCount',
  'cart.total_price':           'cartTotal',
  'linklists.main-menu.links':  'navigation.main',
  'linklists.footer.links':     'navigation.footer',
  'link.title':                 'item.title',
  'link.url':                   'item.href',
  'link.links':                 'item.children',
  'paginate.pages':             'totalPages',
  'paginate.current_page':      'currentPage',
  'request.page_type':          'pageType',
}

// ─── Liquid filter → JS expression ──────────────────────────────────────────
const FILTER_MAP = {
  'money':           (v) => `formatPHP(${v})`,
  'money_with_currency': (v) => `formatPHP(${v})`,
  'upcase':          (v) => `${v}.toUpperCase()`,
  'downcase':        (v) => `${v}.toLowerCase()`,
  'capitalize':      (v) => `${v}.charAt(0).toUpperCase() + ${v}.slice(1)`,
  'size':            (v) => `${v}?.length`,
  'first':           (v) => `${v}?.[0]`,
  'last':            (v) => `${v}?.[${v}.length - 1]`,
  'append':          (v, arg) => `${v} + ${arg}`,
  'prepend':         (v, arg) => `${arg} + ${v}`,
  'replace':         (v, from, to) => `${v}.replace(${from}, ${to})`,
  'remove':          (v, s) => `${v}.replace(${s}, '')`,
  'strip_html':      (v) => `${v}.replace(/<[^>]*>/g, '')`,
  'strip':           (v) => `${v}.trim()`,
  'truncate':        (v, n) => `${v}.substring(0, ${n || 50})`,
  'truncatewords':   (v, n) => `${v}.split(' ').slice(0, ${n || 15}).join(' ')`,
  'split':           (v, sep) => `${v}.split(${sep})`,
  'join':            (v, sep) => `${v}.join(${sep || "', '"})`,
  'default':         (v, def) => `(${v} ?? ${def})`,
  'times':           (v, n) => `${v} * ${n}`,
  'divided_by':      (v, n) => `${v} / ${n}`,
  'minus':           (v, n) => `${v} - ${n}`,
  'plus':            (v, n) => `${v} + ${n}`,
  'floor':           (v) => `Math.floor(${v})`,
  'ceil':            (v) => `Math.ceil(${v})`,
  'round':           (v) => `Math.round(${v})`,
  'abs':             (v) => `Math.abs(${v})`,
  'date':            (v, fmt) => `new Date(${v}).toLocaleDateString('en-PH')`,
  'img_url':         (v, size) => `${v}`, // Already on DO Spaces CDN
  'img_tag':         (v, alt) => `<img src={${v}} alt={${alt || "''"}} />`,
  'asset_url':       (v) => `/assets/${v.replace(/['"]/g, '')}`,
  'asset_img_url':   (v, size) => `/assets/${v.replace(/['"]/g, '')}`,
  'url_for_vendor':  (v) => `\`/products?vendor=\${${v}}\``,
  'url_for_type':    (v) => `\`/products?type=\${${v}}\``,
  'handleize':       (v) => `${v}.toLowerCase().replace(/[^a-z0-9]+/g, '-')`,
  'link_to':         (v, url) => `<a href={${url}}>{${v}}</a>`,
  'json':            (v) => `JSON.stringify(${v})`,
  'escape':          (v) => `${v}`, // React escapes by default
  'escape_once':     (v) => `${v}`,
  'newline_to_br':   (v) => `${v}.replace(/\n/g, '<br />')`,
  'strip_newlines':  (v) => `${v}.replace(/\n/g, '')`,
  'pluralize':       (v, singular, plural) => `${v} === 1 ? ${singular} : ${plural}`,
  'weight_with_unit':(v) => `${v} + ' kg'`,
}

// ─── Shopify condition operators ─────────────────────────────────────────────
function translateCondition(cond) {
  return cond
    .replace(/\s+==\s+/g, ' === ')
    .replace(/\s+!=\s+/g, ' !== ')
    .replace(/\s+contains\s+/g, '.includes(')
    .replace(/\bblank\b/g, 'null')
    .replace(/\bempty\b/g, '[]')
    .replace(/\bnil\b/g, 'null')
    .replace(/\btrue\b/g, 'true')
    .replace(/\bfalse\b/g, 'false')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    // Fix unclosed .includes(
    .replace(/\.includes\(([^)]+)$/g, (m, arg) => `.includes(${arg})`)
    // Map object paths
    .replace(/\b([a-z_][a-z0-9_.]*)\b/g, (m) => OBJECT_MAP[m] || m)
}

// ─── Translate a single {{ expr }} ────────────────────────────────────────────
function translateExpression(expr) {
  const parts = expr.trim().split(/\s*\|\s*/)
  let value = parts[0].trim()

  // Map known Shopify object paths
  if (OBJECT_MAP[value]) value = OBJECT_MAP[value]

  // Apply filters left to right
  for (let i = 1; i < parts.length; i++) {
    const filterParts = parts[i].trim().split(/\s*:\s*/)
    const filterName = filterParts[0].trim()
    const filterArgs = filterParts.slice(1).map(a => a.trim())
    const fn = FILTER_MAP[filterName]
    if (fn) {
      value = fn(value, ...filterArgs)
    } else {
      value = `liquidFilter.${filterName}(${[value, ...filterArgs].join(', ')})`
    }
  }

  return `{${value}}`
}

// ─── Strip Liquid tag, return inner content ────────────────────────────────────
function tagContent(tag) {
  return tag.replace(/^\{%[-~]?\s*/, '').replace(/\s*[-~]?%\}$/, '').trim()
}

// ─── Main transpiler ──────────────────────────────────────────────────────────
export function liquidToJsx(liquid, componentName = 'ShopifyComponent', props = []) {
  const lines = liquid.split('\n')
  const assigns = []
  const output = []
  let depth = 0

  // Collect all {% assign %} at the top level
  const assignRe = /\{%-?\s*assign\s+(\w+)\s*=\s*(.+?)\s*-?%\}/g
  let m
  while ((m = assignRe.exec(liquid)) !== null) {
    const [, name, value] = m
    const mapped = OBJECT_MAP[value.trim()] || value.trim()
    assigns.push(`  const ${name} = ${mapped}`)
  }

  // Process the template
  const result = processLiquid(liquid)

  // Build component
  const importPaths = []
  if (result.includes('renderLexical')) importPaths.push(`import { renderLexical } from '@/lib/renderLexical'`)
  if (result.includes('formatPHP'))    importPaths.push(`import { formatPHP } from '@/lib/format'`)
  if (result.includes('siteConfig'))   importPaths.push(`import siteConfig from '@/data/site-config.json'`)
  if (result.includes('navigation'))   importPaths.push(`import navigation from '@/data/navigation.json'`)

  const propTypes = props.length > 0
    ? `\ninterface Props {\n${props.map(p => `  ${p}: any`).join('\n')}\n}\n`
    : ''

  return `'use client'
${importPaths.join('\n')}
${propTypes}
export default function ${componentName}(${props.length ? '{ ' + props.join(', ') + ' }: Props' : ''}) {
${assigns.length ? assigns.join('\n') + '\n' : ''}
  return (
    <>
${result.split('\n').map(l => '      ' + l).join('\n')}
    </>
  )
}
`
}

function processLiquid(liquid) {
  // 1. Remove {% comment %}...{% endcomment %}
  liquid = liquid.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  // 2. Remove {% assign %} (handled separately)
  liquid = liquid.replace(/\{%-?\s*assign\s[^%]+%\}/g, '')
  // 3. Remove {% schema %}...{% endschema %}
  liquid = liquid.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '')
  // 4. Remove {% stylesheet %}/{% javascript %}
  liquid = liquid.replace(/\{%-?\s*(?:stylesheet|javascript)\s*-?%\}[\s\S]*?\{%-?\s*end(?:stylesheet|javascript)\s*-?%\}/g, '')
  // 5. Translate {{ expressions }}
  liquid = liquid.replace(/\{\{-?\s*(.*?)\s*-?\}\}/g, (_, expr) => translateExpression(expr))
  // 6. Translate control flow tags
  liquid = translateControlFlow(liquid)
  // 7. JSX attribute fixes
  liquid = liquid
    .replace(/\bclass=/g, 'className=')
    .replace(/\bhtmlFor=/g, 'htmlFor=')
    .replace(/\bfor=/g, 'htmlFor=')
    .replace(/\bstyle="([^"]*)"/g, (_, css) => {
      // Convert inline CSS string to JSX object
      const pairs = css.split(';').filter(Boolean)
      const obj = pairs.map(p => {
        const [k, v] = p.split(':').map(s => s.trim())
        const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        return `${camel}: '${v}'`
      }).join(', ')
      return `style={{ ${obj} }}`
    })
  // 8. Self-closing tags
  liquid = liquid.replace(/<(br|hr|img|input|meta|link)([^>]*[^/])>/g, '<$1$2 />')
  // 9. Translate Liquid object references that weren't in expressions
  liquid = liquid.replace(/\b(product|collection|customer|shop|cart)\.([\w.]+)/g, (m, obj, prop) => {
    const key = `${obj}.${prop}`
    return OBJECT_MAP[key] || m
  })

  return liquid.trim()
}

function translateControlFlow(liquid) {
  // Process nested if/for blocks
  // Strategy: tokenize into segments, then build JSX
  const tokens = tokenize(liquid)
  return buildJsx(tokens)
}

function tokenize(liquid) {
  const tokens = []
  const tagRe = /(\{%-?\s*(?:if|elsif|else|unless|endif|endunless|for|endfor|case|when|endcase|tablerow|endtablerow|cycle|raw|endraw|capture|endcapture|paginate|endpaginate|form|endform|render|include|section|layout|break|continue)[^%]*?-?%\})/g
  let lastIndex = 0
  let m
  while ((m = tagRe.exec(liquid)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: liquid.slice(lastIndex, m.index) })
    }
    const tag = m[1]
    const inner = tagContent(tag)
    const keyword = inner.split(/\s+/)[0]
    tokens.push({ type: 'tag', keyword, value: inner, raw: tag })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < liquid.length) {
    tokens.push({ type: 'text', value: liquid.slice(lastIndex) })
  }
  return tokens
}

function buildJsx(tokens) {
  const parts = []
  let i = 0

  function collect(until = null) {
    const result = []
    while (i < tokens.length) {
      const tok = tokens[i]
      if (tok.type === 'text') {
        result.push(tok.value)
        i++
      } else if (tok.type === 'tag') {
        const kw = tok.keyword
        if (until && until.includes(kw)) break

        if (kw === 'if' || kw === 'unless') {
          i++
          const cond = tok.value.replace(/^(if|unless)\s+/, '')
          const condJs = translateCondition(cond)
          const trueParts = []
          const falseParts = []
          let inElse = false

          while (i < tokens.length) {
            const t = tokens[i]
            if (t.type === 'tag') {
              if (t.keyword === 'endif' || t.keyword === 'endunless') { i++; break }
              if (t.keyword === 'else') { inElse = true; i++; continue }
              if (t.keyword === 'elsif') {
                // treat as chained condition
                inElse = true
                i++
                const elseCond = t.value.replace(/^elsif\s+/, '')
                const elseCondJs = translateCondition(elseCond)
                const elseInner = collect(['endif', 'else', 'elsif'])
                falseParts.push(`{${elseCondJs} && (<>${elseInner.join('')}</>)}`)
                continue
              }
            }
            if (inElse) {
              falseParts.push(...collect(['endif', 'endunless']))
              break
            } else {
              trueParts.push(...collect(['endif', 'endunless', 'else', 'elsif']))
              if (i < tokens.length && tokens[i]?.keyword === 'else') continue
              if (i < tokens.length && tokens[i]?.keyword === 'endif') { i++; break }
              break
            }
          }

          const negated = kw === 'unless' ? '!' : ''
          const trueJsx = trueParts.join('')
          const falseJsx = falseParts.join('')

          if (falseJsx) {
            result.push(`{${negated}(${condJs}) ? (<>${trueJsx}</>) : (<>${falseJsx}</>)}`)
          } else {
            result.push(`{${negated}(${condJs}) && (<>${trueJsx}</>)}`)
          }
        } else if (kw === 'for') {
          i++
          // for item in collection limit:X offset:Y
          const forMatch = tok.value.match(/^for\s+(\w+)\s+in\s+(\S+)(?:\s+limit:\s*(\d+))?/)
          if (forMatch) {
            const [, item, collection, limit] = forMatch
            const collectionJs = OBJECT_MAP[collection] || collection
            const inner = collect(['endfor'])
            if (i < tokens.length && tokens[i]?.keyword === 'endfor') i++
            const innerJsx = inner.join('')
            const limitSlice = limit ? `.slice(0, ${limit})` : ''
            result.push(`{(${collectionJs}${limitSlice} || []).map((${item}, ${item}_i) => (<React.Fragment key={${item}_i}>${innerJsx}</React.Fragment>))}`)
          } else {
            i++
          }
        } else if (kw === 'render' || kw === 'include') {
          // {% render 'snippet-name', var: value %}
          const renderMatch = tok.value.match(/^(?:render|include)\s+['"]([^'"]+)['"](.*)$/)
          if (renderMatch) {
            const [, snippetName, propsStr] = renderMatch
            const componentName = snippetName.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
            // Parse props
            const propMatches = [...(propsStr || '').matchAll(/(\w+):\s*([^,}]+)/g)]
            const jsxProps = propMatches.map(([, k, v]) => `${k}={${OBJECT_MAP[v.trim()] || v.trim()}}`).join(' ')
            result.push(`<${componentName} ${jsxProps} />`)
          }
          i++
        } else if (kw === 'cycle') {
          // {% cycle 'a', 'b', 'c' %} → cycle through values using index
          const cycleMatch = tok.value.match(/^cycle\s+(.+)$/)
          if (cycleMatch) {
            const vals = cycleMatch[1].split(',').map(v => v.trim())
            result.push(`{[${vals.join(', ')}][_i % ${vals.length}]}`)
          }
          i++
        } else if (['break', 'continue'].includes(kw)) {
          // skip — handled by for loop logic
          i++
        } else {
          // Unknown tag — comment it out
          result.push(`{/* ${tok.value} */}`)
          i++
        }
      }
    }
    return result
  }

  const result = collect()
  return result.join('')
}

// ─── CLI entry point ───────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)

  if (args[0] === '--batch') {
    const [, inputDir, outputDir] = args
    fs.mkdirSync(outputDir, { recursive: true })
    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.liquid'))
    for (const file of files) {
      const input = fs.readFileSync(path.join(inputDir, file), 'utf8')
      const componentName = file.replace('.liquid', '').split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
      const jsx = liquidToJsx(input, componentName)
      const outFile = path.join(outputDir, file.replace('.liquid', '.tsx'))
      fs.writeFileSync(outFile, jsx)
      console.log(`✓ ${file} → ${path.basename(outFile)}`)
    }
    console.log(`\nConverted ${files.length} Liquid templates → TSX components`)
  } else if (args[0]) {
    const inputFile = args[0]
    const outputFile = args[1] || inputFile.replace('.liquid', '.tsx')
    const input = fs.readFileSync(inputFile, 'utf8')
    const componentName = path.basename(inputFile, '.liquid').split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
    const jsx = liquidToJsx(input, componentName)
    fs.writeFileSync(outputFile, jsx)
    console.log(`✓ ${inputFile} → ${outputFile}`)
    console.log('\n--- Preview (first 60 lines) ---')
    console.log(jsx.split('\n').slice(0, 60).join('\n'))
  } else {
    console.log(`
liquid-to-jsx — Shopify Liquid → Next.js JSX Transpiler

Usage:
  node tools/shopify-import/liquid-to-jsx.mjs <input.liquid> [output.tsx]
  node tools/shopify-import/liquid-to-jsx.mjs --batch <liquid-dir> <output-dir>

Examples:
  node tools/shopify-import/liquid-to-jsx.mjs header.liquid
  node tools/shopify-import/liquid-to-jsx.mjs --batch sections/ src/components/shopify/
    `)
  }
}
