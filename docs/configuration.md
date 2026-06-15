# DaVinciOS Configuration

## Overview

DaVinciOS uses a configuration file (`davinciOS.config.ts`) to customize the CMS behavior for your application.

## Configuration File

Create `davinciOS.config.ts` in your project root:

```typescript
import type { Config } from '@davincios/cms'

export default {
  // Server configuration
  serverURL: process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'http://localhost:3000',
  
  // Admin panel configuration
  admin: {
    path: '/admin',
    // Customize admin theme
    theme: {
      primaryColor: '#3B82F6',
      // ... other theme options
    }
  },
  
  // GraphQL API configuration
  graphQL: {
    // Enable/disable GraphQL playground
    playground: process.env.NODE_ENV === 'development',
    // Custom schema extensions
    schemaExtensions: []
  },
  
  // Collections configuration
  collections: [
    // Your custom collections go here
  ],
  
  // Global configuration
  globals: [
    // Your global configurations go here
  ],
  
  // Authentication configuration
  auth: {
    // Token expiration
    tokenExpiration: 7 * 24 * 60 * 60, // 7 days in seconds
    // Cookie settings
    cookie: {
      name: 'davincios-token',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  },
  
  // File upload configuration
  upload: {
    // Maximum file size (in bytes)
    maxFileSize: 10 * 1024 * 1024, // 10MB
    // Allowed file types
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    // Upload destination
    destination: './uploads'
  }
} satisfies Config
```

## Configuration Options

### Server Configuration

| Option | Type | Description |
|--------|------|-------------|
| `serverURL` | string | Public URL of your DaVinciOS instance |

### Admin Panel Configuration

| Option | Type | Description |
|--------|------|-------------|
| `admin.path` | string | URL path for the admin panel |
| `admin.theme` | object | Theme customization options |

### GraphQL Configuration

| Option | Type | Description |
|--------|------|-------------|
| `graphQL.playground` | boolean | Enable GraphQL playground |
| `graphQL.schemaExtensions` | array | Custom GraphQL schema extensions |

### Collections

Define your content collections in the `collections` array. Each collection follows the DaVinciOS collection format.

### Globals

Define global configurations (like site-wide settings) in the `globals` array.

### Authentication

| Option | Type | Description |
|--------|------|-------------|
| `auth.tokenExpiration` | number | Token expiration time in seconds |
| `auth.cookie` | object | Cookie configuration options |

### File Upload

| Option | Type | Description |
|--------|------|-------------|
| `upload.maxFileSize` | number | Maximum file size in bytes |
| `upload.allowedMimeTypes` | array | Allowed MIME types for upload |
| `upload.destination` | string | Upload destination directory |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAVINCIOS_SECRET` | Yes | Secret key for encryption and signing |
| `DAVINCIOS_PUBLIC_SERVER_URL` | Yes | Public URL of your DaVinciOS instance |
| `NODE_ENV` | No | Node environment (development/production) |

## Example Configuration

See [examples/config.example.ts](./examples/config.example.ts) for a complete example configuration.

## Validation

DaVinciOS validates your configuration at startup. Invalid configurations will prevent the application from starting and display error messages in the console.

## Next Steps

After configuring DaVinciOS, proceed to:
1. [Creating Collections](./creating-collections.md)
2. [Setting Up Authentication](./authentication.md)
3. [Customizing the Admin Panel](./admin-customization.md)