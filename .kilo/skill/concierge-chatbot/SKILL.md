# HomeU Concierge Chatbot Skill

## Description

Build and maintain the **HomeU Concierge** — an AI-powered RFQ (Request for Quotation) sales assistant chatbot for the HomeU furniture and lighting catalog website. This system is **not an e-commerce chatbot** — it is a lead capture, product recommendation, RFQ collection, appointment booking, and sales handoff concierge.

## Core Philosophy

HomeU.PH is a catalog + RFQ model website, **not an online shop**. The chatbot must never say "Buy Now", "Checkout", "Pay Now", or "Place Order". Instead, use:
- Request Quotation
- Add to RFQ
- Book Showroom Visit
- Contact Sales on Viber
- Send Inquiry
- Price Reference Only

## Genius Innovations (Beyond Basic RFQ Bot)

### 🔮 1. Multi-Agent Conversation Architecture
Not one monolithic bot. The concierge uses specialized sub-agents routed by an **Intent Orchestrator**:
- **Product Recommender Agent** — catalog search + similarity matching
- **RFQ Cart Agent** — cart building, quantity negotiation, alternative suggestions
- **Appointment Agent** — showroom scheduling
- **FAQ Agent** — common questions about delivery, materials, pricing
- **Viber Handoff Agent** — warm transfer to human sales with full context
- **Escalation Agent** — human takeover when confidence drops

### 🧠 2. Predictive Lead Scoring (Real-Time)
Score leads *during conversation* based on:
- Message sentiment & intent signals
- Buyer type classification
- Browsing behavior (product page dwell time, page depth)
- RFQ cart value and quantity
- Urgency detection (timeline mentions)
- Conversation length and engagement

Score categories: `cold → warm → hot → qualified`

### 🖼️ 3. Visual Product Matcher
- Upload furniture/lighting photo → AI vision extracts style/material/color
- Embedding search matches to catalog products
- Returns closest match + style alternative + budget alternative + premium alternative

### 💬 4. AI Sales Coach Mode
For admin/human sales reps:
- Generate suggested replies based on conversation context
- Summarize long conversations into actionable bullet points
- Detect upsell/cross-sell opportunities from cart contents
- Auto-draft quotation descriptions

### 🔄 5. Abandoned Chat Recovery
- Detect when visitor drops off mid-conversation (after lead gate but before RFQ)
- Queue follow-up prompt via next visit or admin follow-up task
- Track chat abandonment funnels

### 📊 6. AI Analytics & Auto-FAQ Loop
Weekly AI summarizes:
- Most-asked product categories
- Unanswered questions (FAQ gaps)
- Products with high interest but no conversion
- Failed searches (catalog gaps)
- Conversion drop-off points

Auto-generates suggestions: add FAQ, improve product description, create landing page, update SEO metadata, add missing tags.

### 🧩 7. Bundle & Alternative Intelligence
When items are in the RFQ cart, the bot proactively:
- Suggests matching set completions (table + chairs, lamp + side table)
- Offers style alternatives (modern → contemporary)
- Provides budget/premium tier options
- Detects complementary categories

### 🔐 8. Privacy-First Consent Layer
- GDPR/PH Data Privacy Act compliant lead form
- Consent checkbox stored with lead
- Data retention tagging
- Bot never exposes admin data, AI prompts, or internal notes

---

## Architecture

