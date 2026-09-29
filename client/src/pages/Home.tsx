import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { ImageSlideshow } from "@/components/ImageSlideshow";
import { StoreFooter, StoreHeader } from "@/components/StoreChrome";

const heroSlides = [
  { src: "/yourown.jpeg", alt: "Model wearing an Acquittal white graphic hoodie" },
  { src: "/homepage1.jpeg", alt: "Acquittal campaign photograph" },
];

const storySlides = [
  { src: "/moreyou.jpeg", alt: "Front and back views of a model wearing the black Acquittal tracksuit with white piping" },
  { src: "/homepage2.jpeg", alt: "Acquittal studio photograph" },
];

/** How many pieces the home page previews before sending people to /shop. */
const PREVIEW_COUNT = 3;

export default function Home() {
  const { data: products, isLoading, error } = trpc.storefront.products.list.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const visibleProducts = products?.slice(0, PREVIEW_COUNT) ?? [];
  const total = products?.length ?? 0;
  const hasMore = total > PREVIEW_COUNT;

  return (
    <main className="storefront">
      <StoreHeader />

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow hero-kicker">
            <span className="gold-rule" /> NEW SEASON · 2026
          </p>
          <h1>
            Clothes for
            <br />
            the <em>long run.</em>
          </h1>
          <p className="hero-description">
            Weighty cotton, clean cuts, and nothing that needs thinking about first. Made to be worn every week, not
            saved for a special occasion.
          </p>
          <div className="hero-actions">
            <a className="button-dark" href="#collection">
              Shop the collection <ArrowUpRight size={17} />
            </a>
            <a className="hero-secondary" href="#story">
              Read our story <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-footnote">
            <span>01</span>
            <span>THE EVERYDAY, RECONSIDERED</span>
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>
        <div className="hero-visual">
          <ImageSlideshow
            slides={heroSlides}
            className="hero-frame"
            label="Acquittal new season campaign"
            eager
          >
            <div className="image-credit">
              <span>ACQUITTAL CAMPAIGN</span>
              <span>LUXURY APPAREL</span>
            </div>
          </ImageSlideshow>
          <div className="hero-stamp">
            <span>STYLE</span>
            <span>IS</span>
            <strong>PERSONAL</strong>
          </div>
          <div className="hero-caption">
            <span>01 / A STUDY IN EVERYDAY STYLE</span>
            <span>NEW SEASON · 2026</span>
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="Acquittal clothing for the everyday">
        <div className="marquee-track">
          <span>WEIGHTY COTTON</span>
          <i>✳</i>
          <span>CLEAN CUTS</span>
          <i>✳</i>
          <span>MADE TO BE WORN</span>
          <i>✳</i>
          <span>WEIGHTY COTTON</span>
          <i>✳</i>
          <span>CLEAN CUTS</span>
          <i>✳</i>
          <span>MADE TO BE WORN</span>
        </div>
      </div>

      <section className="collection-section" id="collection">
        <div className="section-topline">
          <span>THE COLLECTION</span>
          <span>{total ? `${String(total).padStart(2, "0")} PIECES` : "A FIRST EDIT IN THE MAKING"}</span>
        </div>
        <div className="collection-heading">
          <div>
            <p className="eyebrow">THE EDIT</p>
            <h2>
              Find your <em>everyday.</em>
            </h2>
          </div>
          <p className="collection-intro">
            Everything here is in stock and ready to ship. Pick your size, add it to your bag, and we will confirm
            delivery with you.
          </p>
        </div>

        {isLoading ? (
          <div className="catalog-state" aria-live="polite">
            <span className="catalog-spinner" />
            <p>Opening the collection…</p>
          </div>
        ) : error ? (
          <div className="catalog-state catalog-state-error" aria-live="polite">
            <span className="eyebrow">THE COLLECTION</span>
            <h3>We are having trouble opening the collection.</h3>
            <p>Please try again in a moment, or contact the store team.</p>
          </div>
        ) : visibleProducts.length ? (
          <>
            <div className="product-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            {hasMore && (
              <div className="collection-cta">
                <p>
                  Showing {PREVIEW_COUNT} of {total} pieces. The rest are one click away.
                </p>
                <a className="button-light" href="/shop">
                  View all {total} pieces <ArrowRight size={17} />
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="catalog-empty">
            <div className="empty-orbit">
              <span>01</span>
              <span className="empty-orbit-dot" />
            </div>
            <div className="empty-copy">
              <p className="eyebrow">THE FIRST DROP</p>
              <h3>
                Your pieces
                <br />
                <em>go here.</em>
              </h3>
              <p>The collection is ready for your products. Add the first pieces, photos, sizes, and prices from the studio page.</p>
              <a className="text-link" href="/admin">
                Open the studio <ArrowUpRight size={16} />
              </a>
            </div>
            <span className="empty-note">
              PRODUCTS &amp; PRICES
              <br />
              MANAGED IN YOUR STUDIO
            </span>
          </div>
        )}

        <div className="collection-foot">
          <span>SIZES RUN TRUE TO FIT</span>
          <span>
            ORDER REQUESTS CONFIRMED BY THE STORE TEAM
            <ArrowUpRight size={14} />
          </span>
        </div>
      </section>

      <section className="story-section" id="story">
        <div className="story-image">
          <ImageSlideshow slides={storySlides} className="story-slides" tone="dark" label="Acquittal studio look">
            <span>ACQUITTAL · TRACKSUIT FIT / FRONT &amp; BACK</span>
          </ImageSlideshow>
        </div>
        <div className="story-copy">
          <p className="eyebrow">
            <span className="gold-rule" /> THE LABEL
          </p>
          <h2>
            Less noise.
            <br />
            More <em>you.</em>
          </h2>
          <p>
            We started Acquittal because getting dressed should not take longer than a minute. Small runs, weighty
            fabrics, and fits we actually wear ourselves.
          </p>
          <a className="text-link" href="#details">
            How ordering works <ArrowUpRight size={16} />
          </a>
          <span className="story-annotation">
            A BRAND STORY
            <br />
            TO MAKE YOUR OWN
          </span>
        </div>
      </section>

      <section className="details-section" id="details">
        <div className="details-heading">
          <p className="eyebrow">BEFORE YOU ORDER</p>
          <h2>
            How ordering
            <br />
            <em>works.</em>
          </h2>
        </div>
        <div className="detail-list">
          <article>
            <span>01</span>
            <div>
              <h3>Pick your size</h3>
              <p>Every piece lists its available sizes and colours. They run true to fit.</p>
            </div>
            <ArrowUpRight size={17} />
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Add to your bag</h3>
              <p>Add as many pieces as you like. There is no minimum order.</p>
            </div>
            <ArrowUpRight size={17} />
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>We call you</h3>
              <p>We phone to confirm stock, delivery, and the final total before anything is paid.</p>
            </div>
            <ArrowUpRight size={17} />
          </article>
        </div>
      </section>

      <StoreFooter />
      <CartDrawer />
    </main>
  );
}
