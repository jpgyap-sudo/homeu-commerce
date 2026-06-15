# DaVinciOS - Headless CMS and Application Framework

A powerful, self-hosted Headless CMS and Application Framework built on Next.js, designed for developers and content creators who need complete control over their digital experience.

## Features

- **Headless CMS**: Manage content with a powerful GraphQL API
- **Admin Panel**: Intuitive, customizable admin interface
- **Next.js Integration**: Seamless integration with Next.js applications
- **Self-Hosted**: Full control over your data and infrastructure
- **TypeScript**: Built with TypeScript for type safety
- **Authentication**: Built-in user authentication and authorization
- **Media Management**: Upload and manage media files
- **Custom Fields**: Define custom content structures
- **Version Control**: Content versioning and rollbacks
- **Multi-Tenant**: Support for multiple organizations

## Quick Start

### Installation

```bash
npm install @davincios/cms
```

### Configuration

Create a `davinciOS.config.ts` file in your project root:

```typescript
import type { Config } from '@davincios/cms'

export default {
  // Your configuration
} satisfies Config
```

### Environment Variables

Required environment variables:

```env
DAVINCIOS_SECRET=your-secret-key
DAVINCIOS_PUBLIC_SERVER_URL=https://your-domain.com
```

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [API Reference](./docs/api.md)
- [Deployment](./docs/deployment.md)
- [Contributing](./CONTRIBUTING.md)

## Development

### Prerequisites

- Node.js >= 18.20.2 or >= 20.9.0
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/davincios/davincios.git

# Install dependencies
pnpm install

# Build the package
pnpm build

# Run development server
pnpm dev
```

### Available Scripts

- `pnpm build` - Build the package
- `pnpm dev` - Start development server
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
- `pnpm clean` - Clean build artifacts

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## License

MIT License - see [LICENSE.md](./LICENSE.md) for details.

## Support

- Documentation: [docs.davincios.com](https://docs.davincios.com)
- Issues: [GitHub Issues](https://github.com/davincios/davincios/issues)
- Email: dev@davincios.com