```
Website (Next.js 16 + DaVinciOS CMS)
        │
        ▼
┌────────────────────────────────────────────┐
│          Chat Widget (React)                │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Lead Gate │ │  Chat    │ │ RFQ Cart   │  │
│  │  Form    │ │ Messages │ │  Drawer    │  │
│  └──────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Product   │ │Appoint-  │ │ Viber      │  │
│  │Cards     │ │mentPicker│ │ Handoff    │  │
│  └──────────┘ └──────────┘ └────────────┘  │
└──────────────────┬─────────────────────────┘
                   │
┌──────────────────▼─────────────────────────┐
│         Chat API Gateway (Next.js API)      │
│  POST /api/chat/leads                       │
│  POST /api/chat/message                     │
│  POST /api/chat/upload-image                │
│  POST /api/products/recommend               │
│  POST /api/rfq/add-item                     │
│  POST /api/rfq/submit                       │
│  POST /api/appointments/request             │
└──────────────────┬─────────────────────────┘
                   │
┌──────────────────▼─────────────────────────┐
│       Conversation Orchestrator             │
│                                            │
│  ┌────────────┐ ┌────────────────────┐     │
│  │ Intent     │ │ Lead Gate          │     │
│  │ Classifier │ │ Check              │     │
│  └────────────┘ └────────────────────┘     │
│  ┌────────────┐ ┌────────────────────┐     │
│  │ Product    │ │ RFQ Cart           │     │
│  │ Recommender│ │ Builder            │     │
│  └────────────┘ └────────────────────┘     │
│  ┌────────────┐ ┌────────────────────┐     │
│  │ Appointment│ │ Viber Handoff      │     │
│  │ Scheduler  │ │ Agent              │     │
│  └────────────┘ └────────────────────┘     │
│  ┌────────────┐ ┌────────────────────┐     │
│  │ Lead       │ │ Telegram           │     │
│  │ Scorer     │ │ Notifier           │     │
│  └────────────┘ └────────────────────┘     │
└──────────────────┬─────────────────────────┘
                   │
┌──────────────────▼─────────────────────────┐
│     AI Adapter Layer (Provider-Agnostic)    │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Gemini  │ │  OpenAI  │ │  Ollama  │   │
│  │  Flash   │ │ GPT-4o   │ │ (local)  │   │
│  └──────────┘ └──────────┘ └──────────┘   │
└──────────────────┬─────────────────────────┘
                   │
┌──────────────────▼─────────────────────────┐
│  PostgreSQL + DaVinciOS CMS                 │
│                                            │
│  Tables: leads, conversations, messages,    │
│  uploaded_images, rfq_carts, rfq_items,     │
│  appointments, recommendation_logs,         │
│  telegram_logs, lead_scores                 │
└─────────────────────────────────────────────┘
```

## Files & Organization

### Chat Library (`apps/website/src/lib/chatbot/`)
| File | Purpose |
|------|---------|
| `ai-provider.ts` | Abstract AI adapter (Gemini, OpenAI, Ollama) |
| `prompts.ts` | All system messages, templates, greeting copy |
| `intent-classifier.ts` | Rule-based + AI intent classification |
| `product-search.ts` | Catalog search by text/tags/category |
| `visual-search.ts` | Image → attributes → product matching |
| `lead-scorer.ts` | Real-time lead scoring engine |
| `telegram-client.ts` | Telegram Bot API notification sender |
| `rfq-service.ts` | RFQ cart operations (add, submit, notify) |
| `appointment-service.ts` | Appointment booking logic |

### Chat Components (`apps/website/src/components/chat/`)
| File | Purpose |
|------|---------|
| `ChatWidget.tsx` | Main chat bubble + popup container |
| `LeadGateForm.tsx` | Name/email/mobile capture form |
| `MessageList.tsx` | Chat message display |
| `ProductRecommendationCard.tsx` | Product card with Add to RFQ |
| `RFQCartDrawer.tsx` | Slide-out RFQ cart drawer |
| `AppointmentPicker.tsx` | Date/time/visitor picker |
| `ViberHandoff.tsx` | Viber contact display + send RFQ |
| `ChatStyles.ts` | Scoped CSS module for chat |

### Chat API Routes (`apps/website/src/app/api/chat/`)
| Endpoint | File | Method |
|----------|------|--------|
| `/api/chat/leads` | `route.ts` | POST |
| `/api/chat/message` | `route.ts` | POST |
| `/api/chat/upload-image` | `route.ts` | POST |
| `/api/products/recommend` | `route.ts` | POST |
| `/api/rfq/add-item` | `route.ts` | POST |
| `/api/rfq/submit` | `route.ts` | POST |
| `/api/appointments/request` | `route.ts` | POST |

### Tools (`tools/chatbot/`)
| File | Purpose |
|------|---------|
| `telegram-webhook.ts` | Telegram webhook receiver (optional) |
| `seed-products.ts` | Seed sample products for testing |

