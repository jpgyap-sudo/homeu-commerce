# Workflow Diagrams — HomeU Migration

## 1. Safe Domain Architecture

```mermaid
flowchart LR
    A[Customer visits homeu.ph] --> B[🔴 Live Shopify - DO NOT TOUCH]
    C[Admin visits admin.homeu.ph] --> D[🟢 Payload CMS on VPS]
    E[Preview store.homeu.ph] --> F[🟢 Next.js Frontend]
    F --> D
    D --> G[(PostgreSQL)]
    G --> H[Migration Central Brain]
```

## 2. Migration Pipeline

```mermaid
flowchart TD
    P0[Phase 0: Stabilize VPS] --> P1[Phase 1: Reverse Engineer Shopify]
    P1 --> P2[Phase 2: SEO URL Map]
    P2 --> P3[Phase 3: Product Sync]
    P3 --> P4[Phase 4: Image Pipeline]
    P4 --> P5[Phase 5: Frontend store.homeu.ph]
    P5 --> P6[Phase 6: RFQ Cart]
    P6 --> P7[Phase 7: AI Agent Layer]
    P7 --> P8[Phase 8: Visual QA]
    P8 --> P9{Phase 9: Launch Decision}
    P9 -- Stay Hybrid --> P10[Keep Shopify + New Frontend]
    P9 -- Full Migration --> P11[Move main domain to VPS]
    P11 --> P12[Monitor + Rollback Ready]
```

## 3. Central Brain Architecture

```mermaid
flowchart TD
    subgraph "Data Sources"
        S1[Playwright Scanner]
        S2[Shopify MCP Server]
        S3[Shopify Export Parser]
    end
    subgraph "Central Brain PostgreSQL"
        T1[scanned_pages]
        T2[products]
        T3[collections]
        T4[images]
        T5[url_mappings]
        T6[navigation]
        T7[visual_analysis]
        T8[brain_memories]
        T9[migration_phases]
        T10[migration_errors]
    end
    subgraph "Intelligence Layer"
        H1[Hermes3 Reasoner]
        H2[Ollama Vision llava:7b]
    end
    subgraph "Output"
        O1[Payload CMS Import]
        O2[301 Redirect Map]
        O3[SEO Report]
        O4[Component Mappings]
    end
    S1 --> T1
    S1 --> T2
    S1 --> T3
    S2 --> T2
    S2 --> T3
    S3 --> T2
    S3 --> T4
    T1 --> H1
    T2 --> H1
    T5 --> H1
    H1 --> T8
    H1 --> T10
    H2 --> T7
    H1 --> O1
    H1 --> O2
    H1 --> O3
    H1 --> O4
```

## 4. Shopify Reverse Engineering Workflow

```mermaid
flowchart TD
    A[www.homeu.ph] --> B{Which access method?}
    B -- Admin API --> C[Shopify MCP Server]
    B -- Public crawl --> D[Playwright Scanner]
    C --> E[Full product data]
    C --> F[Collections with product mappings]
    C --> G[Pages with SEO]
    C --> H[Blogs with articles]
    C --> I[Theme assets]
    D --> J[URL discovery]
    D --> K[SEO metadata]
    D --> L[Screenshots]
    D --> M[HTML snapshots]
    D --> N[Image URLs]
    E --> O[Migration Central Brain]
    F --> O
    G --> O
    H --> O
    J --> O
    K --> O
    L --> O[Visual Analysis]
    O --> P[Payload CMS Import]
    O --> Q[301 Redirect Map]
    O --> R[SEO Report]
    O --> S[Component Map]
```

## 5. RFQ Cart Workflow

```mermaid
flowchart TD
    A[Customer views product] --> B{Has price?}
    B -- Yes --> C[Show price]
    B -- No --> D[Show "Contact for price"]
    C --> E[Add to RFQ button]
    D --> E
    E --> F[QuoteCart.tsx - localStorage]
    F --> G[Cart page - edit quantities/notes]
    G --> H[Submit RFQ form]
    H --> I[Payload CMS - RFQRequests collection]
    H --> J[Email notification to business]
    I --> K[Admin views in admin.homeu.ph/admin]
    K --> L[Update status: new/contacted/quoted/closed]
```

## 6. AI Agent Safety Workflow

```mermaid
flowchart TD
    A[User request] --> B[Hermes3 Reasoner]
    B --> C{Requires write?}
    C -- No --> D[Execute read-only]
    D --> E[Return results]
    C -- Yes --> F[Generate plan]
    F --> G[approval.mjs - ask user]
    G --> H{User typed "yes"?}
    H -- No --> I[❌ DENIED - no changes]
    H -- Yes --> J[✅ Execute with audit log]
    J --> K[Log to migration_errors/Central Brain]
```

## 7. Data Flow: Shopify → Payload → Frontend

```mermaid
flowchart LR
    subgraph "Shopify (Source of Truth)"
        SP[Shopify Products]
        SC[Shopify Collections]
        SI[Shopify Images]
        SS[Shopify SEO]
    end
    subgraph "Migration Tools"
        MCP[Shopify MCP Server]
        PW[Playwright Scanner]
        CB[Migration Central Brain]
        H3[Hermes3 Validation]
    end
    subgraph "New System"
        PC[Payload CMS]
        NF[Next.js Frontend]
        PG[(PostgreSQL)]
    end
    SP --> MCP
    SC --> MCP
    SS --> PW
    SI --> PW
    MCP --> CB
    PW --> CB
    CB --> H3
    H3 --> PC
    PC --> PG
    PG --> NF
    NF --> store.homeu.ph
```

## 8. Launch Decision Workflow

```mermaid
flowchart TD
    A[Frontend complete] --> B[SEO URLs verified]
    B --> C[RFQ tested on staging]
    C --> D[Mobile QA passed]
    D --> E[Rollback plan ready]
    E --> F{Move main domain?}
    F -- No --> G[Keep Shopify main site]
    G --> H[store.homeu.ph as permanent preview]
    F -- Yes --> I[Schedule low-traffic window]
    I --> J[Change DNS: homeu.ph → VPS]
    J --> K[Monitor errors + SEO]
    K --> L{Problem detected?}
    L -- Yes --> M[Rollback: repoint DNS to Shopify]
    L -- No --> N[Migration successful]
    M --> O[Fix issues, try again]
```

## 9. Migration Central Brain Data Model

```mermaid
erDiagram
    scanned_pages ||--o{ products : contains
    scanned_pages ||--o{ collections : organizes
    products }o--|| collections : "product_collections"
    products ||--o{ images : has
    products ||--o{ url_mappings : maps
    scanned_pages ||--o{ url_mappings : redirects
    scanned_pages ||--o{ visual_analysis : analyzed
    collections ||--o{ navigation : "menu items"
    migration_phases ||--o{ migration_errors : logs
    brain_memories ||--o{ brain_memories : relates
    products {
        int shopify_id PK
        string handle UK
        string title
        decimal price
        string dimensions
        string materials
        string status
    }
    collections {
        int shopify_id PK
        string handle UK
        string title
        int parent_id FK
    }
    images {
        int id PK
        int product_id FK
        string original_url
        string checksum
        string status
    }
    url_mappings {
        int id PK
        string shopify_url UK
        string new_url
        string redirect_type
    }
    migration_phases {
        int id PK
        string phase
        string status
        int total_items
        int processed_items
    }
```
