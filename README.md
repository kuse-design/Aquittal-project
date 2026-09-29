# Acquittal — Luxury Apparel Storefront

A modern, fashion-editorial clothing storefront built with React 19, Express, tRPC, Drizzle ORM, and Tailwind CSS v4.

## Features

- **Storefront**: Hero campaign, product grid, brand story, detail sections, dark footer
- **Shopping Cart**: Persistent drawer with quantity controls, variant selection, order request flow
- **Admin Studio**: Product CRUD, image upload/optimization, order management, status workflow
- **Authentication**: JWT cookies, email/password, role-based access (user/admin)
- **Type-safe API**: End-to-end tRPC with Zod validation
- **Database**: PostgreSQL with Drizzle ORM (relations, migrations)
- **Image Storage**: Cloudinary with client-side optimization
- **Deployment**: Render blueprint (web service + managed Postgres)
- **Design System**: Custom CSS variables, Satoshi + Instrument Serif typography, responsive breakpoints

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5 |
| Backend | Express, tRPC v11, Drizzle ORM, PostgreSQL (pg) |
| Auth | jose (JWT), bcryptjs, cookies |
| Storage | Cloudinary |
| UI | Radix UI primitives, lucide-react, sonner toasts |
| Testing | Vitest |

## Project Structure

```
clothing-storefront/
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
│   ├── _core/             # Core utilities (auth, trpc, env, app, dev, static)
│   ├── routers/           # tRPC routers (auth, storefront, admin, system)
│   ├── scripts/           # Operational scripts (makeAdmin)
│   ├── store.db.ts        # Database operations
│   ├── storage.ts         # Cloudinary storage operations
│   └── db.ts              # Database connection
├── shared/                # Shared types/constants
│   ├── _core/errors.ts
│   ├── const.ts
│   ├── store.ts           # Shared store types
│   └── types.ts
├── render.yaml            # Render blueprint (web service + Postgres)
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json
```

### Server entry points

| File | Used by | Contains Vite? |
|------|---------|----------------|
| `server/_core/index.ts` | `pnpm dev` | Yes (HMR middleware) |
| `server/_core/main.ts` | `pnpm build` → `dist-server/main.js` | No |

The production bundle deliberately never imports `vite`, so it only needs
runtime dependencies. Both share `createApp()` from `server/_core/app.ts`.

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 14+ database (local or managed)
- A Cloudinary account (free tier is enough to start)

### Environment Variables

Copy `.env.example` to `.env` and fill it in:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth (>= 32 chars)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Cloudinary (product images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
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
| `pnpm build` | Build client + bundle server to `dist-server/` |
| `pnpm start` | Run production server (requires build first) |
| `pnpm check` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run Vitest tests |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Generate and apply migrations |
| `pnpm db:make-admin <email>` | Promote a registered user to admin |

## Deployment (Render)

`render.yaml` defines a web service plus a managed Postgres instance.

1. Push the repo to GitHub.
2. In Render: **New + → Blueprint**, select the repository.
3. Render creates the Postgres DB and injects `DATABASE_URL`, and generates
   `JWT_SECRET` automatically.
4. Set the three `CLOUDINARY_*` values in the service's **Environment** tab.
5. Deploy. Migrations run automatically as part of the start command.

Blueprint specifics:

- **Build**: `pnpm install --frozen-lockfile && pnpm run build`
- **Start**: `pnpm run db:migrate && NODE_ENV=production pnpm run start`
- **Health check**: `/api/health`

> **Free plan caveat**: Render's free Postgres instances are **deleted after 30
> days**. For data that must persist, set `databases[0].plan` to `starter` in
> `render.yaml` (or upgrade in the dashboard). The free web service also spins
> down when idle, so the first request after a quiet period is slow.

### Manual deployment steps

<details>
<summary>If you'd rather not use the blueprint</summary>

1. **New → Postgres**. Note the *Internal Database URL* and set a plan that
   persists (free DBs are deleted after 30 days).
2. **New → Web Service**, point it at the repo:
   - Build command: `pnpm install --frozen-lockfile && pnpm run build`
   - Start command: `pnpm run db:migrate && NODE_ENV=production pnpm run start`
   - Health check path: `/api/health`
3. Environment variables: `DATABASE_URL` (from Postgres), `JWT_SECRET`,
   `NODE_VERSION=24`, and the `CLOUDINARY_*` trio.
4. Promote your first admin account from the service's **Shell** tab:
   ```bash
   pnpm db:make-admin you@example.com
   ```

</details>

### Docker

```dockerfile
# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Runtime stage
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist-server/main.js"]
```

### Traditional VPS

```bash
# On server
pnpm install --frozen-lockfile
pnpm run build
pnpm start  # Runs dist-server/main.js
```

Use PM2 or systemd for process management.

## Database

### Schema Overview

- **users**: Authentication, roles (user/admin)
- **products**: Catalog with sizes, colors, pricing, publishing status
- **productImages**: Product photos with Cloudinary keys
- **orders**: Customer order requests (no payment processing)
- **orderItems**: Line items with variants

### Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Or do both at once
pnpm db:push
```

## Admin Access

1. Register an account at `/register`
2. Promote it to admin:
   ```bash
   # Locally
   pnpm db:make-admin you@example.com

   # Or on Render, from the service's Shell tab
   pnpm db:make-admin you@example.com
   ```
   Or with SQL directly:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
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