---

## Database Schema

### New Tables (in addition to existing DaVinciOS collections)

The chatbot uses a **sidecar schema** — separate tables that reference DaVinciOS collections by UUID.

#### `leads`
```sql
CREATE TABLE chatbot.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  buyer_type TEXT,              -- homeowner, architect, contractor, hotel, retail
  company_name TEXT,
  project_location TEXT,
  consent BOOLEAN DEFAULT TRUE,
  source_page TEXT,              -- /products/chair, /categories/lighting
  referrer TEXT,                 -- google, facebook, direct
  status TEXT DEFAULT 'new',     -- new, contacted, qualified, quoted, won, lost
  score INTEGER DEFAULT 0,       -- lead score 0-100
  score_label TEXT,              -- cold, warm, hot, qualified
  daVincios_customer_id TEXT,    -- link to existing customers collection
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `conversations`
```sql
CREATE TABLE chatbot.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',   -- active, bot_handling, needs_human, closed
  current_intent TEXT,
  intent_confidence REAL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `messages`
```sql
CREATE TABLE chatbot.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,      -- visitor, bot, admin, system
  content TEXT,
  message_type TEXT DEFAULT 'text', -- text, image, product_card, system, quick_reply
  metadata JSONB DEFAULT '{}',    -- { productId, imageUrl, confidence, intent }
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `uploaded_images`
```sql
CREATE TABLE chatbot.uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  ai_description TEXT,
  extracted_attributes JSONB DEFAULT '{}',  -- { category, style[], material[], color[] }
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `rfq_carts`
```sql
CREATE TABLE chatbot.rfq_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',    -- draft, submitted, quoted, closed
  delivery_location TEXT,
  project_type TEXT,
  target_date DATE,
  budget_range TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);
```

#### `rfq_items`
```sql
CREATE TABLE chatbot.rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_cart_id UUID REFERENCES chatbot.rfq_carts(id) ON DELETE CASCADE,
  product_id TEXT,                -- DaVinciOS product ID
  product_title TEXT,
  product_url TEXT,
  reference_price NUMERIC,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  inspiration_image_url TEXT,
  accepts_alternatives BOOLEAN DEFAULT TRUE,
  match_type TEXT,                -- closest_match, style_alternative, budget, premium
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `appointments`
```sql
CREATE TABLE chatbot.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_time TEXT,
  visitor_count INTEGER,
  categories_of_interest TEXT[],
  status TEXT DEFAULT 'requested', -- requested, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `lead_scores`
```sql
CREATE TABLE chatbot.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE UNIQUE,
  score INTEGER DEFAULT 0,
  signals JSONB DEFAULT '[]',     -- [{ signal: 'high_value_cart', weight: 20, timestamp }]
  buyer_type TEXT,
  intent_match_count INTEGER DEFAULT 0,
  avg_sentiment REAL DEFAULT 0,
  urgency_detected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `recommendation_logs`
```sql
CREATE TABLE chatbot.recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  query_text TEXT,
  uploaded_image_id UUID REFERENCES chatbot.uploaded_images(id) ON DELETE SET NULL,
  extracted_attributes JSONB DEFAULT '{}',
  recommended_products JSONB DEFAULT '[]',  -- [{ productId, title, matchType, confidence }]
  confidence REAL,
  click_through BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `telegram_logs`
```sql
CREATE TABLE chatbot.telegram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  event_type TEXT,                -- NEW_LEAD, RFQ_SUBMITTED, APPOINTMENT_REQUESTED, ESCALATION
  message_payload JSONB,
  telegram_message_id TEXT,
  status TEXT DEFAULT 'pending',  -- pending, sent, failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Schema file
**Path**: `apps/website/src/lib/chatbot/schema.sql`
**Usage**: Run via `psql` against the chatbot schema: `psql -d homeu -f apps/website/src/lib/chatbot/schema.sql`

---

## Workflows

### Workflow A: First Website Visit
```
Visitor opens website
  → chatbot bubble appears after delay (3-5s homepage, 6-8s product page)
  → bot greets visitor with proactive message
  → visitor taps bubble → chat opens
  → visitor taps button or types
  → if action requires free chat/image/RFQ → show lead gate
  → lead fills name/email/mobile + consent
  → create lead record → create conversation
  → continue guided flow
