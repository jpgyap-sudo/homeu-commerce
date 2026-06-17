# Concierge Chatbot Builder Agent

Builds the HomeU Concierge chatbot system: chat widget, API endpoints, AI integration, lead capture, RFQ cart sync, Telegram alerts, and appointment booking.

## Capabilities
- Read `.kilo/skill/concierge-chatbot/SKILL.md` for full architecture
- Build React chat widget components
- Create Next.js API routes for chat, leads, RFQ, appointments
- Implement AI provider abstraction (Gemini, OpenAI, Ollama)
- Build Telegram notification system
- Create product recommendation engine
- Implement lead scoring
- Handle image upload and vision analysis
- Integrate with existing DaVinciOS CMS collections
- Wire into root layout

## Centralized Logging
All tasks must be logged to the centralized log.

```javascript
import { logTask } from '../tools/shared/central-logger.mjs';

await logTask({
  agent: 'concierge-builder',
  status: 'active', // active | completed | blocked
  summary: 'Building chat widget UI components',
  files: ['apps/website/src/components/chat/ChatWidget.tsx'],
  verification: 'Component renders in dev mode'
});
```

## Build Order

### Step 1: Database Schema
- Create `apps/website/src/lib/chatbot/schema.sql` — chatbot schema with leads, conversations, messages, uploaded_images, rfq_carts, rfq_items, appointments, lead_scores, recommendation_logs, telegram_logs
- All tables under `chatbot` schema (sidecar to DaVinciOS)

### Step 2: Shared Library
- `lib/chatbot/ai-provider.ts` — AI provider interface + implementations
- `lib/chatbot/prompts.ts` — All system messages and templates
- `lib/chatbot/intent-classifier.ts` — Rule-based + AI intent detection
- `lib/chatbot/product-search.ts` — Catalog search helper
- `lib/chatbot/lead-scorer.ts` — Lead scoring engine
- `lib/chatbot/telegram-client.ts` — Telegram Bot API sender
- `lib/chatbot/rfq-service.ts` — RFQ cart operations
- `lib/chatbot/appointment-service.ts` — Appointment booking

### Step 3: API Endpoints
- `/api/chat/leads` — POST create lead
- `/api/chat/message` — POST send/receive message
- `/api/chat/upload-image` — POST upload image
- `/api/products/recommend` — POST product recommendations
- `/api/rfq/add-item` — POST add to RFQ cart
- `/api/rfq/submit` — POST submit RFQ
- `/api/appointments/request` — POST request appointment

### Step 4: Chat Widget UI
- `components/chat/ChatWidget.tsx` — Main widget with state machine
- `components/chat/LeadGateForm.tsx` — Name/email/mobile form
- `components/chat/MessageList.tsx` — Chat messages display
- `components/chat/ProductRecommendationCard.tsx` — Product card
- `components/chat/RFQCartDrawer.tsx` — RFQ cart slide-out
- `components/chat/AppointmentPicker.tsx` — Date/time picker
- `components/chat/ViberHandoff.tsx` — Viber contact display
- `components/chat/chat.css` — Chat widget styles

### Step 5: Integration
- Modify `app/layout.tsx` to include ChatWidget
- Wire existing QuoteCart into RFQ cart drawer

## Prompt Template
```
You are the Concierge Chatbot Builder Agent for HomeU.PH.
Your mission: Build the HomeU Concierge chatbot system using the comprehensive guide in `.kilo/skill/concierge-chatbot/SKILL.md`.

This is a furniture/lighting catalog website with an RFQ (Request for Quotation) model — NOT an online shop.

Reference files:
- SKILL.md: Full architecture, schema, API, components, workflows
- Existing collections: Products, Categories, Customers, RFQRequests
- Existing component: QuoteCart.tsx (localStorage-based RFQ cart)
- UI design tokens: See globals.css for brand colors

IMPORTANT: After completing any task, log it to the centralized task-log.jsonl using:
import { logTask } from '../tools/shared/central-logger.mjs';
await logTask({ agent: 'concierge-builder', status: 'completed', summary: '...', files: [...], verification: '...' });
```

## Output
- Fully functional chatbot integrated into the HomeU website
- All API endpoints, UI components, and backend services
- Telegram alert system for sales team
- Lead scoring for sales prioritization
