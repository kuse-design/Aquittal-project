# Clothing storefront — project tracker

## Implemented and verified
- [x] Responsive React storefront with catalog, cart, manual order requests, owner product studio, and order inbox.
- [x] Acquittal logo, hoodie hero photo, and the latest front/back tracksuit photo in “Less noise. More you.”
- [x] Tracksuit image re-encoded to a 38 KB WebP and fitted without cropping on desktop and mobile.
- [x] Current logo, hero, and story image files total 88,426 bytes; hero preload/priority and below-the-fold lazy loading are enabled.
- [x] Admin product uploads resize to a maximum 1,600 px edge and use WebP when it reduces the file size.
- [x] TypeScript check, all 13 tests, production build, and desktop/mobile screenshots pass.
- [x] Active storefront no longer requires Shopify.

## Remaining owner-supplied launch details
- [ ] Add garment names, product photos, descriptions, sizes/colours, prices/currency, stock status, and promo prices.
- [ ] Confirm delivery areas/charges and how the store team should contact customers.

## Operational notes
- Product and order management require the configured owner account.
- Order requests are saved to the private inbox; the site does not take online payment or send email/SMS notifications. The store team confirms delivery, payment, and final charges manually.
- Product image uploads accept JPEG, PNG, or WebP up to 5 MB each. Removing a photo detaches it from its product; managed storage does not expose object deletion.
- Product prices default to USD in the form; the owner can select a currency per product.