```

### Workflow B: Image-Based Product Recommendation
```
Visitor uploads image
  → save image to S3-compatible storage
  → AI vision describes image (category/style/material/color)
  → run product text search + embedding search
  → rank results (closest match, style alt, budget alt, premium alt)
  → return 3-6 product recommendation cards
  → ask quantity/location/use case
  → offer Add to RFQ or Book Showroom
  → if qualified → send Telegram alert
```

### Workflow C: Text-Based Product Search
```
Visitor types product need
  → extract intent + product attributes via AI classifier
  → search product catalog (title, tags, category, materials, colors)
  → return recommended product cards
  → ask clarifying question if confidence < 0.7
  → offer Add to RFQ or Book Showroom
```

### Workflow D: RFQ Cart Submission
```
Visitor adds items to RFQ cart
  → bot asks quantity per item (if not specified)
  → bot asks delivery location
  → bot asks project type
  → bot asks target date
  → bot asks budget (optional)
  → bot suggests complementary items (bundle intelligence)
  → bot confirms summary
  → visitor submits RFQ
  → save RFQ to admin panel
  → send Telegram group alert
  → lead scored + updated
```

### Workflow E: Showroom Appointment
```
Visitor requests showroom visit
  → check lead gate (require if not done)
  → ask preferred date/time
  → ask categories to view
  → ask number of visitors
  → save appointment request
  → send Telegram alert
  → admin confirms manually
```

### Workflow F: Viber Sales Handoff
```
Conversation reaches qualification trigger
  → bot offers Viber sales contact
  → bot shows sales rep Viber number + name
  → bot asks whether to also send RFQ to sales team
  → save handoff event
  → notify Telegram
  → mark conversation as needs_human
```

### Workflow G: Human Escalation
```
Escalate when:
  - User asks "final price" or specific quotation
  - User asks delivery fee (FAQ gap)
  - User asks stock availability
  - User complains
  - AI confidence < 0.65
  - User requests custom/bespoke furniture
  - Large project detected (100+ units)
  → mark conversation as "needs_human"
  → Telegram alert with context
  → admin panel shows urgent badge
  → bot tells user "Our sales team will follow up"
```

### Workflow H: Lead Scoring Pipeline
```
Every visitor action triggers score recalculation:
  +5  Lead gate completed
  +10 Product page visit detected
  +15 Image uploaded
  +20 Item added to RFQ cart
  +25 RFQ submitted
  +10 Appointment requested
  +5  Viber handoff accepted
  +3  Per message in conversation

  Thresholds:
  0-20: cold (lead gen, nurture)
  21-50: warm (qualified interest, follow-up)
  51-80: hot (ready for sales contact)
  81-100: qualified (priority follow-up within 24h)
```

---

## AI Integration

### Provider Adapter Pattern
```typescript
interface AIProvider {
  generateText(prompt: string, system?: string): Promise<string>
  analyzeImage(imageUrl: string, prompt: string): Promise<string>
  createEmbedding(text: string): Promise<number[]>
  classifyIntent(text: string): Promise<IntentResult>
}

