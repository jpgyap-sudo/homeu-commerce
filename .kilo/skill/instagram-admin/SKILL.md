# Instagram Admin Moderation Skill

## Purpose
Admin moderation interface for Instagram posts — approve, hide, pin, tag products, tag collections, manual upload. Full content moderation workflow before posts appear on the storefront.

## Data Model
```sql
instagram_posts (
  id, image_url, caption, permalink, alt_text,
  media_type VARCHAR DEFAULT 'IMAGE',  -- IMAGE | VIDEO | CAROUSEL_ALBUM
  width, height,
  is_visible BOOLEAN DEFAULT TRUE,     -- Show/hide toggle
  is_pinned BOOLEAN DEFAULT FALSE,     -- Pin to top of feed
  status VARCHAR DEFAULT 'pending',    -- pending | approved | rejected
  source VARCHAR DEFAULT 'manual_upload', -- instagram | manual_upload
  products JSONB DEFAULT '[]',         -- Tagged product IDs [{id, title, handle}]
  hotspots JSONB DEFAULT '[]',         -- Coordinate hotspots
  collection_ids INTEGER[] DEFAULT '{}', -- Tagged collection IDs
  tags VARCHAR[] DEFAULT '{}',         -- Hashtag/category tags
  instagram_media_id VARCHAR,          -- Instagram Graph API media ID
  permalink VARCHAR,                   -- Instagram post URL
  synced_at TIMESTAMP WITH TIME ZONE,  -- Last sync timestamp
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Admin Pages
- `/admin/apps` — Category Apps dashboard
- `/admin/apps/instagram` — Instagram Feed admin:
  - **Posts tab**: Grid of all posts with actions
  - **Grids tab**: Manage published/draft grids
  - **Settings tab**: Instagram API connection + sync controls

## Moderation Actions (API endpoints)

### Pin/Unpin Post
```
PATCH /api/admin/instagram/posts
Body: { id: postId, is_pinned: true }
```
Pinned posts sort first in feeds.

### Hide/Show Post
```
PATCH /api/admin/instagram/posts
Body: { id: postId, is_visible: false }
```
Hidden posts don't appear in public API or storefront. Shown as 👁️‍🗨️ overlay in admin.

### Approve/Reject Post
```
PATCH /api/admin/instagram/posts
Body: { id: postId, status: 'approved' }  // or 'rejected'
```
- `pending`: Just synced from Instagram, awaiting review
- `approved`: Visible on storefront (if is_visible=true)
- `rejected`: Hidden indefinitely

### Delete Post
```
DELETE /api/admin/instagram/posts?id={postId}
```
Removes post AND nullifies any grid_cells referencing it.

### Tag Products
```
PATCH /api/admin/instagram/posts
Body: { id: postId, products: [{id: 1, title: "Aalto Sofa", handle: "aalto-sofa"}] }
```
Products appear as shoppable tags on the storefront hover overlay.

### Tag Collections
```
PATCH /api/admin/instagram/posts
Body: { id: postId, collection_ids: [1, 3, 5] }
```

## Manual Upload Flow
1. Admin clicks "+ Add Post"
2. Enters: Image URL, Caption, Instagram Permalink (optional), Source
3. Post saved with `source='manual_upload'`, `status='approved'`
4. Immediately available for grid creation

## Grid Management
- **Create**: Select posts → choose layout algorithm → set cols/rows/gap → set display locations
- **Publish**: Toggle grid from draft → published
- **Delete**: Removes grid and all associated grid_cells
- **Display On**: homepage | products | collections | blog | custom

## Moderation Workflow
```
Instagram Sync → [status=pending] → Admin Review
  ├── Approve → [status=approved, is_visible=true] → Live on storefront
  ├── Hide → [is_visible=false] → Hidden from storefront
  ├── Pin → [is_pinned=true] → Top of feed
  ├── Tag Products → [products JSONB updated] → Shoppable
  └── Reject → [status=rejected] → Hidden permanently
```

## UI Patterns for Moderation
- **Status badges**: Green (approved), Yellow (pending), Red (rejected)
- **Visibility overlay**: Dimmed image with 👁️‍🗨️ icon when hidden
- **Pin indicator**: Gold border glow around pinned posts
- **Bulk select**: Click to select multiple posts for grid creation
- **Confirm dialogs**: For delete actions to prevent accidents
