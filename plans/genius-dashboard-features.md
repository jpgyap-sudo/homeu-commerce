# Genius Dashboard Features for MTO Furniture Business

## Strategic Context
HomeU sells **Made-to-Order furniture** — no inventory, custom per order, RFQ-driven, high-ticket, long sales cycle. The dashboard should show **what matters for THIS business model**, not generic e-commerce metrics.

---

## Tier 1: Quick Wins (Can build in hours)

### 1. 📊 Conversion Funnel with Bottlenecks
**Problem**: Leads come in but you don't know where they drop off.
**Genius Insight**: Show the funnel **Visit → Lead → RFQ → Quoted → Closed** with % drop-off at each stage and a "biggest leak" alert.
**For MTO**: The RFQ→Quoted step is critical — if you're slow to respond, you lose the sale.

### 2. ⏱️ Response Time Health
**Problem**: MTO customers expect fast answers. If you reply to RFQs in 3 days vs 3 hours, you lose.
**Genius Insight**: Show **average response time** to new leads and RFQs with a target gauge (green/yellow/red). Track trend over time.
**Data already available**: `chatbot.conversations.last_message_at` vs lead created_at.

### 3. 🔥 Hot Products by Inquiry
**Problem**: Which products generate the most RFQs? Which generate zero interest?
**Genius Insight**: "Top 10 Most Inquired" list + "Products with Zero Inquiry" list (actionable).
**For MTO**: Tells you what to feature on homepage vs what to discontinue.

### 4. 📅 Weekly Pulse Score
**Problem**: Is the business growing or shrinking week-over-week?
**Genius Insight**: Single number (0-100) combining: New Leads (+), RFQs Submitted (+), Quotations Sent (+), Unread Messages (-), Stale RFQs (-), Unreplied Conversations (-).

---

## Tier 2: Game Changers (1-2 days each)

### 5. 🎯 Lead Score Distribution with Action Prompt
**Problem**: You have 50 leads — which do you call first?
**Genius Insight**: Show leads ranked by score with "Call now" prompt for hot leads, "Nurture" for warm, "Review" for cold. Include last contact time and source.
**For MTO**: High-intent leads (specific dimensions, ready to order) bubble to top.

### 6. 📋 RFQ Aging Dashboard
**Problem**: Old RFQs get forgotten.
**Genius Insight**: Bar chart of RFQs by age: 0-24h (green), 1-3d (yellow), 3-7d (orange), 7d+ (red). Show count and total potential value.
**For MTO**: An RFQ sitting 7 days unanswered = lost sale (customer went elsewhere).

### 7. 💬 Multi-Channel Inbox Summary
**Problem**: Messages come from Facebook, Instagram, Email, Website Chat — scattered.
**Genius Insight**: Single "Unified Inbox Pulse" card showing: unread by channel, response rate, oldest unanswered message.
**Already partially built**: Dashboard insights API exists — just needs UI card.

### 8. 🚀 Weekly Revenue Forecaster
**Problem**: Hard to predict cash flow with MTO.
**Genius Insight**: "Pipeline Value" = sum of quoted RFQs × historical close rate. Show projected revenue for this week, next 2 weeks, next month.
**For MTO**: Critical for planning material purchases and production scheduling.

---

## Tier 3: MTO-Specific Genius (2-3 days each)

### 9. 🏭 Production Capacity Heatmap
**Problem**: You can only make X pieces per week. Are you overbooked?
**Genius Insight**: Calendar heatmap showing: confirmed orders vs estimated capacity. Color-coded: green (under capacity), yellow (near limit), red (overbooked).
**For MTO**: Prevents promising delivery dates you can't meet.

### 10. 📦 Material Sourcing Dashboard
**Problem**: Different materials (wood types, finishes, fabrics) have different lead times.
**Genius Insight**: Show pending orders grouped by material type with supplier lead time warnings. "⚠️ 3 pending orders need Santos Mahogany — supplier lead time is 2 weeks."
**For MTO**: Prevents production delays from material shortages.

### 11. 📈 Customer Lifetime Value (CLV) Tracker
**Problem**: Are customers returning? Who are your top 10 most valuable accounts?
**Genius Insight**: List of top customers by total RFQ value, total orders, average order value, last order date. Show repeat customer rate.
**For MTO**: Repeat customers are gold — they already trust your quality.