// Providers: GeminiFlash, GPT4oMini, OllamaLocal
```

### Intent Classification Output
```json
{
  "intent": "RFQ_REQUEST",
  "confidence": 0.84,
  "entities": {
    "category": "Dining Chair",
    "quantity": 40,
    "location": "BGC, Taguig",
    "timeline": "3 weeks",
    "budget": null,
    "style": ["modern", "upholstered"],
    "material": ["fabric", "wood legs"],
    "color": ["beige", "walnut"]
  },
  "nextAction": "ASK_CLARIFYING_QUESTION",
  "shouldEscalate": false,
  "shouldOfferViber": true
}
```

### Supported Intents
- `PRODUCT_SEARCH` — text-based product finding
- `IMAGE_MATCH` — photo-based product matching
- `RFQ_REQUEST` — asking to buy/quote
- `APPOINTMENT_REQUEST` — showroom visit
- `PRICE_QUESTION` — asking about pricing
- `AVAILABILITY_QUESTION` — stock/inventory
- `DELIVERY_QUESTION` — shipping/delivery
- `CUSTOM_FURNITURE` — bespoke requests
- `SALES_HANDOFF` — wants to talk to human
- `COMPLAINT` — unhappy with something
- `FAQ` — general website question
- `GREETING` — initial hello
- `UNKNOWN` — fallback

---

## UI Components

### Chat Widget States
1. **Minimized** — Floating bubble, shows notification dot
2. **Lead Gate** — Name/email/mobile form (first time only)
3. **Chat Active** — Message list + input + quick action buttons
4. **Product Cards** — Product recommendation grid
5. **RFQ Cart Drawer** — Slide-out panel showing RFQ items
6. **Appointment Picker** — Date/time/category selector
7. **Viber Handoff** — Contact info + option to send RFQ

### Quick Action Buttons
After lead gate, show these as buttons:
- 🔍 Find Similar Product
- 📷 Send Product Photo
- 📋 Request Quotation
- 📅 Book Showroom Visit
- 💬 Contact Sales on Viber

### Design Tokens (match HomeU brand)
```css
--chat-primary: #173f2f;       /* HomeU brand green */
--chat-primary-hover: #0f2e22;
--chat-bg: #ffffff;
--chat-bubble-bot: #f6f3ee;    /* warm off-white */
--chat-bubble-user: #173f2f;
--chat-text-bot: #1f2420;
--chat-text-user: #ffffff;
--chat-accent: #b88935;        /* HomeU gold */
--chat-border: #dfd8ce;
```

---

## State Management

The chatbot uses a **React context-based state machine** with these states:

```typescript
type ChatState =
  | 'idle'           // Not started
  | 'greeting'       // Bot sent proactive greeting
  | 'lead_gate'      // Showing lead capture form
  | 'chat_active'    // Free conversation mode
  | 'showing_products' // Showing recommendation cards
  | 'rfq_cart'       // RFQ cart drawer open
  | 'appointment'    // Appointment booking form
  | 'viber_handoff'  // Viber contact info
  | 'submitting'     // Form submission in progress
  | 'success'        // RFQ submitted confirmation
  | 'error'          // Error state
```

---

## API Endpoints

### POST /api/chat/leads
Create lead (required before free chat unlocks).

**Request:**
```json
{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "mobile": "09171234567",
  "buyerType": "Architect",
  "companyName": "Studio ABC",
  "sourcePage": "/collections/dining-chairs"
}
```

**Response:**
```json
{
  "leadId": "uuid",
  "conversationId": "uuid"
}
```

### POST /api/chat/message
Send a message and get bot reply.

**Request:**
```json
{
  "conversationId": "uuid",
  "leadId": "uuid",
  "message": "I need 40 dining chairs for a restaurant",
  "currentPage": "/collections/dining-chairs"
}
```

**Response:**
```json
{
  "reply": "I can help with that. Do you prefer upholstered, wood, or metal chairs?",
  "actions": ["ASK_QUANTITY", "RECOMMEND_PRODUCTS"],
  "productRecommendations": [],
  "quickReplies": ["Upholstered", "Wood", "Metal", "Show me all"]
}
```

### POST /api/chat/upload-image
Upload furniture/lighting photo for analysis.

**Request:** Multipart form with `conversationId`, `leadId`, `image`

**Response:**
```json
{
  "imageId": "uuid",
  "description": "Modern beige upholstered dining chair with wooden legs",
  "extractedAttributes": {
    "category": "Dining Chair",
    "style": ["modern"],
    "material": ["fabric", "wood"],
    "color": ["beige"]
  },
  "recommendations": []
}
```

### POST /api/products/recommend
Product search and similarity matching.

**Request:**
```json
{
  "conversationId": "uuid",
  "query": "modern dining chair beige fabric",
  "imageId": "uuid",
  "limit": 6
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "productId": "product-id",
      "title": "Beige Upholstered Dining Chair",
      "url": "/products/beige-upholstered-dining-chair",
      "imageUrl": "https://...",
      "referencePrice": 8500,
      "reason": "Similar fabric, color, and dining chair shape",
      "matchType": "closest_match",
      "confidence": 0.87
    }
  ]
}
```

### POST /api/rfq/add-item
Add product to RFQ cart.

**Request:**
```json
{
  "leadId": "uuid",
  "conversationId": "uuid",
  "productId": "product-id",
  "quantity": 10,
  "notes": "Need beige fabric",
  "acceptsAlternatives": true,
  "matchType": "closest_match"
}
```

### POST /api/rfq/submit
Submit RFQ for sales review.

**Request:**
```json
{
  "rfqCartId": "uuid",
  "deliveryLocation": "BGC, Taguig",
  "projectType": "Restaurant",
  "targetDate": "2026-07-30",
  "budgetRange": "100k-200k",
  "notes": "Need delivery and installation estimate"
}
```

### POST /api/appointments/request
Request showroom appointment.

**Request:**
```json
{
  "leadId": "uuid",
  "conversationId": "uuid",
  "preferredDate": "2026-07-05",
  "preferredTime": "2:00 PM",
  "visitorCount": 2,
  "categoriesOfInterest": ["Dining Chairs", "Lighting"]
}
```

---

## Telegram Alerts

### Trigger Events
- `NEW_LEAD` — Lead gate completed with qualified info
- `RFQ_SUBMITTED` — RFQ cart submitted
- `APPOINTMENT_REQUESTED` — Showroom visit requested
- `ESCALATION` — Bot escalated to human
- `HOT_LEAD` — Lead score crossed "hot" threshold
- `ABANDONED` — High-value lead dropped off

### Alert Format
```
🏠 HomeU Concierge — New RFQ Lead

