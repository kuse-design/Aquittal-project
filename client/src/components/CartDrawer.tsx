import { useState } from "react";
import { ArrowRight, ArrowUpRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { money } from "@/lib/format";

export function CartDrawer() {
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
      toast.success("Order request sent");
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
      lines: items.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        size: line.size || undefined,
        color: line.color || undefined,
      })),
    });
  }

  return (
    <div className="cart-layer" role="presentation">
      <button className="cart-scrim" onClick={handleClose} aria-label="Close shopping bag" />
      <aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-head">
          <div>
            <p className="eyebrow">YOUR SELECTION</p>
            <h2 id="cart-title" className="cart-title">
              Your bag <span>({itemCount})</span>
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={handleClose} aria-label="Close bag">
            <X size={21} strokeWidth={1.5} />
          </button>
        </div>

        {orderNumber ? (
          <div className="order-confirmation">
            <span className="cart-empty-mark">
              <ShoppingBag size={24} strokeWidth={1.3} />
            </span>
            <p className="eyebrow">REQUEST SENT</p>
            <h3>We have your order.</h3>
            <p>
              Your reference is <strong>{orderNumber}</strong>. We will call to confirm stock, delivery, and the final
              total. Nothing has been charged yet.
            </p>
            <button type="button" className="text-link" onClick={handleClose}>
              Keep shopping <ArrowRight size={17} />
            </button>
          </div>
        ) : !items.length ? (
          <div className="cart-empty">
            <span className="cart-empty-mark">
              <ShoppingBag size={24} strokeWidth={1.3} />
            </span>
            <p className="eyebrow">NOTHING IN HERE YET</p>
            <h3>Your bag is empty.</h3>
            <p>Pick a size, add a piece, and we will take it from there.</p>
            <button type="button" className="text-link" onClick={handleClose}>
              Browse the collection <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => (
                <article className="cart-item" key={item.lineId}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" />
                  ) : (
                    <div className="cart-item-placeholder">APPAREL</div>
                  )}
                  <div className="cart-item-copy">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3>{item.title}</h3>
                        {(item.size || item.color) && (
                          <p>{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                      <span className="cart-item-total">
                        {money((Number(item.price) * item.quantity).toFixed(2), item.currencyCode)}
                      </span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          aria-label={`Decrease ${item.title} quantity`}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                          aria-label={`Increase ${item.title} quantity`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.lineId)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-subtotal">
                <span>Estimated total</span>
                <span>{money(subtotal, currencyCode)}</span>
              </div>
              <p>No payment yet. We will call to confirm stock, delivery, and the final total with you.</p>
              {!showOrderForm ? (
                <button type="button" className="checkout-button" onClick={() => setShowOrderForm(true)}>
                  Send order request <ArrowUpRight size={17} />
                </button>
              ) : (
                <form className="order-request-form" onSubmit={handleSubmit}>
                  <label>
                    Name
                    <input
                      autoComplete="name"
                      value={customerName}
                      onChange={event => setCustomerName(event.target.value)}
                      required
                      minLength={2}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      autoComplete="tel"
                      type="tel"
                      value={customerPhone}
                      onChange={event => setCustomerPhone(event.target.value)}
                      required
                      minLength={6}
                      maxLength={50}
                    />
                  </label>
                  <label>
                    Email <span>(optional)</span>
                    <input
                      autoComplete="email"
                      type="email"
                      value={customerEmail}
                      onChange={event => setCustomerEmail(event.target.value)}
                      maxLength={320}
                    />
                  </label>
                  <label>
                    Note <span>(optional)</span>
                    <textarea
                      value={customerNote}
                      onChange={event => setCustomerNote(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="Delivery area, or anything we should know"
                    />
                  </label>
                  <button type="submit" className="checkout-button" disabled={submitOrder.isPending}>
                    {submitOrder.isPending ? "Sending…" : "Confirm request"}
                    <ArrowUpRight size={17} />
                  </button>
                  <button
                    type="button"
                    className="remove-link"
                    onClick={() => setShowOrderForm(false)}
                    disabled={submitOrder.isPending}
                  >
                    Back to bag
                  </button>
                </form>
              )}
              <span className="secure-note">Saved for the store team. We usually reply within a day.</span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
