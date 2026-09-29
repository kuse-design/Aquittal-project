import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { money } from "@/lib/format";
import type { PublicStoreProduct } from "@shared/store";

export function ProductCard({ product, index }: { product: PublicStoreProduct; index: number }) {
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
          <img
            src={product.images[0].url}
            alt={product.images[0].altText || product.title}
            className="product-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="product-image-empty" aria-label={`Image coming soon for ${product.title}`}>
            <span>
              IMAGE
              <br />
              COMING SOON
            </span>
          </div>
        )}
        <span className="product-index">{String(index + 1).padStart(2, "0")}</span>
        {product.promoPrice && <span className="sale-pill">ON PROMO</span>}
        {!available && <span className="stock-pill">SOLD OUT</span>}
        <button
          type="button"
          className="quick-add"
          onClick={handleAdd}
          disabled={!available}
          aria-label={`Add ${product.title} to bag`}
        >
          {available ? "Add to bag" : "Sold out"}
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="product-info">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="product-title">{product.title}</h3>
            {product.category && <p className="product-type">{product.category}</p>}
          </div>
          <div className="product-price-block">
            {product.promoPrice && (
              <span className="product-compare">{money(product.price, product.currencyCode)}</span>
            )}
            <span className="product-price">{money(product.promoPrice ?? product.price, product.currencyCode)}</span>
          </div>
        </div>
        {product.description && <p className="product-blurb">{product.description}</p>}
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <div className="product-options">
            {product.sizes.length > 0 && (
              <label className="option-field">
                <span>Size</span>
                <select
                  value={size}
                  onChange={event => setSize(event.target.value)}
                  aria-label={`Choose a size for ${product.title}`}
                >
                  {product.sizes.map(value => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {product.colors.length > 0 && (
              <label className="option-field">
                <span>Colour</span>
                <select
                  value={color}
                  onChange={event => setColor(event.target.value)}
                  aria-label={`Choose a colour for ${product.title}`}
                >
                  {product.colors.map(value => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <button type="button" className="mobile-add" onClick={handleAdd} disabled={!available}>
          {available ? "Add to bag" : "Sold out"}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}