Name: Maria Santos
Mobile: 0917xxxxxxx
Email: maria@example.com
Type: Architect
Score: 72 (hot)
Need: 40 modern dining chairs for restaurant
Location: BGC, Taguig
Timeline: 3 weeks
RFQ Items: 3
Source: /products/dining-chairs
Conversation: 12 messages

Admin: https://admin.homeu.ph/admin/collections/leads/{id}
```

---

## Bot Prompts

### System Prompt (Concise)
```
You are HomeU Concierge, the website assistant for HomeU.PH — a furniture and lighting showroom.
The website is NOT an online shop. Prices are reference only. Do not accept orders or payments.
Your goal: help visitors find products, build RFQ carts, request quotations, book showroom visits, and connect with sales via Viber.

Always be warm, professional, concise, and sales-supportive.

Never say: buy now, checkout, place order, pay now, final price guaranteed, stock guaranteed.
Always remind: "Prices are for reference only. Final quotation depends on quantity, availability, finish, delivery location, and project requirements."
```

### Lead Gate Message
```
Hi! I can help you find furniture or lighting, recommend similar products from a photo, prepare an RFQ, or book a showroom visit.

Before we continue, please enter your name, email, and mobile number so our team can reply properly.
```

### Greeting Messages
- **Homepage**: "Hi! Looking for furniture or lighting? You can send a photo, describe what you need, or add items to your RFQ cart. Would you like help finding a product or booking a showroom visit?"
- **Product page**: "Interested in this item? I can help check similar options, add it to your RFQ cart, or arrange a showroom appointment."
- **Returning visitor**: "Welcome back! Would you like to continue where you left off, or start something new?"

---

## QA Checklist

### Functional
- [ ] Chat bubble appears after correct delay per page type
- [ ] Lead gate appears before free typing/image upload/RFQ
- [ ] Email format validation works
- [ ] Mobile number minimum length validated
- [ ] Consent checkbox required
- [ ] Product recommendations display with images + prices
- [ ] Product links open correct catalog pages
- [ ] RFQ cart adds/removes items correctly
- [ ] Quantity can be edited in cart
- [ ] RFQ submission creates admin record
- [ ] Telegram alert sent for qualified events
- [ ] Appointment request stores correctly
- [ ] Viber number appears only at appropriate moment
- [ ] No checkout/payment wording anywhere

### AI / Safety
- [ ] Bot does not hallucinate product URLs
- [ ] Bot states "prices for reference only" appropriately
- [ ] Bot escalates to human when confidence < 0.65
- [ ] Bot extracts product category correctly from text
- [ ] Bot asks for missing quantity/location
- [ ] Bot does not promise stock availability
- [ ] Bot does not finalize quotation

### Security
- [ ] Telegram bot token is server-only (never in frontend)
- [ ] AI API keys are server-only
- [ ] Image upload accepts only image MIME types
- [ ] File size limit enforced (max 10MB)
- [ ] Rate limiting on all chat endpoints (100 req/min per IP)
- [ ] Admin pages require authentication
- [ ] Spam marking available in admin

### Performance
- [ ] Chat widget loads without blocking product page rendering
- [ ] Widget CSS/JS is lazy-loaded or code-split
- [ ] Images compressed on upload
- [ ] Product search returns under 2 seconds
- [ ] AI calls timeout gracefully (10s default)
- [ ] Fallback reply works if AI provider is down

---

## Environment Variables

```bash
# --- AI Provider ---
AI_PROVIDER=gemini               # gemini | openai | ollama
GEMINI_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# --- Telegram ---
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_CHAT_ID=

