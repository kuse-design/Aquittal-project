import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import type { PublicStoreProduct } from "@shared/store";

const storyImage = "/moreyou.jpeg";
const campaignImage = "/yourown.jpeg";
const brandLogo = "/logo.jpeg";

function money(value: string, currencyCode: string) {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function ProductCard({ product, index }: { product: PublicStoreProduct; index: number }) {
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const { addItem } = useCart();
  const available = product.stockStatus === "in_stock";

  async function handleAdd() {
    if (!available) return;
    try {
      await addItem(product, size, color);
      toast.success("Added to your bag");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This item could not be added just now.");
    }
  }

  return (
    <article className="product-card group" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="product-image-wrap">
        {product.images[0]?.url ? (
          <img src={product.images[0].url} alt={product.images[0].altText || product.title} className="product-image" loading="lazy" decoding="async" />
        ) : (
          <div className="product-image-empty" aria-label={`Image coming soon for ${product.title}`}><span>IMAGE<br />COMING SOON</span></div>
        )}
        <span className="product-index">0{index + 1}</span>
        {product.promoPrice && <span className="sale-pill">ON PROMO</span>}
        {!available && <span className="stock-pill">SOLD OUT</span>}
        <button type="button" className="quick-add" onClick={handleAdd} disabled={!available} aria-label={`Add ${product.title} to bag`}>
          {available ? "Add to bag" : "Sold out"}<ArrowUpRight size={15} />
        </button>
      </div>
      <div className="product-info">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="product-title">{product.title}</h3>
            {product.category && <p className="product-type">{product.category}</p>}
          </div>
          <div className="product-price-block">
            {product.promoPrice && <span className="product-compare">{money(product.price, product.currencyCode)}</span>}
            <span className="product-price">{money(product.promoPrice ?? product.price, product.currencyCode)}</span>
          </div>
        </div>
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <div className="product-options">
            {product.sizes.length > 0 && (
              <label className="option-field"><span>Size</span><select value={size} onChange={event => setSize(event.target.value)} aria-label={`Choose a size for ${product.title}`}>
                {product.sizes.map(value => <option value={value} key={value}>{value}</option>)}
              </select></label>
            )}
            {product.colors.length > 0 && (
              <label className="option-field"><span>Colour</span><select value={color} onChange={event => setColor(event.target.value)} aria-label={`Choose a colour for ${product.title}`}>
                {product.colors.map(value => <option value={value} key={value}>{value}</option>)}
              </select></label>
            )}
          </div>
        )}
        <button type="button" className="mobile-add" onClick={handleAdd} disabled={!available}>
          {available ? "Add to bag" : "Sold out"}<ArrowUpRight size={15} />
        </button>
      </div>
    </article>
  );
}

