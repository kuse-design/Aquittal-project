import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { StoreFooter, StoreHeader } from "@/components/StoreChrome";

export default function Shop() {
  const { data: products, isLoading, error } = trpc.storefront.products.list.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const all = products ?? [];

  return (
    <main className="storefront">
      <StoreHeader />

      <section className="shop-hero">
        <div className="shop-hero-topline">
          <span>THE FULL COLLECTION</span>
          <span>{all.length ? `${String(all.length).padStart(2, "0")} PIECES IN STOCK` : "LOADING"}</span>
        </div>
        <div className="shop-hero-heading">
          <div>
            <p className="eyebrow">EVERY PIECE, IN ONE PLACE</p>
            <h1>
              Shop <em>everything.</em>
            </h1>
          </div>
          <div className="shop-hero-aside">
            <p>
              Every piece Acquittal makes, with the price and what is left in stock. Pick a size, add it to your bag,
              and we will call to confirm the rest.
            </p>
            <a className="text-link" href="/#story">
              Read how we make it <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="shop-catalog">
        {isLoading ? (
          <div className="catalog-state" aria-live="polite">
            <span className="catalog-spinner" />
            <p>Loading the collection…</p>
          </div>
        ) : error ? (
          <div className="catalog-state catalog-state-error" aria-live="polite">
            <span className="eyebrow">THE COLLECTION</span>
            <h3>We could not load the collection.</h3>
            <p>Please try again in a moment, or contact the store team.</p>
          </div>
        ) : all.length ? (
          <>
            <div className="product-grid shop-product-grid">
              {all.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            <div className="collection-foot">
              <span>SIZES RUN TRUE TO FIT</span>
              <span>
                ORDER REQUESTS CONFIRMED BY THE STORE TEAM
                <ArrowRight size={14} />
              </span>
            </div>
          </>
        ) : (
          <div className="catalog-empty">
            <div className="empty-orbit">
              <span>01</span>
              <span className="empty-orbit-dot" />
            </div>
            <div className="empty-copy">
              <p className="eyebrow">NOTHING HERE YET</p>
              <h3>
                The shop is
                <br />
                <em>still empty.</em>
              </h3>
              <p>No pieces have been added yet. Once the store team publishes something, it shows up here.</p>
              <a className="text-link" href="/">
                Back to the home page <ArrowRight size={16} />
              </a>
            </div>
            <span className="empty-note">
              PRODUCTS &amp; PRICES
              <br />
              MANAGED IN THE STUDIO
            </span>
          </div>
        )}
      </section>

      <StoreFooter />
      <CartDrawer />
    </main>
  );
}
