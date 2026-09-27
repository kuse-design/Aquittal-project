# Acquittal — Luxury Apparel Storefront

A modern, fashion-editorial clothing storefront built with React 19, Express, tRPC, Drizzle ORM, and Tailwind CSS v4.

## Features

- **Storefront**: Hero campaign, product grid, brand story, detail sections, dark footer
- **Shopping Cart**: Persistent drawer with quantity controls, variant selection, order request flow
- **Admin Studio**: Product CRUD, image upload/optimization, order management, status workflow
- **Authentication**: JWT cookies, email/password, role-based access (user/admin)
- **Type-safe API**: End-to-end tRPC with Zod validation
- **Database**: MySQL with Drizzle ORM (relations, migrations)
- **Image Storage**: S3-compatible (R2, MinIO, AWS S3) with client-side optimization
- **Design System**: Custom CSS variables, Satoshi + Instrument Serif typography, responsive breakpoints

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5 |
| Backend | Express, tRPC v11, Drizzle ORM, MySQL (mysql2) |
| Auth | jose (JWT), bcrypt, cookies |
| Storage | @aws-sdk/client-s3 (S3-compatible) |
| UI | Radix UI primitives, lucide-react, sonner toasts |
| Testing | Vitest |

## Project Structure

```
clothing-storefront/
├── api/                    # Vercel serverless entry point
├── client/                 # React frontend
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── contexts/      # React contexts (Cart, Theme)
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities (trpc client, image optimization)
│       ├── pages/         # Route pages
│       ├── App.tsx        # App shell + routing
│       ├── main.tsx       # Entry point
│       └── index.css      # Design system + component styles
├── drizzle/               # Database schema, migrations, relations
├── server/                # Express + tRPC backend
│   ├── _core/             # Core utilities (auth, trpc, env, vite, context)
│   ├── routers/           # tRPC routers (auth, storefront, admin, system)
│   ├── store.db.ts        # Database operations
│   ├── storage.ts         # S3 storage operations
│   └── db.ts              # Database connection
├── shared/                # Shared types/constants
│   ├── _core/errors.ts
│   ├── const.ts
│   ├── store.ts           # Shared store types
│   └── types.ts
├── vercel.json            # Vercel deployment config
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL database (local or managed)
- S3-compatible storage (Cloudflare R2, AWS S3, MinIO, etc.)

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://user:password@host:3306/database

# Auth
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# S3 Storage (R2, S3, MinIO, etc.)
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_PUBLIC_URL=https://pub-your-bucket.r2.dev  # Optional: public CDN URL

# Optional: OpenAI-compatible API for LLM features
OPENAI_API_URL=https://api.openai.com
OPENAI_API_KEY=your-openai-key
```

### Installation

```bash
# Install dependencies
pnpm install

# Generate and run database migrations
pnpm db:push

# Start development server (frontend + backend)
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Vite HMR |
| `pnpm build` | Build client + bundle server for production |
| `pnpm start` | Run production server (requires build first) |
| `pnpm check` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run Vitest tests |
| `pnpm db:push` | Generate and apply Drizzle migrations |

## Deployment

### Vercel (Recommended)

1. Push to GitHub/GitLab/Bitbucket
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The `vercel.json` configures:
- Build command: `pnpm run build`
- Output directory: `dist/public`
- Serverless function: `api/index.ts` (Node.js 20.x, 30s timeout)
- SPA rewrites for client-side routing

### Docker

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist-server/index.js"]
```

### Traditional VPS

```bash
# On server
pnpm install --frozen-lockfile
pnpm run build
pnpm start  # Runs server/_core/standalone.ts
```

Use PM2 or systemd for process management.

## Database

### Schema Overview

- **users**: Authentication, roles (user/admin)
- **products**: Catalog with sizes, colors, pricing, publishing status
- **productImages**: Product photos with S3 keys
- **orders**: Customer order requests (no payment processing)
- **orderItems**: Line items with variants

### Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Or do both at once
pnpm db:push
```

## Admin Access

1. Create a user via `/register`
2. Update their role in the database:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. Access `/admin` for product management, `/admin/orders` for order management

## Design System

The design uses CSS custom properties defined in `client/src/index.css`:

- **Colors**: Cream (`#f7f5ef`), Ink (`#080808`), Gold (`#c9a227`), Gold Deep (`#8a6d1b`)
- **Typography**: Satoshi (UI), Instrument Serif (editorial)
- **Spacing**: Fluid responsive padding via `.container` utility
- **Dark Mode**: Full support via `.dark` class

## Image Optimization

Product images are optimized client-side before upload:
- Max dimension: 1600px
- Format: WebP
- Quality: 82%
- Source limit: 5MB

## Order Flow

**Important**: This storefront uses **order requests**, not payment processing.
1. Customer adds items to bag
2. Submits order request with contact details
3. Store team receives request, confirms availability/delivery
4. Payment handled separately (bank transfer, cash on delivery, etc.)

## Testing

```bash
# Run all tests
pnpm test

# Run with UI
pnpm vitest --ui
```

## License

MIT