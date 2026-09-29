# Clothing storefront — project tracker

## Implemented and verified
- [x] Responsive React storefront with catalog, cart, manual order requests, owner product studio, and order inbox.
- [x] Acquittal logo, hoodie hero photo, and the latest front/back tracksuit photo in “Less noise. More you.”
- [x] Tracksuit image re-encoded to a 38 KB WebP and fitted without cropping on desktop and mobile.
- [x] Current logo, hero, and story image files total 88,426 bytes; hero preload/priority and below-the-fold lazy loading are enabled.
- [x] Admin product uploads resize to a maximum 1,600 px edge and use WebP when it reduces the file size.
- [x] TypeScript check, all 13 tests, production build, and desktop/mobile screenshots pass.
- [x] Active storefront no longer requires Shopify.
- [x] Migrated from MySQL to PostgreSQL (Drizzle pg-core, `serial` PKs, `pgEnum`, `onConflictDoUpdate`).
- [x] Migrated from Vercel to Render (`render.yaml` blueprint: web service + managed Postgres, health check on `/api/health`).
- [x] Replaced S3 storage with Cloudinary.
- [x] Replaced native `bcrypt` with pure-JS `bcryptjs` to remove the native build step.
- [x] Production server bundle no longer imports Vite, so it runs on runtime dependencies only.
- [x] Fixed `auth.me` returning `passwordHash` to the browser.

## Remaining owner-supplied launch details
- [ ] Add garment names, product photos, descriptions, sizes/colours, prices/currency, stock status, and promo prices.
- [ ] Confirm delivery areas/charges and how the store team should contact customers.
- [ ] Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in the Render dashboard.
- [ ] Register an account, then run `pnpm db:make-admin you@example.com` to unlock `/admin`.
- [ ] Decide the Postgres plan: Render's free DB is deleted after 30 days, so switch to `starter` for real persistence.

## Operational notes
- Product and order management require the configured owner account.
- Order requests are saved to the private inbox; the site does not take online payment or send email/SMS notifications. The store team confirms delivery, payment, and final charges manually.
- Product image uploads accept JPEG, PNG, or WebP up to 5 MB each. Removing a photo detaches it from its product; Cloudinary objects are not deleted from the account.
- Product prices default to USD in the form; the owner can select a currency per product.
- `pnpm db:migrate` runs on every Render start and is idempotent, so it is safe to re-run.