# --- File Storage ---
S3_ENDPOINT=
S3_BUCKET=homeu-chat-uploads
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# --- Sales ---
SALES_VIBER_NUMBER=+639171234567
SALES_VIBER_NAME=HomeU Sales Team
SALES_EMAIL=sales@homeu.ph

# --- Chat Widget Config ---
NEXT_PUBLIC_CHAT_GREETING_DELAY=4000
NEXT_PUBLIC_CHAT_PRODUCT_PAGE_DELAY=7000
NEXT_PUBLIC_ENABLE_CHAT=true
```

---

## Phased Build Plan

### Phase 1: Foundation (Current Build)
1. Database schema (chatbot schema + tables)
2. AI provider abstraction layer
3. Intent classifier (rule-based MVP)
4. Chat API endpoints (leads, messages, products)
5. Chat widget UI (bubble, lead gate, messages, product cards)
6. RFQ cart integration with existing QuoteCart
7. Telegram notification client
8. Lead scoring engine (basic)
9. Integration into root layout
10. Chat widget styles

### Phase 2: AI Enhancement
1. AI vision for image upload analysis
2. Visual similarity product search
3. AI-powered intent classification (replace rule-based)
4. Product embedding search via pgvector
5. Shop-floor lead scoring with sentiment analysis

### Phase 3: Intelligence Loop
1. Weekly AI analytics summary
2. Auto-FAQ generation from unanswered questions
3. Bundle/complementary product suggestions
4. Abandoned chat recovery
5. Sales coach mode for admin
6. Shopify product sync pipeline

---

## Chatbot Directory Structure (Summary)

```
apps/website/src/
├── app/api/chat/
│   ├── leads/route.ts
│   ├── message/route.ts
│   ├── upload-image/route.ts
│   ├── products/recommend/route.ts
│   ├── rfq/add-item/route.ts
│   ├── rfq/submit/route.ts
│   └── appointments/request/route.ts
├── components/chat/
│   ├── ChatWidget.tsx
│   ├── LeadGateForm.tsx
│   ├── MessageList.tsx
│   ├── ProductRecommendationCard.tsx
│   ├── RFQCartDrawer.tsx
│   ├── AppointmentPicker.tsx
│   ├── ViberHandoff.tsx
│   └── chat.css
├── lib/chatbot/
│   ├── schema.sql
│   ├── ai-provider.ts
│   ├── prompts.ts
│   ├── intent-classifier.ts
│   ├── product-search.ts
│   ├── visual-search.ts
│   ├── lead-scorer.ts
│   ├── telegram-client.ts
│   ├── rfq-service.ts
│   └── appointment-service.ts
└── app/layout.tsx (modified — add ChatWidget)

tools/chatbot/
├── seed-products.ts
└── telegram-webhook.ts
```

---

## Related Skills

- **CRM** — Customer lifecycle, RFQ pipeline, quotation management
- **Frontend** — Component patterns, styling, storefront pages
- **Next.js** — App router, API routes, server/client components
- **Shopify** — Product sync, catalog data sources