### 12. 🧠 AI Sales Assistant (Daily Briefing)
**Problem**: Too many data points — what actually needs attention TODAY?
**Genius Insight**: AI-generated daily briefing: "Good morning! You have 3 hot leads to call, 2 RFQs over 48h waiting, 5 unread Instagram DMs. Your pipeline value is ₱450K with 60% expected close rate."
**For MTO**: Saves 30 minutes every morning figuring out priorities.

### 13. 🔍 Abandoned RFQ Recovery
**Problem**: Customers start RFQ but don't submit — lost opportunity.
**Genius Insight**: List of abandoned RFQ carts with: items added, customer contact (if available), time since abandonment. "Showroom your RFQ" email/SMS reminder button.
**For MTO**: MTO purchases are considered — a nudge can close the deal.

### 14. 📊 Category Performance Matrix
**Problem**: Which furniture categories are trending?
**Genius Insight**: Grid showing each category (Sofas, Tables, Chairs, Beds) with: RFQ volume trend, average value, quote-to-close rate, popular materials.
**For MTO**: Tells you where to focus marketing and which materials to stock.

### 15. 🎯 Sales Goal Tracker
**Problem**: Are we on track for monthly targets?
**Genius Insight**: Visual progress bar: "Target: ₱500K this month | Pipeline: ₱350K (70%) | Quoted: ₱200K (40%) | Closed: ₱80K (16%) | Days remaining: 12"
**For MTO**: Long sales cycle means pipeline is as important as closed deals.

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Data Ready? | Priority |
|---------|--------|--------|-------------|----------|
| 1. Conversion Funnel | 🔥🔥🔥 | Low | ✅ Yes | **P0** |
| 2. Response Time | 🔥🔥🔥 | Low | ✅ Yes | **P0** |
| 3. Hot Products | 🔥🔥 | Low | ✅ Yes | **P1** |
| 4. Weekly Pulse | 🔥🔥 | Low | ✅ Yes | **P1** |
| 5. Lead Score Actions | 🔥🔥🔥 | Medium | ⚠️ Partial | **P1** |
| 6. RFQ Aging | 🔥🔥🔥 | Low | ✅ Yes | **P0** |
| 7. Inbox Pulse | 🔥🔥 | Low | ✅ Yes | **P1** |
| 8. Revenue Forecaster | 🔥🔥🔥 | Medium | ✅ Yes | **P1** |
| 9. Production Heatmap | 🔥🔥 | High | ❌ Needs new table | **P2** |
| 10. Material Sourcing | 🔥 | High | ❌ Needs new table | **P2** |
| 11. CLV Tracker | 🔥🔥 | Medium | ⚠️ Partial | **P2** |
| 12. AI Daily Briefing | 🔥🔥🔥 | High | ⚠️ Partial | **P2** |
| 13. Abandoned RFQ | 🔥🔥 | Medium | ✅ Yes (cart exists) | **P1** |
| 14. Category Matrix | 🔥 | Medium | ✅ Yes | **P2** |
| 15. Sales Goal Tracker | 🔥🔥🔥 | Low | ⚠️ Needs target config | **P1** |

---

## P0 Features (Build First — Highest Impact, Already Have Data)

### Conversion Funnel Visualization
```
Visitors ─→ Leads ─→ RFQs ─→ Quoted ─→ Closed
  100%       23%       12%        8%        3%
  ─────      ─────     ─────      ─────     ─────
  77% drop   48% drop  33% drop   63% drop  ← bottlenecks
```
**GREEN**: Keep rate > industry avg
**RED**: Leak needs attention (e.g. "33% drop RFQ→Quoted = slow response")

### RFQ Aging
```
🟢 0-24h: 12 RFQs (₱240K pipeline)
🟡 1-3d:  5 RFQs  (₱85K) 
🟠 3-7d:  2 RFQs  (₱45K)  ← Needs attention!
🔴 7d+:   1 RFQ   (₱30K)  ← CRITICAL!
```

### Response Time Health
```
⏱️ Avg Response Time: 3.5 hours
   Target: < 2 hours → 🟡 Needs work
   Best day: Mon (1.2h avg)
   Worst day: Sat (8.5h avg)
```

### Sales Goal Tracker
```
🎯 March Target: ₱800,000
   Pipeline:      ₱520,000 (65%)
   Quoted:        ₱310,000 (39%)
   Closed:        ₱145,000 (18%)
   ════════════════════════════
   ████████████░░░░░░░░░░ 48%
   Days remaining: 14
```