function CartDrawer() {
  const { items, isOpen, closeCart, itemCount, subtotal, currencyCode, updateQuantity, removeItem, clearCart } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const submitOrder = trpc.storefront.orders.submit.useMutation({
    onSuccess: result => {
      setOrderNumber(result.orderNumber);
      clearCart();
      setShowOrderForm(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerNote("");
      toast.success("Your order request has been sent");
    },
    onError: error => toast.error(error.message || "We could not send your order. Please try again."),
  });

  if (!isOpen) return null;

  function handleClose() {
    closeCart();
    setShowOrderForm(false);
    setOrderNumber(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitOrder.mutate({
      customerName,
      customerPhone,
      customerEmail,
      customerNote,
      lines: items.map(line => ({ productId: line.productId, quantity: line.quantity, size: line.size || undefined, color: line.color || undefined })),
    });
  }

  return (
    <div className="cart-layer" role="presentation">
      <button className="cart-scrim" onClick={handleClose} aria-label="Close shopping bag" />
      <aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-head">
          <div><p className="eyebrow">YOUR SELECTION</p><h2 id="cart-title" className="cart-title">The bag <span>({itemCount})</span></h2></div>
          <button type="button" className="icon-button" onClick={handleClose} aria-label="Close bag"><X size={20} strokeWidth={1.5} /></button>
        </div>
        {orderNumber ? (
          <div className="order-confirmation">
            <span className="cart-empty-mark"><ShoppingBag size={22} strokeWidth={1.3} /></span>
            <p className="eyebrow">REQUEST RECEIVED</p>
            <h3>Thank you for your order.</h3>
            <p>Your reference is <strong>{orderNumber}</strong>. We’ll contact you to confirm the items, delivery, and final details. No payment has been taken.</p>
            <button type="button" className="text-link" onClick={handleClose}>Continue exploring <ArrowRight size={16} /></button>
          </div>
        ) : !items.length ? (
          <div className="cart-empty">
            <span className="cart-empty-mark"><ShoppingBag size={22} strokeWidth={1.3} /></span>
            <p className="eyebrow">A LITTLE ROOM FOR SOMETHING GOOD</p>
            <h3>Your bag is empty.</h3>
            <p>Explore the collection and add a piece you love.</p>
            <button type="button" className="text-link" onClick={handleClose}>Continue exploring <ArrowRight size={16} /></button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => (
                <article className="cart-item" key={item.lineId}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" /> : <div className="cart-item-placeholder">APPAREL</div>}
                  <div className="cart-item-copy">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3>{item.title}</h3>{(item.size || item.color) && <p>{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</p>}</div>
                      <span className="cart-item-total">{money((Number(item.price) * item.quantity).toFixed(2), item.currencyCode)}</span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button type="button" onClick={() => updateQuantity(item.lineId, item.quantity - 1)} aria-label={`Decrease ${item.title} quantity`}><Minus size={13} /></button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} aria-label={`Increase ${item.title} quantity`}><Plus size={13} /></button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.lineId)}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <div className="cart-subtotal"><span>Order estimate</span><span>{money(subtotal, currencyCode)}</span></div>
              <p>No payment now. We’ll confirm availability, delivery, and the final total with you.</p>
              {!showOrderForm ? (
                <button type="button" className="checkout-button" onClick={() => setShowOrderForm(true)}>Send order request <ArrowUpRight size={16} /></button>
              ) : (
                <form className="order-request-form" onSubmit={handleSubmit}>
                  <label>Name<input autoComplete="name" value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} maxLength={180} /></label>
                  <label>Phone<input autoComplete="tel" type="tel" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} required minLength={6} maxLength={50} /></label>
                  <label>Email <span>(optional)</span><input autoComplete="email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} maxLength={320} /></label>
                  <label>Note <span>(optional)</span><textarea value={customerNote} onChange={event => setCustomerNote(event.target.value)} maxLength={2000} rows={3} placeholder="Delivery area or anything we should know" /></label>
                  <button type="submit" className="checkout-button" disabled={submitOrder.isPending}>{submitOrder.isPending ? "Sending…" : "Confirm order request"}<ArrowUpRight size={16} /></button>
                  <button type="button" className="remove-link" onClick={() => setShowOrderForm(false)} disabled={submitOrder.isPending}>Back to bag</button>
                </form>
              )}
              <span className="secure-note">Your request is saved securely for the store team.</span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: products, isLoading, error } = trpc.storefront.products.list.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const { openCart, itemCount } = useCart();
  const visibleProducts = products?.slice(0, 4) ?? [];

  function closeMenu() { setMenuOpen(false); }

  return (
    <main className="storefront">
      <div className="announcement-bar">
        <span>THE FIRST EDIT</span><span className="announcement-dot" /><span>A NEW POINT OF VIEW, EVERY DAY</span>
        <a href="#collection">Explore the collection <ArrowRight size={13} /></a>
      </div>
      <header className="site-header">
        <a className="brand-wordmark" href="#top" aria-label="Acquittal Luxury Apparel home"><img className="brand-logo-image" src={brandLogo} alt="Acquittal Luxury Apparel" decoding="async" /></a>
        <nav className={`desktop-nav ${menuOpen ? "mobile-nav-open" : ""}`} aria-label="Main navigation">
          <a href="#collection" onClick={closeMenu}>Shop the edit</a><a href="#story" onClick={closeMenu}>Our point of view</a><a href="#details" onClick={closeMenu}>The details</a>
        </nav>
        <div className="header-actions">
          <button type="button" className="bag-button" onClick={openCart} aria-label={`Open shopping bag with ${itemCount} items`}><span className="bag-label">Bag</span><ShoppingBag size={17} strokeWidth={1.5} /><span className="bag-count">{itemCount}</span></button>
          <button type="button" className="menu-toggle" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={21} /> : <span>MENU</span>}</button>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow hero-kicker"><span className="gold-rule" /> CLOTHING, WITH INTENTION</p>
          <h1>Wear your<br />own <em>point of view.</em></h1>
          <p className="hero-description">Pieces to move through the everyday in. Thoughtful shapes, a little attitude, and room to make them your own.</p>
          <div className="hero-actions"><a className="button-dark" href="#collection">Explore the collection <ArrowUpRight size={16} /></a><a className="hero-secondary" href="#story">A note on the brand <ArrowDown size={15} /></a></div>
          <div className="hero-footnote"><span>01</span><span>THE EVERYDAY, RECONSIDERED</span><span>SCROLL TO EXPLORE</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-frame"><img src={campaignImage} alt="Model wearing an Acquittal white graphic hoodie" fetchPriority="high" decoding="async" /><div className="image-credit"><span>ACQUITTAL CAMPAIGN</span><span>LUXURY APPAREL</span></div></div>
          <div className="hero-stamp"><span>STYLE</span><span>IS</span><strong>PERSONAL</strong></div>
          <div className="hero-caption"><span>01 / A STUDY IN EVERYDAY STYLE</span><span>NEW SEASON · 2026</span></div>
        </div>
      </section>

      <div className="marquee" aria-label="Clothing for the everyday"><div className="marquee-track"><span>GOOD CLOTHES, GOOD DAYS</span><i>✳</i><span>MAKE IT YOURS</span><i>✳</i><span>GOOD CLOTHES, GOOD DAYS</span><i>✳</i><span>MAKE IT YOURS</span></div></div>

      <section className="collection-section" id="collection">
        <div className="section-topline"><span>THE COLLECTION</span><span>{products?.length ? `${String(products.length).padStart(2, "0")} PIECES` : "A FIRST EDIT IN THE MAKING"}</span></div>
        <div className="collection-heading"><div><p className="eyebrow">A WARDROBE, NOT A RULEBOOK</p><h2>Find your <em>everyday.</em></h2></div><p className="collection-intro">Easy to wear. Hard to forget. Explore considered pieces built around the way you actually live.</p></div>
        {isLoading ? (
          <div className="catalog-state" aria-live="polite"><span className="catalog-spinner" /><p>Opening the collection…</p></div>
        ) : error ? (
          <div className="catalog-state catalog-state-error" aria-live="polite"><span className="eyebrow">THE COLLECTION</span><h3>We’re having trouble opening the collection.</h3><p>Please try again in a moment, or contact the store team.</p></div>
        ) : visibleProducts.length ? (
          <div className="product-grid">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
        ) : (
          <div className="catalog-empty"><div className="empty-orbit"><span>01</span><span className="empty-orbit-dot" /></div><div className="empty-copy"><p className="eyebrow">THE FIRST DROP</p><h3>Your pieces<br /><em>go here.</em></h3><p>The collection is ready for your products. Add the first pieces, photos, sizes, and prices from the studio page.</p><a className="text-link" href="/admin">Open the studio <ArrowUpRight size={15} /></a></div><span className="empty-note">PRODUCTS &amp; PRICES<br />MANAGED IN YOUR STUDIO</span></div>
        )}
        <div className="collection-foot"><span>GOOD STYLE SHOULD FEEL LIKE YOU.</span><span>ORDER REQUESTS CONFIRMED BY THE STORE TEAM <ArrowUpRight size={13} /></span></div>
      </section>

      <section className="story-section" id="story">
        <div className="story-image"><img src={storyImage} alt="Front and back views of a model wearing the black Acquittal tracksuit with white piping" loading="lazy" decoding="async" /><span>ACQUITTAL · TRACKSUIT FIT / FRONT &amp; BACK</span></div>
        <div className="story-copy"><p className="eyebrow"><span className="gold-rule" /> OUR POINT OF VIEW</p><h2>Less noise.<br />More <em>you.</em></h2><p>We believe what you wear should give you a little more room to be yourself. This is a home for good pieces, thoughtful details, and getting dressed without overthinking it.</p><a className="text-link" href="#details">Get to know the label <ArrowUpRight size={15} /></a><span className="story-annotation">A BRAND STORY<br />TO MAKE YOUR OWN</span></div>
      </section>

      <section className="details-section" id="details">
        <div className="details-heading"><p className="eyebrow">GOOD THINGS, THOUGHT THROUGH</p><h2>The little things<br />make the <em>difference.</em></h2></div>
        <div className="detail-list"><article><span>01</span><div><h3>Find your fit</h3><p>Choose the size and colour that feel most like you.</p></div><ArrowUpRight size={16} /></article><article><span>02</span><div><h3>Take your time</h3><p>Explore the collection and add favourites to your bag.</p></div><ArrowUpRight size={16} /></article><article><span>03</span><div><h3>Send an order request</h3><p>We’ll contact you to confirm availability, delivery, and the final total.</p></div><ArrowUpRight size={16} /></article></div>
      </section>

      <footer className="site-footer">
        <div className="footer-top"><a className="brand-wordmark footer-wordmark" href="#top" aria-label="Acquittal Luxury Apparel home"><img className="brand-logo-image footer-brand-logo" src={brandLogo} alt="Acquittal Luxury Apparel" loading="lazy" decoding="async" /></a><p>Good clothes.<br /><em>Good days.</em></p><a className="back-top" href="#top">BACK TO TOP <ArrowUpRight size={15} /></a></div>
        <div className="footer-bottom"><span>© 2026 ACQUITTAL · LUXURY APPAREL</span><a href="/admin">STUDIO LOGIN</a><span>BUILT FOR EVERYDAY</span></div>
      </footer>
      <CartDrawer />
    </main>
  );
}
